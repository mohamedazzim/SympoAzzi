import type { Express, Request, Response } from "express"
import { createServer, type Server } from "http"
import { storage } from "./storage"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { nanoid } from "nanoid"
import PDFDocument from "pdfkit"
import ExcelJS from "exceljs"
import QRCode from "qrcode"
import {
  requireAuth,
  requireSuperAdmin,
  requireEventAdmin,
  requireParticipant,
  requireEventAccess,
  requireRoundAccess,
  requireRegistrationCommittee,
  requireEventAdminOrSuperAdmin,
  type AuthRequest,
} from "./middleware/auth"
import { emailService } from "./services/emailService"
import { WebSocketService } from "./services/websocketService"

const JWT_SECRET = process.env.JWT_SECRET || "symposium-secret-key-change-in-production"

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production environment")
}

function generateFormSlug(eventName: string): string {
  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `${slug}-${nanoid(8)}`
}

function generateSecurePassword(): string {
  return crypto.randomBytes(12).toString("base64").slice(0, 16)
}

function generateHumanReadableCredentials(
  fullName: string,
  eventName: string,
  counter: number,
): { username: string; password: string } {
  const firstName = fullName.split(" ")[0]
  const cleanEventName = eventName.toLowerCase().replace(/[^a-z0-9]/g, "")
  
  const eventPrefix = cleanEventName.substring(0, 3)
  const namePrefix = firstName.toLowerCase().substring(0, 4)
  const passwordPrefix = firstName.substring(0, 3)
  const capitalizedPasswordPrefix = passwordPrefix.charAt(0).toUpperCase() + passwordPrefix.slice(1).toLowerCase()

  return {
    username: `${eventPrefix}${namePrefix}`,
    password: `${capitalizedPasswordPrefix}@${counter}`,
  }
}

function timesOverlap(start1: Date | null, end1: Date | null, start2: Date | null, end2: Date | null): boolean {
  if (!start1 || !end1 || !start2 || !end2) return false
  return start1 < end2 && start2 < end1
}

async function validateEventSelection(eventIds: string[]): Promise<{ valid: boolean; error?: string }> {
  if (eventIds.length === 0) {
    return { valid: false, error: "At least one event must be selected" }
  }

  const events = await storage.getEventsByIds(eventIds)

  if (events.length !== eventIds.length) {
    return { valid: false, error: "One or more selected events not found" }
  }

  const technical = events.filter((e) => e.category === "technical")
  const nonTechnical = events.filter((e) => e.category === "non_technical")

  if (technical.length > 1) {
    return { valid: false, error: "Only one technical event can be selected" }
  }
  if (nonTechnical.length > 1) {
    return { valid: false, error: "Only one non-technical event can be selected" }
  }

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i]
      const e2 = events[j]

      const e1Rounds = await storage.getRoundsByEvent(e1.id)
      const e2Rounds = await storage.getRoundsByEvent(e2.id)

      for (const r1 of e1Rounds) {
        for (const r2 of e2Rounds) {
          if (timesOverlap(r1.startTime, r1.endTime, r2.startTime, r2.endTime)) {
            return { valid: false, error: `Events "${e1.name}" and "${e2.name}" have overlapping times` }
          }
        }
      }
    }
  }

  return { valid: true }
}

async function logSuperAdminAction(
  adminId: string,
  adminUsername: string,
  action: string,
  targetType: string,
  targetId: string,
  targetName: string | null,
  changes: any | null,
  reason: string | null,
  ipAddress: string | null,
) {
  await storage.createAuditLog({
    adminId,
    adminUsername,
    action,
    targetType,
    targetId,
    targetName,
    changes,
    reason,
    ipAddress,
  })
}

const getClientIp = (req: Request) => {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.headers["x-real-ip"]?.toString() ||
    req.connection.remoteAddress ||
    null
  )
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/users", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const users = await storage.getUsers()
      const usersWithoutPasswords = users.map(({ password, ...user }) => user)
      res.json(usersWithoutPasswords)
    } catch (error) {
      console.error("Get users error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.patch("/api/users/:id/credentials", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { username, email, password } = req.body

      if (!username && !email && !password) {
        return res.status(400).json({ message: "At least one field (username, email, or password) must be provided" })
      }

      const updates: any = {}
      if (username !== undefined) updates.username = username
      if (email !== undefined) updates.email = email
      if (password !== undefined) {
        const hashedPassword = await bcrypt.hash(password, 10)
        updates.password = hashedPassword
      }

      const user = await storage.updateUserCredentials(req.params.id, updates)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      const { password: _, ...userWithoutPassword } = user
      res.json({
        message: "User credentials updated successfully",
        user: userWithoutPassword,
      })
    } catch (error: any) {
      console.error("Update user credentials error:", error)
      if (error.message === "Username already exists" || error.message === "Email already exists") {
        return res.status(400).json({ message: error.message })
      }
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.delete("/api/users/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteUser(req.params.id)
      res.json({ message: "User deleted successfully" })
    } catch (error) {
      console.error("Delete user error:", error)
      res.status(500).json({ message: "Failed to delete user" })
    }
  })

  app.get("/api/admin/orphaned-admins", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const orphanedAdmins = await storage.getOrphanedEventAdmins()
      const adminsWithoutPasswords = orphanedAdmins.map(({ password, ...admin }) => admin)
      res.json(adminsWithoutPasswords)
    } catch (error) {
      console.error("Get orphaned admins error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/admin/system-settings", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const resendConfigured = !!process.env.RESEND_API_KEY
      res.json({
        email: {
          provider: 'resend',
          configured: resendConfigured,
          apiKey: resendConfigured ? process.env.RESEND_API_KEY?.substring(0, 10) + '...' : null,
          from: resendConfigured ? process.env.RESEND_FROM_EMAIL || null : null,
        }
      })
    } catch (error) {
      console.error("Get system settings error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email, fullName, role } = req.body

      if (!username || !password || !email || !fullName || !role) {
        return res.status(400).json({ message: "All fields are required" })
      }

      const validRoles = ["super_admin", "event_admin", "participant", "registration_committee"]
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" })
      }

      const existingUser = await storage.getUserByUsername(username)
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" })
      }

      const existingEmail = await storage.getUserByEmail(email)
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" })
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        fullName,
        role,
      } as any)

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" })

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        token,
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" })
      }

      // First, try event credential login (for participants)
      const eventCredential = await storage.getEventCredentialByUsername(username)
      if (eventCredential) {
        if (eventCredential.eventPassword !== password) {
          return res.status(401).json({ message: "Invalid credentials" })
        }

        const user = await storage.getUserById(eventCredential.participantUserId)
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" })
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role, eventId: eventCredential.eventId },
          JWT_SECRET,
          { expiresIn: "7d" },
        )

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            eventId: eventCredential.eventId,
          },
          token,
        })
      }

      // If not event credential, try regular user login (for admins)
      const user = await storage.getUserByUsername(username)
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" })
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" })
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" })

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        token,
      })
    } catch (error) {
      console.error("Login error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res: Response) => {
    res.json(req.user)
  })

  app.get(
    "/api/participants/my-credential",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!

        let data

        if (user.eventId) {
          data = await storage.getParticipantCredentialWithDetails(user.id, user.eventId)
        } else {
          const credentials = await storage.getEventCredentialsByParticipant(user.id)
          if (credentials.length === 0) {
            return res.status(400).json({ message: "No event associated with this user" })
          }
          const firstCredential = credentials[0]
          data = await storage.getParticipantCredentialWithDetails(user.id, firstCredential.eventId)
        }

        if (!data) {
          return res.status(404).json({ message: "Event credential not found" })
        }

        const { credential, event, rounds, eventRules, activeRoundRules } = data

        res.json({
          credential: {
            id: credential.id,
            eventUsername: credential.eventUsername,
            testEnabled: credential.testEnabled,
            enabledAt: credential.enabledAt,
          },
          event: {
            id: event.id,
            name: event.name,
            description: event.description,
            type: event.type,
            category: event.category,
          },
          rounds: rounds.map((round: any) => ({
            id: round.id,
            name: round.name,
            duration: round.duration,
            startTime: round.startTime,
            endTime: round.endTime,
            status: round.status,
          })),
          eventRules: {
            noRefresh: eventRules?.noRefresh,
            noTabSwitch: eventRules?.noTabSwitch,
            forceFullscreen: eventRules?.forceFullscreen,
            disableShortcuts: eventRules?.disableShortcuts,
            autoSubmitOnViolation: eventRules?.autoSubmitOnViolation,
            maxTabSwitchWarnings: eventRules?.maxTabSwitchWarnings,
            additionalRules: eventRules?.additionalRules,
          },
          roundRules: activeRoundRules
            ? {
                noRefresh: activeRoundRules.noRefresh,
                noTabSwitch: activeRoundRules.noTabSwitch,
                forceFullscreen: activeRoundRules.forceFullscreen,
                disableShortcuts: activeRoundRules.disableShortcuts,
                autoSubmitOnViolation: activeRoundRules.autoSubmitOnViolation,
                maxTabSwitchWarnings: activeRoundRules.maxTabSwitchWarnings,
                additionalRules: activeRoundRules.additionalRules,
              }
            : null,
        })
      } catch (error) {
        console.error("Get participant credential error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.patch("/api/participants/:participantId/disqualify", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { participantId } = req.params

      const participant = await storage.updateParticipantStatus(participantId, "disqualified")

      if (!participant) {
        return res.status(404).json({ message: "Participant not found" })
      }

      res.json({
        message: "Participant disqualified successfully",
        participant,
      })
    } catch (error) {
      console.error("Disqualify participant error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/events", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role === "super_admin" || req.user!.role === "registration_committee") {
        const events = await storage.getEvents()
        res.json(events)
      } else if (req.user!.role === "event_admin") {
        const events = await storage.getEventsByAdmin(req.user!.id)
        res.json(events)
      } else if (req.user!.role === "participant") {
        const allEvents = await storage.getEvents()
        const activeEvents = allEvents.filter((e) => e.status === "active")
        res.json(activeEvents)
      } else {
        res.json([])
      }
    } catch (error) {
      console.error("Get events error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/events/unassigned", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const events = await storage.getEventsWithoutAdmins()
      res.json(events)
    } catch (error) {
      console.error("Get unassigned events error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/events/for-registration", async (req: Request, res: Response) => {
    try {
      const activeForm = await storage.getActiveRegistrationForm()

      if (!activeForm) {
        return res.status(404).json({ message: "No active registration form found" })
      }

      const allEvents = await storage.getEvents()

      const allowedEvents = allEvents.filter((event) => activeForm.allowedCategories.includes(event.category))

      const eventsWithRounds = await Promise.all(
        allowedEvents.map(async (event) => {
          const rounds = await storage.getRoundsByEvent(event.id)
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            category: event.category,
            rounds: rounds.map((r) => ({
              id: r.id,
              name: r.name,
              startTime: r.startTime,
              endTime: r.endTime,
            })),
          }
        }),
      )
      res.json(eventsWithRounds)
    } catch (error) {
      console.error("Get events for registration error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/events/for-registration-grouped", async (req: Request, res: Response) => {
    try {
      const activeForm = await storage.getActiveRegistrationForm()
      if (!activeForm) {
        return res.status(404).json({ message: "No active registration form found" })
      }

      const allEvents = await storage.getEvents()
      const allowedEvents = allEvents.filter((event) => activeForm.allowedCategories.includes(event.category))

      const eventsWithRounds = await Promise.all(
        allowedEvents.map(async (event) => {
          const rounds = await storage.getRoundsByEvent(event.id)
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            category: event.category,
            rounds: rounds.map((r) => ({
              id: r.id,
              name: r.name,
              startTime: r.startTime,
              endTime: r.endTime,
            })),
          }
        }),
      )

      const technical = eventsWithRounds.filter((e) => e.category === "technical")
      const non_technical = eventsWithRounds.filter((e) => e.category === "non_technical")

      return res.json({ technical, non_technical })
    } catch (error) {
      console.error("Get grouped events for registration error:", error)
      return res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/events/:id", requireAuth, requireEventAccess, async (req: AuthRequest, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id)
      if (!event) {
        return res.status(404).json({ message: "Event not found" })
      }
      res.json(event)
    } catch (error) {
      console.error("Get event error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post("/api/events", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, type, category, startDate, endDate, status } = req.body // added category

      // Dev log: incoming payload category
      try { console.log(`Create event payload category: ${category}`) } catch (e) {}

      if (!name || !description || !type) {
        return res.status(400).json({ message: "Name, description, and type are required" })
      }

      if (category !== undefined && !["technical", "non_technical"].includes(category)) {
        return res.status(400).json({ message: "Invalid category. Must be 'technical' or 'non_technical'." })
      }

      const existingEvent = await storage.getEventByName(name)
      if (existingEvent) {
        return res.status(400).json({ message: "An event with this name already exists" })
      }

      const event = await storage.createEvent({
        name,
        description,
        type,
        category: category ?? "technical",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || "draft",
        createdBy: req.user!.id,
      })

      // Dev log: what was stored
      try { console.log(`Event created: id=${event.id} category=${event.category} name=${event.name}`) } catch (e) {}

      await storage.createEventRules({
        eventId: event.id,
        noRefresh: true,
        noTabSwitch: true,
        forceFullscreen: true,
        disableShortcuts: true,
        autoSubmitOnViolation: true,
        maxTabSwitchWarnings: 2,
        additionalRules: null,
      })

      res.status(201).json(event)
    } catch (error) {
      console.error("Create event error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.patch("/api/events/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, type, category, startDate, endDate, status } = req.body // added category

      try { console.log(`Update event payload for id=${req.params.id} incoming category: ${category}`) } catch (e) {}

      if (name !== undefined) {
        const existingEvent = await storage.getEventByName(name)
        if (existingEvent && existingEvent.id !== req.params.id) {
          return res.status(400).json({ message: "An event with this name already exists" })
        }
      }

      if (category !== undefined && !["technical", "non_technical"].includes(category)) {
        return res.status(400).json({ message: "Invalid category. Must be 'technical' or 'non_technical'." })
      }

      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (type !== undefined) updateData.type = type
      if (category !== undefined) updateData.category = category // persist category on update
      if (startDate !== undefined) updateData.startDate = new Date(startDate)
      if (endDate !== undefined) updateData.endDate = new Date(endDate)
      if (status !== undefined) updateData.status = status

      const event = await storage.updateEvent(req.params.id, updateData)
      try { console.log(`Event updated: id=${event?.id} category=${event?.category} name=${event?.name}`) } catch (e) {}
      if (!event) {
        return res.status(404).json({ message: "Event not found" })
      }

      res.json(event)
    } catch (error) {
      console.error("Update event error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.delete("/api/events/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // CASCADE DELETE BEHAVIOR: Deleting an event automatically deletes eventAdmins (assignments),
      // eventRules, rounds, roundRules, questions, testAttempts, answers, participants, and reports.
      // Admin user accounts persist and can be reassigned to other events.
      await storage.deleteEvent(req.params.id)
      res.json({ message: "Event deleted successfully" })
    } catch (error) {
      console.error("Delete event error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post("/api/events/:eventId/admins", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { adminId } = req.body

      if (!adminId) {
        return res.status(400).json({ message: "Admin ID is required" })
      }

      const admin = await storage.getUser(adminId)
      if (!admin || admin.role !== "event_admin") {
        return res.status(400).json({ message: "Invalid event admin" })
      }

      await storage.assignEventAdmin(req.params.eventId, adminId)
      res.json({ message: "Event admin assigned successfully" })
    } catch (error) {
      console.error("Assign event admin error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  // ...existing code...

  app.get("/api/events/:eventId/admins", requireAuth, requireEventAccess, async (req: AuthRequest, res: Response) => {
    try {
      const admins = await storage.getEventAdminsByEvent(req.params.eventId)
      const adminsWithoutPasswords = admins.map(({ password, ...admin }) => admin)
      res.json(adminsWithoutPasswords)
    } catch (error) {
      console.error("Get event admins error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.delete(
    "/api/events/:eventId/admins/:adminId",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        await storage.removeEventAdmin(req.params.eventId, req.params.adminId)
        res.json({ message: "Event admin removed successfully" })
      } catch (error) {
        console.error("Remove event admin error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/events/:eventId/rules", requireAuth, requireEventAccess, async (req: AuthRequest, res: Response) => {
    try {
      const rules = await storage.getEventRules(req.params.eventId)
      if (!rules) {
        return res.status(404).json({ message: "Event rules not found" })
      }
      res.json(rules)
    } catch (error) {
      console.error("Get event rules error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.patch("/api/events/:eventId/rules", requireAuth, requireEventAccess, async (req: AuthRequest, res: Response) => {
    try {
      const {
        noRefresh,
        noTabSwitch,
        forceFullscreen,
        disableShortcuts,
        autoSubmitOnViolation,
        maxTabSwitchWarnings,
        additionalRules,
      } = req.body

      const updateData: any = {}
      if (noRefresh !== undefined) updateData.noRefresh = noRefresh
      if (noTabSwitch !== undefined) updateData.noTabSwitch = noTabSwitch
      if (forceFullscreen !== undefined) updateData.forceFullscreen = forceFullscreen
      if (disableShortcuts !== undefined) updateData.disableShortcuts = disableShortcuts
      if (autoSubmitOnViolation !== undefined) updateData.autoSubmitOnViolation = autoSubmitOnViolation
      if (maxTabSwitchWarnings !== undefined) updateData.maxTabSwitchWarnings = maxTabSwitchWarnings
      if (additionalRules !== undefined) updateData.additionalRules = additionalRules

      const rules = await storage.updateEventRules(req.params.eventId, updateData)
      if (!rules) {
        return res.status(404).json({ message: "Event rules not found" })
      }

      res.json(rules)
    } catch (error) {
      console.error("Update event rules error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/events/:eventId/rounds", requireAuth, requireEventAccess, async (req: AuthRequest, res: Response) => {
    try {
      const rounds = await storage.getRoundsByEvent(req.params.eventId)
      res.json(rounds)
    } catch (error) {
      console.error("Get rounds error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post(
    "/api/events/:eventId/rounds",
    requireAuth,
    requireEventAdmin,
    requireEventAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const { name, description, roundNumber, duration, startTime, endTime, status } = req.body

        if (!name || roundNumber === undefined || !duration) {
          return res.status(400).json({ message: "Name, round number, and duration are required" })
        }

        const round = await storage.createRound({
          eventId: req.params.eventId,
          name,
          description: description || null,
          roundNumber,
          duration,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          status: status || "not_started",
        })

        await storage.createRoundRules({
          roundId: round.id,
          noRefresh: true,
          noTabSwitch: true,
          forceFullscreen: true,
          disableShortcuts: true,
          autoSubmitOnViolation: true,
          maxTabSwitchWarnings: 2,
          additionalRules: null,
        })

        res.status(201).json(round)
      } catch (error) {
        console.error("Create round error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/rounds/:roundId", requireAuth, requireRoundAccess, async (req: AuthRequest, res: Response) => {
    try {
      const round = await storage.getRound(req.params.roundId)
      if (!round) {
        return res.status(404).json({ message: "Round not found" })
      }
      res.json(round)
    } catch (error) {
      console.error("Get round error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.delete(
    "/api/rounds/:roundId",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        await storage.deleteRound(req.params.roundId)
        res.json({ message: "Round deleted successfully" })
      } catch (error) {
        console.error("Delete round error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.patch(
    "/api/rounds/:roundId",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const { name, description, roundNumber, duration, startTime, endTime, status } = req.body

        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (roundNumber !== undefined) updateData.roundNumber = roundNumber
        if (duration !== undefined) updateData.duration = duration
        if (startTime !== undefined) updateData.startTime = new Date(startTime)
        if (endTime !== undefined) updateData.endTime = new Date(endTime)
        if (status !== undefined) updateData.status = status

        const round = await storage.updateRound(req.params.roundId, updateData)
        if (!round) {
          return res.status(404).json({ message: "Round not found" })
        }

        res.json(round)
      } catch (error) {
        console.error("Update round error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/rounds/:roundId/start",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const round = await storage.getRound(req.params.roundId)
        if (!round) {
          return res.status(404).json({ message: "Round not found" })
        }

        if (round.status !== "not_started") {
          return res.status(400).json({ message: "Round can only be started when status is 'not_started'" })
        }

        // Update round status to in_progress
        const updatedRound = await storage.updateRoundStatus(req.params.roundId, "in_progress")
        
        if (!updatedRound) {
          return res.status(500).json({ message: "Failed to update round status" })
        }

        // Automatically enable test for all participants when starting the round
        const credentials = await storage.getEventCredentialsByEvent(round.eventId)
        await Promise.all(
          credentials.map((cred) => storage.updateEventCredentialTestStatus(cred.id, true, req.user!.id)),
        )

        // Get event details for email
        const event = await storage.getEventById(round.eventId)
        
        // Send test start reminder emails to all participants
        if (event && updatedRound.startTime) {
          const participants = await storage.getParticipantsByEventId(round.eventId)
          
          // Send emails in parallel (non-blocking)
          Promise.all(
            participants.map(async (participant) => {
              if (participant.email && participant.fullName) {
                await emailService.sendTestStartReminder(
                  participant.email,
                  participant.fullName,
                  event.name,
                  updatedRound.name,
                  updatedRound.startTime!
                )
              }
            })
          ).catch(err => {
            console.error('Error sending test start reminder emails:', err)
          })
        }

        // Notify via WebSocket
        WebSocketService.notifyRoundStatus(round.eventId, req.params.roundId, "in_progress", updatedRound)

        res.json(updatedRound)
      } catch (error) {
        console.error("Start round error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/rounds/:roundId/end",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const round = await storage.getRound(req.params.roundId)
        if (!round) {
          return res.status(404).json({ message: "Round not found" })
        }

        if (round.status !== "in_progress") {
          return res.status(400).json({ message: "Round can only be ended when status is 'in_progress'" })
        }

        const updatedRound = await storage.updateRoundStatus(req.params.roundId, "completed")

        // Notify via WebSocket
        WebSocketService.notifyRoundStatus(round.eventId, req.params.roundId, "completed", updatedRound)

        res.json(updatedRound)
      } catch (error) {
        console.error("End round error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/rounds/:roundId/restart",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const round = await storage.getRound(req.params.roundId)
        if (!round) {
          return res.status(404).json({ message: "Round not found" })
        }

        // Delete all test attempts
        await storage.deleteTestAttemptsByRound(req.params.roundId)

        // Reset round status
        const updatedRound = await storage.updateRoundStatus(req.params.roundId, "not_started", null)

        // Disable test for all participants when restarting
        const credentials = await storage.getEventCredentialsByEvent(round.eventId)
        await Promise.all(
          credentials.map((cred) => storage.updateEventCredentialTestStatus(cred.id, false, req.user!.id)),
        )

        // Notify via WebSocket
        WebSocketService.notifyRoundStatus(round.eventId, req.params.roundId, "not_started", updatedRound)

        res.json({
          message: "Round restarted successfully",
          round: updatedRound,
        })
      } catch (error) {
        console.error("Restart round error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/rounds/:roundId/publish-results",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const round = await storage.getRound(req.params.roundId)
        if (!round) {
          return res.status(404).json({ message: "Round not found" })
        }

        const updatedRound = await storage.updateRoundResultsPublished(req.params.roundId, true)

        // Notify via WebSocket
        WebSocketService.notifyRoundStatus(round.eventId, req.params.roundId, round.status, updatedRound)

        res.json({
          message: "Results published successfully",
          round: updatedRound,
        })
      } catch (error) {
        console.error("Publish results error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/rounds/:roundId/rules", requireAuth, requireRoundAccess, async (req: AuthRequest, res: Response) => {
    try {
      let rules = await storage.getRoundRules(req.params.roundId)

      if (!rules) {
        const round = await storage.getRound(req.params.roundId)
        if (!round) {
          return res.status(404).json({ message: "Round not found" })
        }

        rules = await storage.createRoundRules({
          roundId: req.params.roundId,
          noRefresh: true,
          noTabSwitch: true,
          forceFullscreen: true,
          disableShortcuts: true,
          autoSubmitOnViolation: true,
          maxTabSwitchWarnings: 2,
          additionalRules: null,
        })
      }

      res.json(rules)
    } catch (error) {
      console.error("Get round rules error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.patch(
    "/api/rounds/:roundId/rules",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const {
          noRefresh,
          noTabSwitch,
          forceFullscreen,
          disableShortcuts,
          autoSubmitOnViolation,
          maxTabSwitchWarnings,
          additionalRules,
        } = req.body

        const updateData: any = {}
        if (noRefresh !== undefined) updateData.noRefresh = noRefresh
        if (noTabSwitch !== undefined) updateData.noTabSwitch = noTabSwitch
        if (forceFullscreen !== undefined) updateData.forceFullscreen = forceFullscreen
        if (disableShortcuts !== undefined) updateData.disableShortcuts = disableShortcuts
        if (autoSubmitOnViolation !== undefined) updateData.autoSubmitOnViolation = autoSubmitOnViolation
        if (maxTabSwitchWarnings !== undefined) updateData.maxTabSwitchWarnings = maxTabSwitchWarnings
        if (additionalRules !== undefined) updateData.additionalRules = additionalRules

        const rules = await storage.updateRoundRules(req.params.roundId, updateData)
        if (!rules) {
          return res.status(404).json({ message: "Round rules not found" })
        }

        res.json(rules)
      } catch (error) {
        console.error("Update round rules error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get(
    "/api/rounds/:roundId/questions",
    requireAuth,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const questions = await storage.getQuestionsByRound(req.params.roundId)
        res.json(questions)
      } catch (error) {
        console.error("Get questions error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/rounds/:roundId/questions",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const {
          questionType,
          questionText,
          questionNumber,
          points,
          options,
          correctAnswer,
          expectedOutput,
          testCases,
        } = req.body

        if (!questionType || !questionText || questionNumber === undefined) {
          return res.status(400).json({ message: "Question type, text, and number are required" })
        }

        const question = await storage.createQuestion({
          roundId: req.params.roundId,
          questionType,
          questionText,
          questionNumber,
          points: points || 1,
          options: options || null,
          correctAnswer: correctAnswer || null,
          expectedOutput: expectedOutput || null,
          testCases: testCases || null,
        })

        res.status(201).json(question)
      } catch (error) {
        console.error("Create question error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/rounds/:roundId/questions/bulk",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const { questions } = req.body

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
          return res.status(400).json({ message: "Questions array is required and must not be empty" })
        }

        const errors: string[] = []
        const createdQuestions = []

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i]

          if (!q.questionText || q.questionNumber === undefined) {
            errors.push(`Question ${i + 1}: questionText and questionNumber are required`)
            continue
          }

          try {
            const question = await storage.createQuestion({
              roundId: req.params.roundId,
              questionType: q.questionType || "multiple_choice",
              questionText: q.questionText,
              questionNumber: q.questionNumber,
              points: q.points || 1,
              options: q.options || null,
              correctAnswer: q.correctAnswer || null,
              expectedOutput: q.expectedOutput || null,
              testCases: q.testCases || null,
            })
            createdQuestions.push(question)
          } catch (error: any) {
            errors.push(`Question ${i + 1}: ${error.message}`)
          }
        }

        if (errors.length > 0 && createdQuestions.length === 0) {
          return res.status(400).json({ message: "Failed to create any questions", errors })
        }

        res.status(201).json({
          message: `Successfully created ${createdQuestions.length} questions`,
          created: createdQuestions.length,
          errors: errors.length > 0 ? errors : undefined,
          questions: createdQuestions,
        })
      } catch (error) {
        console.error("Bulk create questions error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/events/:eventId/participants",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const participant = await storage.registerParticipant({
          eventId: req.params.eventId,
          userId: req.user!.id,
          status: "registered",
        })

        res.status(201).json(participant)
      } catch (error) {
        console.error("Register participant error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get(
    "/api/events/:eventId/participants",
    requireAuth,
    requireEventAccess,
    async (req: AuthRequest, res: Response) => {
      try {
        const participants = await storage.getParticipantsByEvent(req.params.eventId)
        res.json(participants)
      } catch (error) {
        console.error("Get participants error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get(
    "/api/participants/my-registrations",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const participants = await storage.getParticipantsByUser(req.user!.id)
        res.json(participants)
      } catch (error) {
        console.error("Get my registrations error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/event-admin/participants", requireAuth, requireEventAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const participants = await storage.getParticipantsByAdmin(req.user!.id)
      const participantsWithoutPasswords = participants.map((p) => ({
        ...p,
        user: p.user ? (({ password, ...user }) => user)(p.user) : p.user,
      }))
      res.json(participantsWithoutPasswords)
    } catch (error) {
      console.error("Get admin participants error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/event-admin/my-event", requireAuth, requireEventAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const events = await storage.getEventsByAdmin(req.user!.id)

      if (events.length === 0) {
        return res.status(404).json({ message: "No event assigned to this admin" })
      }

      const event = events[0]
      const participants = await storage.getParticipantsByEvent(event.id)
      const participantCount = participants.length

      res.json({
        event,
        participantCount,
      })
    } catch (error) {
      console.error("Get my event error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  // Test Attempt Routes
  app.post(
    "/api/events/:eventId/rounds/:roundId/start",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const { roundId } = req.params
        const userId = req.user!.id

        // Check if user already has an attempt for this round
        const existingAttempt = await storage.getTestAttemptByUserAndRound(userId, roundId)
        if (existingAttempt) {
          return res.status(400).json({ message: "You already have an attempt for this round" })
        }

        // Get round to calculate max score
        const round = await storage.getRound(roundId)
        if (!round) {
          return res.status(404).json({ message: "Round not found" })
        }

        // Get questions to calculate max score
        const questions = await storage.getQuestionsByRound(roundId)
        const maxScore = questions.reduce((sum, q) => sum + q.points, 0)

        const attempt = await storage.createTestAttempt({
          roundId,
          userId,
          status: "in_progress",
          tabSwitchCount: 0,
          refreshAttemptCount: 0,
          violationLogs: [],
          totalScore: 0,
          maxScore,
        })

        res.status(201).json(attempt)
      } catch (error) {
        console.error("Start test attempt error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get(
    "/api/participants/rounds/:roundId/my-attempt",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const { roundId } = req.params
        const userId = req.user!.id

        const existingAttempt = await storage.getTestAttemptByUserAndRound(userId, roundId)

        if (!existingAttempt) {
          return res.json({ attempt: null })
        }

        res.json({ attempt: existingAttempt })
      } catch (error) {
        console.error("Get my attempt error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/attempts/:attemptId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const attempt = await storage.getTestAttempt(req.params.attemptId)
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" })
      }

      // Only allow user to view their own attempt or admins
      if (attempt.userId !== req.user!.id && req.user!.role === "participant") {
        return res.status(403).json({ message: "Access denied" })
      }

      // Get round and questions
      const round = await storage.getRound(attempt.roundId)
      const questions = await storage.getQuestionsByRound(attempt.roundId)
      const answers = await storage.getAnswersByAttempt(attempt.id)
      
      // Get event to check if it has ended
      const event = round ? await storage.getEvent(round.eventId) : null

      // Check if results should be shown:
      // Results are shown when BOTH conditions are met:
      // 1. Admin has published results (round.resultsPublished === true), AND
      // 2. Participant's attempt duration has elapsed (current time > attempt.startedAt + duration)
      
      // Calculate if the participant's attempt duration has elapsed
      // Use attempt.startedAt (when participant started) not round.startedAt (when admin started round)
      let attemptDurationElapsed = false
      if (attempt.startedAt && round?.duration) {
        const attemptEndTime = new Date(attempt.startedAt).getTime() + (round.duration * 60 * 1000)
        attemptDurationElapsed = Date.now() > attemptEndTime
      }
      
      const resultsPublished = round?.resultsPublished ?? false
      const eventEnded = resultsPublished && attemptDurationElapsed
      
      const isAdmin = req.user!.role === "super_admin" || req.user!.role === "event_admin"

      // Hide scores and answers if event/round hasn't ended (for participants only)
      let responseData: any = {
        ...attempt,
        round,
        questions,
        answers,
        event,
        eventEnded,
      }

      if (!eventEnded && !isAdmin && req.user!.role === "participant") {
        // Hide sensitive data until event ends
        responseData = {
          ...attempt,
          totalScore: null,
          maxScore: null,
          round: {
            ...round,
          },
          questions: questions.map((q: any) => ({
            ...q,
            correctAnswer: null, // Hide correct answers
          })),
          answers: answers.map((a: any) => ({
            ...a,
            isCorrect: null, // Hide correctness
            pointsAwarded: null, // Hide points
          })),
          event,
          eventEnded,
        }
      }

      res.json(responseData)
    } catch (error) {
      console.error("Get test attempt error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post(
    "/api/attempts/:attemptId/answers",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const { attemptId } = req.params
        const { questionId, answer } = req.body

        if (!questionId || answer === undefined) {
          return res.status(400).json({ message: "Question ID and answer are required" })
        }

        const attempt = await storage.getTestAttempt(attemptId)
        if (!attempt) {
          return res.status(404).json({ message: "Test attempt not found" })
        }

        if (attempt.userId !== req.user!.id) {
          return res.status(403).json({ message: "Access denied" })
        }

        if (attempt.status !== "in_progress") {
          return res.status(400).json({ message: "Test is not in progress" })
        }

        // Check if answer already exists
        const existingAnswers = await storage.getAnswersByAttempt(attemptId)
        const existingAnswer = existingAnswers.find((a) => a.questionId === questionId)

        let savedAnswer
        if (existingAnswer) {
          savedAnswer = await storage.updateAnswer(existingAnswer.id, { answer })
        } else {
          savedAnswer = await storage.createAnswer({
            attemptId,
            questionId,
            answer,
            isCorrect: false,
            pointsAwarded: 0,
          })
        }

        res.json(savedAnswer)
      } catch (error) {
        console.error("Save answer error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/attempts/:attemptId/violations",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const { attemptId } = req.params
        const { type } = req.body // 'tab_switch', 'refresh', 'shortcut'

        const attempt = await storage.getTestAttempt(attemptId)
        if (!attempt) {
          return res.status(404).json({ message: "Test attempt not found" })
        }

        if (attempt.userId !== req.user!.id) {
          return res.status(403).json({ message: "Access denied" })
        }

        if (attempt.status !== "in_progress") {
          return res.status(400).json({ message: "Test is not in progress" })
        }

        const violationLogs = (attempt.violationLogs as any[]) || []
        violationLogs.push({
          type,
          timestamp: new Date().toISOString(),
        })

        const updates: any = { violationLogs }

        if (type === "tab_switch") {
          updates.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1
        } else if (type === "refresh") {
          updates.refreshAttemptCount = (attempt.refreshAttemptCount || 0) + 1
        }

        const updatedAttempt = await storage.updateTestAttempt(attemptId, updates)

        res.json(updatedAttempt)
      } catch (error) {
        console.error("Log violation error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post(
    "/api/attempts/:attemptId/submit",
    requireAuth,
    requireParticipant,
    async (req: AuthRequest, res: Response) => {
      try {
        const { attemptId } = req.params

        const attempt = await storage.getTestAttempt(attemptId)
        if (!attempt) {
          return res.status(404).json({ message: "Test attempt not found" })
        }

        if (attempt.userId !== req.user!.id) {
          return res.status(403).json({ message: "Access denied" })
        }

        if (attempt.status !== "in_progress") {
          return res.status(400).json({ message: "Test is already submitted" })
        }

        // Get questions and answers to calculate score
        const questions = await storage.getQuestionsByRound(attempt.roundId)
        const answers = await storage.getAnswersByAttempt(attemptId)

        let totalScore = 0

        // Grade answers
        for (const answer of answers) {
          const question = questions.find((q) => q.id === answer.questionId)
          if (!question) continue

          let isCorrect = false
          let pointsAwarded = 0

          // Auto-grade multiple choice and true/false
          if (question.questionType === "multiple_choice" || question.questionType === "true_false") {
            isCorrect = answer.answer.toLowerCase() === (question.correctAnswer || "").toLowerCase()
            pointsAwarded = isCorrect ? question.points : 0
          }
          // For short answer and coding, require manual grading (set to 0 for now)
          else {
            isCorrect = false
            pointsAwarded = 0
          }

          totalScore += pointsAwarded

          // Update answer with grading
          await storage.updateAnswer(answer.id, {
            isCorrect,
            pointsAwarded,
          })
        }

        // Update attempt as completed
        const updatedAttempt = await storage.updateTestAttempt(attemptId, {
          status: "completed",
          submittedAt: new Date(),
          completedAt: new Date(),
          totalScore,
        })

        // Notify participant via WebSocket
        const round = await storage.getRound(attempt.roundId)
        if (round) {
          WebSocketService.notifyResultPublished(attempt.userId, round.eventId, updatedAttempt)
        }

        // Send result published email to participant
        if (round && req.user?.email && req.user?.fullName) {
          const event = await storage.getEventById(round.eventId)
          
          if (event) {
            // Get participant's rank from leaderboard
            const leaderboard = await storage.getRoundLeaderboard(attempt.roundId)
            const participantRank = leaderboard.findIndex(entry => entry.userId === attempt.userId) + 1
            
            // Send email (non-blocking)
            emailService.sendResultPublished(
              req.user.email,
              req.user.fullName,
              event.name,
              totalScore,
              participantRank || 0
            ).catch(err => {
              console.error('Error sending result published email:', err)
            })
          }
        }

        res.json(updatedAttempt)
      } catch (error) {
        console.error("Submit test error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/participants/my-attempts", requireAuth, requireParticipant, async (req: AuthRequest, res: Response) => {
    try {
      const attempts = await storage.getTestAttemptsByUser(req.user!.id)
      
      const attemptsWithRounds = await Promise.all(
        attempts.map(async (attempt) => {
          const round = await storage.getRound(attempt.roundId)
          
          const attemptDurationElapsed = attempt.startedAt && round?.duration
            ? Date.now() > new Date(attempt.startedAt).getTime() + (round.duration * 60 * 1000)
            : false
          
          const resultsPublished = round?.resultsPublished ?? false
          const canViewResults = resultsPublished && attemptDurationElapsed
          
          if (!canViewResults && attempt.status === 'completed') {
            return {
              ...attempt,
              totalScore: null,
              maxScore: null,
              round
            }
          }
          
          return { ...attempt, round }
        })
      )
      
      res.json(attemptsWithRounds)
    } catch (error) {
      console.error("Get my attempts error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  // Leaderboard Routes
  app.get("/api/rounds/:roundId/leaderboard", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { roundId } = req.params
      const round = await storage.getRound(roundId)
      
      if (!round) {
        return res.status(404).json({ message: "Round not found" })
      }
      
      const isAdmin = req.user!.role === "super_admin" || req.user!.role === "event_admin"
      
      if (!isAdmin) {
        if (!round.resultsPublished) {
          return res.json([])
        }
        
        if (req.user!.id) {
          const userAttempt = await storage.getTestAttemptByUserAndRound(req.user!.id, roundId)
          if (userAttempt && userAttempt.startedAt && round.duration) {
            const attemptDurationElapsed = Date.now() > new Date(userAttempt.startedAt).getTime() + (round.duration * 60 * 1000)
            if (!attemptDurationElapsed) {
              return res.json([])
            }
          }
        }
      }
      
      const leaderboard = await storage.getRoundLeaderboard(roundId)
      res.json(leaderboard)
    } catch (error) {
      console.error("Get round leaderboard error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/events/:eventId/leaderboard", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params
      const rounds = await storage.getRoundsByEvent(eventId)
      
      const isAdmin = req.user!.role === "super_admin" || req.user!.role === "event_admin"
      
      if (!isAdmin) {
        const allResultsPublished = rounds.every(round => round.resultsPublished)
        
        if (!allResultsPublished) {
          return res.json([])
        }
        
        if (req.user!.id) {
          for (const round of rounds) {
            const userAttempt = await storage.getTestAttemptByUserAndRound(req.user!.id, round.id)
            if (userAttempt && userAttempt.startedAt && round.duration) {
              const attemptDurationElapsed = Date.now() > new Date(userAttempt.startedAt).getTime() + (round.duration * 60 * 1000)
              if (!attemptDurationElapsed) {
                return res.json([])
              }
            }
          }
        }
      }
      
      const leaderboard = await storage.getEventLeaderboard(eventId)
      res.json(leaderboard)
    } catch (error) {
      console.error("Get event leaderboard error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/reports", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const reports = await storage.getReports()
      res.json(reports)
    } catch (error) {
      console.error("Get reports error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post("/api/reports/generate/event", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.body

      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" })
      }

      const report = await storage.generateEventReport(eventId, req.user!.id)
      res.status(201).json(report)
    } catch (error) {
      console.error("Generate event report error:", error)
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" })
    }
  })

  app.post(
    "/api/reports/generate/symposium",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const report = await storage.generateSymposiumReport(req.user!.id)
        res.status(201).json(report)
      } catch (error) {
        console.error("Generate symposium report error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/reports/:id/download", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const report = await storage.getReport(id)

      if (!report) {
        return res.status(404).json({ message: "Report not found" })
      }

      res.setHeader("Content-Type", "application/json")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${report.title.replace(/[^a-z0-9]/gi, "_")}_${id}.json"`,
      )
      res.json(report.reportData)
    } catch (error) {
      console.error("Download report error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post(
    "/api/admin/backfill-round-rules",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const events = await storage.getEvents()
        let processedCount = 0
        let createdCount = 0

        for (const event of events) {
          const rounds = await storage.getRoundsByEvent(event.id)

          for (const round of rounds) {
            processedCount++
            const existingRules = await storage.getRoundRules(round.id)

            if (!existingRules) {
              await storage.createRoundRules({
                roundId: round.id,
                noRefresh: true,
                noTabSwitch: true,
                forceFullscreen: true,
                disableShortcuts: true,
                autoSubmitOnViolation: true,
                maxTabSwitchWarnings: 2,
                additionalRules: null,
              })
              createdCount++
            }
          }
        }

        res.json({
          message: "Backfill completed successfully",
          processedRounds: processedCount,
          createdRules: createdCount,
        })
      } catch (error) {
        console.error("Backfill round rules error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.post("/api/registration-forms", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { title, description, formFields } = req.body

      if (!title || !formFields || !Array.isArray(formFields)) {
        return res.status(400).json({ message: "Title and formFields are required" })
      }

      const slug = generateFormSlug(title)
      const form = await storage.createRegistrationForm(title, description || "", formFields, slug)

      res.status(201).json(form)
    } catch (error) {
      console.error("Create registration form error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/registration-forms/active", async (req: Request, res: Response) => {
    try {
      const form = await storage.getActiveRegistrationForm()
      if (!form) {
        return res.status(404).json({ message: "No active registration form found" })
      }
      res.json(form)
    } catch (error) {
      console.error("Get active registration form error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.patch("/api/registration-forms/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const updates = req.body
      const form = await storage.updateRegistrationForm(req.params.id, updates)
      if (!form) {
        return res.status(404).json({ message: "Form not found" })
      }
      res.json(form)
    } catch (error) {
      console.error("Update registration form error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/registration-forms/all", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const forms = await storage.getAllRegistrationForms()
      res.json(forms)
    } catch (error) {
      console.error("Get all registration forms error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/registration-forms/:slug", async (req: Request, res: Response) => {
    try {
      const form = await storage.getRegistrationFormBySlug(req.params.slug)
      if (!form) {
        return res.status(404).json({ message: "Form not found" })
      }
      res.json(form)
    } catch (error) {
      console.error("Get registration form error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post("/api/registration-forms/:slug/submit", async (req: Request, res: Response) => {
    try {
      const form = await storage.getRegistrationFormBySlug(req.params.slug)
      if (!form) {
        return res.status(404).json({ message: "Form not found" })
      }

      if (!form.isActive) {
        return res.status(400).json({ message: "This form is no longer accepting submissions" })
      }

      const { submittedData, selectedEvents } = req.body

      if (!submittedData || !selectedEvents || !Array.isArray(selectedEvents)) {
        return res.status(400).json({ message: "submittedData and selectedEvents are required" })
      }

      const events = await storage.getEventsByIds(selectedEvents)
      const invalidEvents = events.filter((event) => !form.allowedCategories.includes(event.category))

      if (invalidEvents.length > 0) {
        return res.status(400).json({
          message: `The following events are not allowed by this form: ${invalidEvents.map((e) => e.name).join(", ")}`,
        })
      }

      const validation = await validateEventSelection(selectedEvents)
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error })
      }

      const registration = await storage.createRegistration(form.id, submittedData, selectedEvents)

      // Notify via WebSocket for each event
      for (const eventId of selectedEvents) {
        const event = await storage.getEventById(eventId)
        WebSocketService.notifyRegistrationUpdate(eventId, {
          ...registration,
          eventName: event?.name || "Unknown Event",
        })
      }

      res.status(201).json(registration)
    } catch (error) {
      console.error("Submit registration error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/registrations", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!
      if (user.role !== "super_admin" && user.role !== "registration_committee") {
        return res.status(403).json({ message: "Forbidden" })
      }

      const registrations = await storage.getRegistrations()
      res.json(registrations)
    } catch (error) {
      console.error("Get registrations error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.patch("/api/registrations/:id/approve", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!
      if (user.role !== "super_admin" && user.role !== "registration_committee") {
        return res.status(403).json({ message: "Forbidden" })
      }

      const registration = await storage.getRegistration(req.params.id)
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" })
      }

      if (registration.paymentStatus !== "pending") {
        return res.status(400).json({ message: "Registration has already been processed" })
      }

      const password = generateSecurePassword()
      const userData = registration.submittedData

      const extractEmail = (data: Record<string, string>): string => {
        for (const value of Object.values(data)) {
          if (value && typeof value === "string" && value.includes("@") && value.includes(".")) {
            return value
          }
        }
        throw new Error("Email not found in registration data")
      }

      const extractFullName = (data: Record<string, string>): string => {
        for (const value of Object.values(data)) {
          if (value && typeof value === "string" && value.includes(" ") && !value.includes("@")) {
            return value
          }
        }
        return "Participant"
      }

      const email = extractEmail(userData)
      const fullName = extractFullName(userData)

      const existingUser = await storage.getUserByEmail(email)
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists. Please use a different email or contact support." })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const username = `${email.split('@')[0]}_${nanoid(6)}`.toLowerCase()
      const newUser = await storage.createUser({
        username: username,
        password: hashedPassword,
        email: email,
        fullName: fullName,
        role: "participant",
      } as any)

      const eventCredentialsList = []

      for (const eventId of registration.selectedEvents) {
        await storage.createParticipant(newUser.id, eventId)

        const event = await storage.getEventById(eventId)
        if (!event) continue

        const count = await storage.getEventCredentialCountForEvent(eventId)
        const counter = count + 1
        const { username: eventUsername, password: eventPassword } = generateHumanReadableCredentials(
          fullName,
          event.name,
          counter,
        )

        await storage.createEventCredential(newUser.id, eventId, eventUsername, eventPassword)

        eventCredentialsList.push({
          eventId,
          eventName: event.name,
          eventUsername,
          eventPassword,
        })
      }

      const updated = await storage.updateRegistrationStatus(req.params.id, "paid", newUser.id, user.id)

      // Send emails in background (non-blocking)
      for (const eventCred of eventCredentialsList) {
        emailService.sendRegistrationApproved(
          email,
          fullName,
          eventCred.eventName,
          eventCred.eventUsername,
          eventCred.eventPassword,
        ).catch(err => {
          console.error(`Failed to send approval email for event ${eventCred.eventName}:`, err)
        })
      }

      res.json({
        registration: updated,
        mainCredentials: {
          username: newUser.username,
          password: password,
          email: newUser.email,
        },
        eventCredentials: eventCredentialsList,
      })
    } catch (error) {
      console.error("Approve registration error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post(
    "/api/registration-committee/participants",
    requireAuth,
    requireRegistrationCommittee,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!
        const { fullName, email, phone, selectedEvents } = req.body

        if (!fullName || !email || !selectedEvents || selectedEvents.length === 0) {
          return res.status(400).json({ message: "Full name, email, and at least one event are required" })
        }

        const validation = await validateEventSelection(selectedEvents)
        if (!validation.valid) {
          return res.status(400).json({ message: validation.error })
        }

        const existingEmail = await storage.getUserByEmail(email)
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" })
        }

        const password = generateSecurePassword()
        const hashedPassword = await bcrypt.hash(password, 10)
        const username = `${email.split('@')[0]}_${nanoid(6)}`.toLowerCase()

        const newUser = await storage.createUser({
          username: username,
          password: hashedPassword,
          email: email,
          fullName: fullName,
          phone: phone || null,
          role: "participant",
          createdBy: user.id,
        } as any)

        const eventCredentialsList = []

        for (const eventId of selectedEvents) {
          await storage.createParticipant(newUser.id, eventId)

          const event = await storage.getEventById(eventId)
          if (!event) continue

          const count = await storage.getEventCredentialCountForEvent(eventId)
          const counter = count + 1
          const { username: eventUsername, password: eventPassword } = generateHumanReadableCredentials(
            fullName,
            event.name,
            counter,
          )

          await storage.createEventCredential(newUser.id, eventId, eventUsername, eventPassword)

          eventCredentialsList.push({
            eventId,
            eventName: event.name,
            eventUsername,
            eventPassword,
          })
        }

        // Send emails in background (non-blocking)
        for (const eventCred of eventCredentialsList) {
          emailService.sendCredentials(
            email,
            fullName,
            eventCred.eventName,
            eventCred.eventUsername,
            eventCred.eventPassword,
          ).catch(err => {
            console.error(`Failed to send credentials email for event ${eventCred.eventName}:`, err)
          })
        }

        // Notify via WebSocket for each event
        for (const eventCred of eventCredentialsList) {
          WebSocketService.notifyRegistrationUpdate(eventCred.eventId, {
            participantId: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email,
            eventName: eventCred.eventName,
          })
        }

        res.status(201).json({
          participant: {
            id: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email,
            phone: newUser.phone,
          },
          mainCredentials: {
            username: newUser.username,
            password: password,
            email: newUser.email,
          },
          eventCredentials: eventCredentialsList,
        })
      } catch (error) {
        console.error("Create on-spot participant error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get(
    "/api/registration-committee/participants",
    requireAuth,
    requireRegistrationCommittee,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!
        const participants = await storage.getOnSpotParticipantsByCreator(user.id)
        res.json(participants)
      } catch (error) {
        console.error("Get on-spot participants error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.patch(
    "/api/registration-committee/participants/:id",
    requireAuth,
    requireRegistrationCommittee,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!
        const { fullName, email, phone } = req.body

        const participant = await storage.getUser(req.params.id)
        if (!participant) {
          return res.status(404).json({ message: "Participant not found" })
        }

        if (participant.createdBy !== user.id) {
          return res.status(403).json({ message: "You can only edit participants you created" })
        }

        const updates: any = {}
        if (fullName !== undefined) updates.fullName = fullName
        if (email !== undefined) updates.email = email
        if (phone !== undefined) updates.phone = phone

        const updatedUser = await storage.updateUserDetails(req.params.id, updates)
        if (!updatedUser) {
          return res.status(404).json({ message: "Participant not found" })
        }

        const { password: _, ...userWithoutPassword } = updatedUser
        res.json(userWithoutPassword)
      } catch (error: any) {
        console.error("Update on-spot participant error:", error)
        if (error.message === "Email already exists") {
          return res.status(400).json({ message: error.message })
        }
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.delete(
    "/api/registration-committee/participants/:id",
    requireAuth,
    requireRegistrationCommittee,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!

        const participant = await storage.getUser(req.params.id)
        if (!participant) {
          return res.status(404).json({ message: "Participant not found" })
        }

        if (participant.createdBy !== user.id) {
          return res.status(403).json({ message: "You can only delete participants you created" })
        }

        await storage.deleteUser(req.params.id)
        res.json({ message: "Participant deleted successfully" })
      } catch (error) {
        console.error("Delete on-spot participant error:", error)
        res.status(500).json({ message: "Failed to delete participant" })
      }
    },
  )

  app.get(
    "/api/registration-committee/participants/export/csv",
    requireAuth,
    requireRegistrationCommittee,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!
        const participants = await storage.getOnSpotParticipantsByCreator(user.id)

        const csvRows: string[] = []
        csvRows.push("Participant Name,Email,Phone,Event Name,Username,Password")

        for (const participant of participants) {
          const { fullName, email, phone, eventCredentials } = participant

          if (eventCredentials && eventCredentials.length > 0) {
            for (const credential of eventCredentials) {
              const phoneValue = phone || ""
              const eventName = credential.event.name
              const username = credential.eventUsername
              const password = credential.eventPassword

              const escapedFullName = `"${fullName.replace(/"/g, '""')}"`
              const escapedEmail = `"${email.replace(/"/g, '""')}"`
              const escapedPhone = `"${phoneValue.replace(/"/g, '""')}"`
              const escapedEventName = `"${eventName.replace(/"/g, '""')}"`
              const escapedUsername = `"${username.replace(/"/g, '""')}"`
              const escapedPassword = `"${password.replace(/"/g, '""')}"`

              csvRows.push(
                `${escapedFullName},${escapedEmail},${escapedPhone},${escapedEventName},${escapedUsername},${escapedPassword}`,
              )
            }
          }
        }

        const csvContent = csvRows.join("\n")

        res.setHeader("Content-Type", "text/csv; charset=utf-8")
        res.setHeader("Content-Disposition", 'attachment; filename="participants-credentials.csv"')
        res.send(csvContent)
      } catch (error) {
        console.error("CSV export error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get(
    "/api/registration-committee/participants/export/pdf",
    requireAuth,
    requireRegistrationCommittee,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!
        const participants = await storage.getOnSpotParticipantsByCreator(user.id)

        const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" })

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", 'attachment; filename="participants-credentials.pdf"')

        doc.pipe(res)

        doc.fontSize(20).font("Helvetica-Bold").text("Participant Credentials - BootFeet 2K26", { align: "center" })
        doc.moveDown(0.5)

        const generatedDate = new Date().toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        })
        doc.fontSize(10).font("Helvetica").text(`Generated: ${generatedDate}`, { align: "center" })
        doc.moveDown(1.5)

        const tableTop = doc.y
        const colWidths = [120, 150, 80, 120, 120, 100]
        const rowHeight = 25
        let currentY = tableTop

        const drawTableHeader = (y: number) => {
          doc.font("Helvetica-Bold").fontSize(9)

          doc.rect(50, y, colWidths[0], rowHeight).fillAndStroke("#4A5568", "#000")
          doc.fillColor("#FFF").text("Participant Name", 55, y + 8, { width: colWidths[0] - 10 })

          let xPos = 50 + colWidths[0]
          doc.rect(xPos, y, colWidths[1], rowHeight).fillAndStroke("#4A5568", "#000")
          doc.fillColor("#FFF").text("Email", xPos + 5, y + 8, { width: colWidths[1] - 10 })

          xPos += colWidths[1]
          doc.rect(xPos, y, colWidths[2], rowHeight).fillAndStroke("#4A5568", "#000")
          doc.fillColor("#FFF").text("Phone", xPos + 5, y + 8, { width: colWidths[2] - 10 })

          xPos += colWidths[2]
          doc.rect(xPos, y, colWidths[3], rowHeight).fillAndStroke("#4A5568", "#000")
          doc.fillColor("#FFF").text("Event", xPos + 5, y + 8, { width: colWidths[3] - 10 })

          xPos += colWidths[3]
          doc.rect(xPos, y, colWidths[4], rowHeight).fillAndStroke("#4A5568", "#000")
          doc.fillColor("#FFF").text("Username", xPos + 5, y + 8, { width: colWidths[4] - 10 })

          xPos += colWidths[4]
          doc.rect(xPos, y, colWidths[5], rowHeight).fillAndStroke("#4A5568", "#000")
          doc.fillColor("#FFF").text("Password", xPos + 5, y + 8, { width: colWidths[5] - 10 })

          return y + rowHeight
        }

        currentY = drawTableHeader(currentY)

        doc.font("Helvetica").fontSize(8)
        let rowIndex = 0

        for (const participant of participants) {
          const { fullName, email, phone, eventCredentials } = participant

          if (eventCredentials && eventCredentials.length > 0) {
            for (const credential of eventCredentials) {
              if (currentY > 500) {
                doc.addPage({ margin: 50, size: "A4", layout: "landscape" })
                currentY = 50
                currentY = drawTableHeader(currentY)
                rowIndex = 0
              }

              const bgColor = rowIndex % 2 === 0 ? "#F7FAFC" : "#FFFFFF"

              doc.rect(50, currentY, colWidths[0], rowHeight).fillAndStroke(bgColor, "#000")
              doc.fillColor("#000").text(fullName, 55, currentY + 8, { width: colWidths[0] - 10, ellipsis: true })

              let xPos = 50 + colWidths[0]
              doc.rect(xPos, currentY, colWidths[1], rowHeight).fillAndStroke(bgColor, "#000")
              doc.fillColor("#000").text(email, xPos + 5, currentY + 8, { width: colWidths[1] - 10, ellipsis: true })

              xPos += colWidths[1]
              doc.rect(xPos, currentY, colWidths[2], rowHeight).fillAndStroke(bgColor, "#000")
              doc
                .fillColor("#000")
                .text(phone || "", xPos + 5, currentY + 8, { width: colWidths[2] - 10, ellipsis: true })

              xPos += colWidths[2]
              doc.rect(xPos, currentY, colWidths[3], rowHeight).fillAndStroke(bgColor, "#000")
              doc
                .fillColor("#000")
                .text(credential.event.name, xPos + 5, currentY + 8, { width: colWidths[3] - 10, ellipsis: true })

              xPos += colWidths[3]
              doc.rect(xPos, currentY, colWidths[4], rowHeight).fillAndStroke(bgColor, "#000")
              doc
                .fillColor("#000")
                .text(credential.eventUsername, xPos + 5, currentY + 8, { width: colWidths[4] - 10, ellipsis: true })

              xPos += colWidths[4]
              doc.rect(xPos, currentY, colWidths[5], rowHeight).fillAndStroke(bgColor, "#000")
              doc
                .fillColor("#000")
                .text(credential.eventPassword, xPos + 5, currentY + 8, { width: colWidths[5] - 10, ellipsis: true })

              currentY += rowHeight
              rowIndex++
            }
          }
        }

        doc.end()
      } catch (error) {
        console.error("PDF export error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/events/:eventId/event-credentials", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!
      const { eventId } = req.params

      if (user.role === "event_admin") {
        const isEventAdmin = await storage.isUserEventAdmin(user.id, eventId)
        if (!isEventAdmin) {
          return res.status(403).json({ message: "Not authorized for this event" })
        }
      } else if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" })
      }

      const credentials = await storage.getEventCredentialsByEvent(eventId)
      res.json(credentials)
    } catch (error) {
      console.error("Get event credentials error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get("/api/event-credentials/:credentialId/id-pass", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!
      const { credentialId } = req.params

      const credential = await storage.getEventCredential(credentialId)
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" })
      }

      const participant = await storage.getUserById(credential.participantUserId)
      const event = await storage.getEventById(credential.eventId)

      if (!participant || !event) {
        return res.status(404).json({ message: "Participant or event not found" })
      }

      if (user.role === "event_admin") {
        const isEventAdmin = await storage.isUserEventAdmin(user.id, event.id)
        if (!isEventAdmin) {
          return res.status(403).json({ message: "Not authorized for this event" })
        }
      } else if (user.role !== "super_admin" && user.role !== "registration_committee") {
        return res.status(403).json({ message: "Forbidden" })
      }

      const registration = await storage.getRegistrationByUserId(participant.id)
      const paymentStatus = registration?.paymentStatus || "pending"

      const doc = new PDFDocument({ 
        size: [400, 600],
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      })

      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename="id-pass-${participant.fullName.replace(/\s+/g, '-')}-${event.name.replace(/\s+/g, '-')}.pdf"`)

      doc.pipe(res)

      doc.rect(0, 0, 400, 600).fillAndStroke("#f8f9fa")

      doc.rect(0, 0, 400, 120).fillAndStroke("#4A5568")

      doc.fontSize(24).fillColor("#FFF").font("Helvetica-Bold")
      doc.text("SYMPOSIUM", 0, 30, { align: "center", width: 400 })
      doc.fontSize(12).font("Helvetica")
      doc.text("ID PASS", 0, 60, { align: "center", width: 400 })

      doc.fillColor("#000").fontSize(14).font("Helvetica-Bold")
      doc.text("Participant Details", 40, 140)

      doc.fontSize(10).font("Helvetica")
      let yPos = 165

      doc.fillColor("#4A5568").text("Name:", 40, yPos, { continued: true })
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${participant.fullName}`, { continued: false })
      yPos += 25

      doc.fillColor("#4A5568").font("Helvetica").text("Email:", 40, yPos, { continued: true })
      doc.fillColor("#000").text(` ${participant.email}`, { continued: false })
      yPos += 25

      doc.fillColor("#4A5568").text("Event:", 40, yPos, { continued: true })
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${event.name}`, { continued: false })
      yPos += 30

      doc.strokeColor("#E2E8F0").moveTo(40, yPos).lineTo(360, yPos).stroke()
      yPos += 20

      doc.fontSize(14).fillColor("#000").font("Helvetica-Bold")
      doc.text("Event Credentials", 40, yPos)
      yPos += 25

      doc.fontSize(11).font("Helvetica")
      doc.fillColor("#4A5568").text("Username:", 40, yPos, { continued: true })
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${credential.eventUsername}`, { continued: false })
      yPos += 25

      doc.fillColor("#4A5568").font("Helvetica").text("Password:", 40, yPos, { continued: true })
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${credential.eventPassword}`, { continued: false })
      yPos += 30

      doc.strokeColor("#E2E8F0").moveTo(40, yPos).lineTo(360, yPos).stroke()
      yPos += 20

      doc.fontSize(14).fillColor("#000").font("Helvetica-Bold")
      doc.text("Status", 40, yPos)
      yPos += 25

      const statusColor = paymentStatus === "paid" ? "#10B981" : paymentStatus === "pending" ? "#F59E0B" : "#EF4444"
      doc.fontSize(11).font("Helvetica")
      doc.fillColor("#4A5568").text("Payment:", 40, yPos, { continued: true })
      doc.fillColor(statusColor).font("Helvetica-Bold").text(` ${paymentStatus.toUpperCase()}`, { continued: false })
      yPos += 25

      doc.fillColor("#4A5568").font("Helvetica").text("Participant ID:", 40, yPos, { continued: true })
      doc.fillColor("#000").text(` ${credential.id.substring(0, 8).toUpperCase()}`, { continued: false })
      yPos += 35

      const qrData = JSON.stringify({
        participantId: participant.id,
        eventId: event.id,
        credentialId: credential.id,
        username: credential.eventUsername,
        status: paymentStatus
      })

      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 120,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        })

        const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64")
        doc.image(qrBuffer, 140, yPos, { width: 120, height: 120 })
        yPos += 130

        doc.fontSize(8).fillColor("#6B7280").font("Helvetica")
        doc.text("Scan for verification", 0, yPos, { align: "center", width: 400 })
      } catch (qrError) {
        console.error("QR code generation error:", qrError)
      }

      doc.fontSize(8).fillColor("#9CA3AF")
      doc.text(
        `Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`,
        0,
        560,
        { align: "center", width: 400 }
      )

      doc.end()
    } catch (error) {
      console.error("Generate ID Pass error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.patch(
    "/api/event-credentials/:credentialId/enable-test",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!
        const { credentialId } = req.params

        const credential = await storage.getEventCredential(credentialId)
        if (!credential) {
          return res.status(404).json({ message: "Event credential not found" })
        }

        if (user.role === "event_admin") {
          const isEventAdmin = await storage.isUserEventAdmin(user.id, credential.eventId)
          if (!isEventAdmin) {
            return res.status(403).json({ message: "Not authorized for this event" })
          }
        } else if (user.role !== "super_admin") {
          return res.status(403).json({ message: "Forbidden" })
        }

        const updatedCredential = await storage.updateEventCredentialTestStatus(credentialId, true, user.id)
        res.json(updatedCredential)
      } catch (error) {
        console.error("Enable test access error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.patch(
    "/api/event-credentials/:credentialId/disable-test",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const user = req.user!
        const { credentialId } = req.params

        const credential = await storage.getEventCredential(credentialId)
        if (!credential) {
          return res.status(404).json({ message: "Event credential not found" })
        }

        if (user.role === "event_admin") {
          const isEventAdmin = await storage.isUserEventAdmin(user.id, credential.eventId)
          if (!isEventAdmin) {
            return res.status(403).json({ message: "Not authorized for this event" })
          }
        } else if (user.role !== "super_admin") {
          return res.status(403).json({ message: "Forbidden" })
        }

        const updatedCredential = await storage.updateEventCredentialTestStatus(credentialId, false, user.id)
        res.json(updatedCredential)
      } catch (error) {
        console.error("Disable test access error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  app.get("/api/events/:eventId/credentials-status", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!
      const { eventId } = req.params

      if (user.role === "event_admin") {
        const isEventAdmin = await storage.isUserEventAdmin(user.id, eventId)
        if (!isEventAdmin) {
          return res.status(403).json({ message: "Not authorized for this event" })
        }
      } else if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" })
      }

      const credentialsWithParticipants = await storage.getEventCredentialsWithParticipants(eventId)

      const result = credentialsWithParticipants.map((cred) => ({
        id: cred.id,
        participantUserId: cred.participantUserId,
        eventUsername: cred.eventUsername,
        testEnabled: cred.testEnabled,
        enabledAt: cred.enabledAt,
        enabledBy: cred.enabledBy,
        participantFullName: cred.participant.fullName,
        participantEmail: cred.participant.email,
      }))

      res.json(result)
    } catch (error) {
      console.error("Get credentials status error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.get(
    "/api/reports/export/event/:eventId/excel",
    requireAuth,
    requireEventAdminOrSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { eventId } = req.params

        const event = await storage.getEvent(eventId)
        if (!event) {
          return res.status(404).json({ message: "Event not found" })
        }

        const rounds = await storage.getRoundsByEvent(eventId)
        const participants = await storage.getParticipantsByEvent(eventId)
        const leaderboard = await storage.getEventLeaderboard(eventId)

        const workbook = new ExcelJS.Workbook()

        const sheet1 = workbook.addWorksheet("Event Overview")
        sheet1.columns = [
          { header: "Metric", key: "metric", width: 30 },
          { header: "Value", key: "value", width: 40 },
        ]

        const completedAttempts = leaderboard.length
        const avgCompletionRate =
          participants.length > 0 ? ((completedAttempts / participants.length) * 100).toFixed(2) : "0"

        sheet1.addRows([
          { metric: "Event Name", value: event.name },
          { metric: "Event Type", value: event.type },
          { metric: "Event Status", value: event.status },
          { metric: "Total Participants", value: participants.length },
          { metric: "Total Rounds", value: rounds.length },
          { metric: "Average Completion Rate", value: `${avgCompletionRate}%` },
        ])

        sheet1.getRow(1).font = { bold: true }
        sheet1.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const sheet2 = workbook.addWorksheet("Round Details")
        sheet2.columns = [
          { header: "Round Name", key: "name", width: 20 },
          { header: "Duration (min)", key: "duration", width: 15 },
          { header: "Start Time", key: "startTime", width: 25 },
          { header: "End Time", key: "endTime", width: 25 },
          { header: "Participants Attempted", key: "attempted", width: 25 },
          { header: "Avg Score", key: "avgScore", width: 15 },
          { header: "Completion Rate", key: "completionRate", width: 20 },
        ]

        for (const round of rounds) {
          const roundLeaderboard = await storage.getRoundLeaderboard(round.id)
          const avgScore =
            roundLeaderboard.length > 0
              ? (roundLeaderboard.reduce((sum, r) => sum + (r.totalScore || 0), 0) / roundLeaderboard.length).toFixed(2)
              : "0"
          const completionRate =
            participants.length > 0 ? ((roundLeaderboard.length / participants.length) * 100).toFixed(2) : "0"

          sheet2.addRow({
            name: round.name,
            duration: round.duration,
            startTime: round.startTime ? new Date(round.startTime).toLocaleString() : "Not set",
            endTime: round.endTime ? new Date(round.endTime).toLocaleString() : "Not set",
            attempted: roundLeaderboard.length,
            avgScore: avgScore,
            completionRate: `${completionRate}%`,
          })
        }

        sheet2.getRow(1).font = { bold: true }
        sheet2.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const sheet3 = workbook.addWorksheet("Participant Scores")
        const columns: any[] = [
          { header: "Rank", key: "rank", width: 10 },
          { header: "Participant Name", key: "name", width: 30 },
          { header: "Email", key: "email", width: 30 },
        ]

        rounds.forEach((round, idx) => {
          columns.push({ header: `Round ${idx + 1} Score`, key: `round${idx + 1}`, width: 18 })
        })

        columns.push({ header: "Total Score", key: "totalScore", width: 15 })
        columns.push({ header: "Status", key: "status", width: 15 })

        sheet3.columns = columns

        for (const entry of leaderboard) {
          const user = await storage.getUser(entry.userId)
          const participant = participants.find((p) => p.userId === entry.userId)

          const rowData: any = {
            rank: entry.rank,
            name: entry.userName,
            email: user?.email || "N/A",
            totalScore: entry.totalScore || 0,
            status: participant?.status || "N/A",
          }

          for (let i = 0; i < rounds.length; i++) {
            const roundAttempt = await storage.getTestAttemptByUserAndRound(entry.userId, rounds[i].id)
            rowData[`round${i + 1}`] = roundAttempt?.totalScore || 0
          }

          sheet3.addRow(rowData)
        }

        sheet3.getRow(1).font = { bold: true }
        sheet3.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const sheet4 = workbook.addWorksheet("Leaderboard")
        sheet4.columns = [
          { header: "Rank", key: "rank", width: 10 },
          { header: "Name", key: "name", width: 30 },
          { header: "Total Score", key: "totalScore", width: 15 },
          { header: "Completion Time", key: "completionTime", width: 25 },
        ]

        leaderboard.forEach((entry) => {
          sheet4.addRow({
            rank: entry.rank,
            name: entry.userName,
            totalScore: entry.totalScore || 0,
            completionTime: entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : "N/A",
          })
        })

        sheet4.getRow(1).font = { bold: true }
        sheet4.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const fileName = `Event_Report_${event.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)

        await workbook.xlsx.write(res)
        res.end()
      } catch (error) {
        console.error("Export event Excel error:", error)
        res.status(500).json({ message: "Failed to generate Excel report" })
      }
    },
  )

  app.get(
    "/api/reports/export/event/:eventId/pdf",
    requireAuth,
    requireEventAdminOrSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { eventId } = req.params

        const event = await storage.getEvent(eventId)
        if (!event) {
          return res.status(404).json({ message: "Event not found" })
        }

        const rounds = await storage.getRoundsByEvent(eventId)
        const participants = await storage.getParticipantsByEvent(eventId)
        const leaderboard = await storage.getEventLeaderboard(eventId)

        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 })
        const fileName = `Event_Report_${event.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)

        doc.pipe(res)

        doc.fontSize(20).font("Helvetica-Bold").text(`Event Report: ${event.name}`, { align: "center" })
        doc.moveDown()

        doc.fontSize(14).font("Helvetica-Bold").text("Event Statistics", { underline: true })
        doc.moveDown(0.5)

        const completedAttempts = leaderboard.length
        const avgCompletionRate =
          participants.length > 0 ? ((completedAttempts / participants.length) * 100).toFixed(2) : "0"

        doc.fontSize(10).font("Helvetica")
        let y = doc.y
        const tableTop = y
        const col1X = 50
        const col2X = 300

        doc.rect(col1X, y, 250, 20).stroke()
        doc.rect(col2X, y, 250, 20).stroke()
        doc.font("Helvetica-Bold").text("Metric", col1X + 5, y + 5, { width: 240 })
        doc.text("Value", col2X + 5, y + 5, { width: 240 })
        y += 20

        const stats = [
          ["Event Type", event.type],
          ["Event Status", event.status],
          ["Total Participants", participants.length.toString()],
          ["Total Rounds", rounds.length.toString()],
          ["Completion Rate", `${avgCompletionRate}%`],
        ]

        doc.font("Helvetica")
        stats.forEach((stat, idx) => {
          const fillColor = idx % 2 === 0 ? "#f0f0f0" : "#ffffff"
          doc.rect(col1X, y, 250, 20).fillAndStroke(fillColor, "#000000")
          doc.rect(col2X, y, 250, 20).fillAndStroke(fillColor, "#000000")
          doc.fillColor("#000000").text(stat[0], col1X + 5, y + 5, { width: 240 })
          doc.text(stat[1], col2X + 5, y + 5, { width: 240 })
          y += 20
        })

        doc.addPage()
        doc.fontSize(14).font("Helvetica-Bold").text("Round Details", { underline: true })
        doc.moveDown(0.5)

        y = doc.y
        const headers = ["Round", "Duration", "Participants", "Avg Score", "Completion"]
        const colWidths = [120, 80, 100, 80, 100]
        let x = 50

        doc.fontSize(9).font("Helvetica-Bold")
        headers.forEach((header, i) => {
          doc.rect(x, y, colWidths[i], 20).stroke()
          doc.text(header, x + 5, y + 5, { width: colWidths[i] - 10 })
          x += colWidths[i]
        })
        y += 20

        doc.font("Helvetica")
        for (const round of rounds) {
          const roundLeaderboard = await storage.getRoundLeaderboard(round.id)
          const avgScore =
            roundLeaderboard.length > 0
              ? (roundLeaderboard.reduce((sum, r) => sum + (r.totalScore || 0), 0) / roundLeaderboard.length).toFixed(2)
              : "0"
          const completionRate =
            participants.length > 0 ? ((roundLeaderboard.length / participants.length) * 100).toFixed(2) : "0"

          x = 50
          const rowData = [
            round.name,
            `${round.duration} min`,
            roundLeaderboard.length.toString(),
            avgScore,
            `${completionRate}%`,
          ]

          rowData.forEach((data, i) => {
            doc.rect(x, y, colWidths[i], 20).stroke()
            doc.text(data, x + 5, y + 5, { width: colWidths[i] - 10 })
            x += colWidths[i]
          })
          y += 20

          if (y > 500) {
            doc.addPage()
            y = 50
          }
        }

        doc.addPage()
        doc.fontSize(14).font("Helvetica-Bold").text("Participant Scores", { underline: true })
        doc.moveDown(0.5)

        const participantScores = []
        for (const participant of participants) {
          const user = await storage.getUser(participant.userId)
          if (!user) continue

          const roundScores = []
          let totalScore = 0

          for (const round of rounds) {
            const attempt = await storage.getTestAttemptByUserAndRound(participant.userId, round.id)
            const score = attempt && attempt.status === "completed" ? attempt.totalScore || 0 : 0
            roundScores.push(score)
            totalScore += score
          }

          participantScores.push({
            name: user.fullName,
            email: user.email,
            roundScores,
            totalScore,
            status: participant.status,
          })
        }

        participantScores.sort((a, b) => b.totalScore - a.totalScore)

        y = doc.y
        const psHeaders = ["Rank", "Name", "Email"]
        rounds.forEach((round, idx) => {
          psHeaders.push(`R${idx + 1}`)
        })
        psHeaders.push("Total")
        psHeaders.push("Status")

        const psColWidths = [60, 150, 150]
        rounds.forEach(() => {
          psColWidths.push(80)
        })
        psColWidths.push(80)
        psColWidths.push(80)

        x = 50
        doc.fontSize(9).font("Helvetica-Bold")
        psHeaders.forEach((header, i) => {
          doc.rect(x, y, psColWidths[i], 20).fillAndStroke("#f0f0f0", "#000000")
          doc.fillColor("#000000").text(header, x + 5, y + 5, { width: psColWidths[i] - 10 })
          x += psColWidths[i]
        })
        y += 20

        doc.font("Helvetica")
        participantScores.slice(0, 50).forEach((entry, idx) => {
          x = 50
          const rank = idx + 1
          const rowData = [rank.toString(), entry.name, entry.email]

          entry.roundScores.forEach((score) => {
            rowData.push(score.toString())
          })

          rowData.push(entry.totalScore.toString())
          rowData.push(entry.status)

          const fillColor = idx % 2 === 0 ? "#ffffff" : "#f9f9f9"
          rowData.forEach((data, i) => {
            doc.rect(x, y, psColWidths[i], 20).fillAndStroke(fillColor, "#000000")
            doc.fillColor("#000000").text(data, x + 5, y + 5, { width: psColWidths[i] - 10 })
            x += psColWidths[i]
          })
          y += 20

          if (y > 500) {
            doc.addPage()
            y = 50
          }
        })

        doc.addPage()
        doc.fontSize(14).font("Helvetica-Bold").text("Leaderboard", { underline: true })
        doc.moveDown(0.5)

        y = doc.y
        const lbHeaders = ["Rank", "Name", "Total Score", "Completion Time"]
        const lbColWidths = [60, 200, 100, 150]
        x = 50

        doc.fontSize(9).font("Helvetica-Bold")
        lbHeaders.forEach((header, i) => {
          doc.rect(x, y, lbColWidths[i], 20).stroke()
          doc.text(header, x + 5, y + 5, { width: lbColWidths[i] - 10 })
          x += lbColWidths[i]
        })
        y += 20

        doc.font("Helvetica")
        leaderboard.slice(0, 20).forEach((entry) => {
          x = 50
          const rowData = [
            entry.rank.toString(),
            entry.userName,
            (entry.totalScore || 0).toString(),
            entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : "N/A",
          ]

          rowData.forEach((data, i) => {
            doc.rect(x, y, lbColWidths[i], 20).stroke()
            doc.text(data, x + 5, y + 5, { width: lbColWidths[i] - 10 })
            x += lbColWidths[i]
          })
          y += 20

          if (y > 500) {
            doc.addPage()
            y = 50
          }
        })

        doc.end()
      } catch (error) {
        console.error("Export event PDF error:", error)
        res.status(500).json({ message: "Failed to generate PDF report" })
      }
    },
  )

  app.get(
    "/api/reports/export/symposium/excel",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const events = await storage.getEvents()
        const allUsers = await storage.getUsers()
        const participants = allUsers.filter((u) => u.role === "participant")

        const workbook = new ExcelJS.Workbook()

        const sheet1 = workbook.addWorksheet("Symposium Overview")
        sheet1.columns = [
          { header: "Metric", key: "metric", width: 30 },
          { header: "Value", key: "value", width: 40 },
        ]

        let totalRounds = 0
        let totalCompletedAttempts = 0
        let totalParticipants = 0

        for (const event of events) {
          const rounds = await storage.getRoundsByEvent(event.id)
          const eventParticipants = await storage.getParticipantsByEvent(event.id)
          const leaderboard = await storage.getEventLeaderboard(event.id)

          totalRounds += rounds.length
          totalCompletedAttempts += leaderboard.length
          totalParticipants += eventParticipants.length
        }

        const overallCompletionRate =
          totalParticipants > 0 ? ((totalCompletedAttempts / totalParticipants) * 100).toFixed(2) : "0"

        sheet1.addRows([
          { metric: "Total Events", value: events.length },
          { metric: "Total Participants", value: participants.length },
          { metric: "Total Rounds", value: totalRounds },
          { metric: "Overall Completion Rate", value: `${overallCompletionRate}%` },
        ])

        sheet1.getRow(1).font = { bold: true }
        sheet1.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const sheet2 = workbook.addWorksheet("Event Summaries")
        sheet2.columns = [
          { header: "Event Name", key: "name", width: 30 },
          { header: "Type", key: "type", width: 15 },
          { header: "Participants", key: "participants", width: 15 },
          { header: "Rounds", key: "rounds", width: 15 },
          { header: "Avg Score", key: "avgScore", width: 15 },
          { header: "Completion Rate", key: "completionRate", width: 20 },
        ]

        for (const event of events) {
          const rounds = await storage.getRoundsByEvent(event.id)
          const eventParticipants = await storage.getParticipantsByEvent(event.id)
          const leaderboard = await storage.getEventLeaderboard(event.id)

          const avgScore =
            leaderboard.length > 0
              ? (leaderboard.reduce((sum, e) => sum + (e.totalScore || 0), 0) / leaderboard.length).toFixed(2)
              : "0"
          const completionRate =
            eventParticipants.length > 0 ? ((leaderboard.length / eventParticipants.length) * 100).toFixed(2) : "0"

          sheet2.addRow({
            name: event.name,
            type: event.type,
            participants: eventParticipants.length,
            rounds: rounds.length,
            avgScore: avgScore,
            completionRate: `${completionRate}%`,
          })
        }

        sheet2.getRow(1).font = { bold: true }
        sheet2.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const sheet3 = workbook.addWorksheet("Top Performers")
        sheet3.columns = [
          { header: "Rank", key: "rank", width: 10 },
          { header: "Name", key: "name", width: 30 },
          { header: "Total Score", key: "totalScore", width: 15 },
          { header: "Events Participated", key: "eventsCount", width: 20 },
        ]

        const userScores = new Map<string, { name: string; totalScore: number; eventsCount: number }>()

        for (const event of events) {
          const leaderboard = await storage.getEventLeaderboard(event.id)

          for (const entry of leaderboard) {
            const existing = userScores.get(entry.userId)
            if (existing) {
              existing.totalScore += entry.totalScore || 0
              existing.eventsCount += 1
            } else {
              userScores.set(entry.userId, {
                name: entry.userName,
                totalScore: entry.totalScore || 0,
                eventsCount: 1,
              })
            }
          }
        }

        const topPerformers = Array.from(userScores.values())
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 20)

        topPerformers.forEach((performer, index) => {
          sheet3.addRow({
            rank: index + 1,
            name: performer.name,
            totalScore: performer.totalScore,
            eventsCount: performer.eventsCount,
          })
        })

        sheet3.getRow(1).font = { bold: true }
        sheet3.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

        const fileName = `Symposium_Report_${new Date().toISOString().split("T")[0]}.xlsx`

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)

        await workbook.xlsx.write(res)
        res.end()
      } catch (error) {
        console.error("Export symposium Excel error:", error)
        res.status(500).json({ message: "Failed to generate Symposium Excel report" })
      }
    },
  )

  app.get(
    "/api/reports/export/symposium/pdf",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const events = await storage.getEvents()
        const allUsers = await storage.getUsers()
        const participants = allUsers.filter((u) => u.role === "participant")

        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 })
        const fileName = `Symposium_Report_${new Date().toISOString().split("T")[0]}.pdf`

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)

        doc.pipe(res)

        doc.fontSize(20).font("Helvetica-Bold").text("Symposium-wide Report", { align: "center" })
        doc.moveDown()

        doc.fontSize(14).font("Helvetica-Bold").text("Symposium Overview", { underline: true })
        doc.moveDown(0.5)

        let totalRounds = 0
        let totalCompletedAttempts = 0
        let totalParticipants = 0

        for (const event of events) {
          const rounds = await storage.getRoundsByEvent(event.id)
          const eventParticipants = await storage.getParticipantsByEvent(event.id)
          const leaderboard = await storage.getEventLeaderboard(event.id)

          totalRounds += rounds.length
          totalCompletedAttempts += leaderboard.length
          totalParticipants += eventParticipants.length
        }

        const overallCompletionRate =
          totalParticipants > 0 ? ((totalCompletedAttempts / totalParticipants) * 100).toFixed(2) : "0"

        doc.fontSize(10).font("Helvetica")
        let y = doc.y
        const col1X = 50
        const col2X = 300

        doc.rect(col1X, y, 250, 20).stroke()
        doc.rect(col2X, y, 250, 20).stroke()
        doc.font("Helvetica-Bold").text("Metric", col1X + 5, y + 5, { width: 240 })
        doc.text("Value", col2X + 5, y + 5, { width: 240 })
        y += 20

        const stats = [
          ["Total Events", events.length.toString()],
          ["Total Participants", participants.length.toString()],
          ["Total Rounds", totalRounds.toString()],
          ["Overall Completion Rate", `${overallCompletionRate}%`],
        ]

        doc.font("Helvetica")
        stats.forEach((stat, idx) => {
          const fillColor = idx % 2 === 0 ? "#f0f0f0" : "#ffffff"
          doc.rect(col1X, y, 250, 20).fillAndStroke(fillColor, "#000000")
          doc.rect(col2X, y, 250, 20).fillAndStroke(fillColor, "#000000")
          doc.fillColor("#000000").text(stat[0], col1X + 5, y + 5, { width: 240 })
          doc.text(stat[1], col2X + 5, y + 5, { width: 240 })
          y += 20
        })

        doc.addPage()
        doc.fontSize(14).font("Helvetica-Bold").text("Event Summaries", { underline: true })
        doc.moveDown(0.5)

        y = doc.y
        const headers = ["Event", "Type", "Participants", "Rounds", "Completion"]
        const colWidths = [150, 80, 100, 70, 110]
        let x = 50

        doc.fontSize(9).font("Helvetica-Bold")
        headers.forEach((header, i) => {
          doc.rect(x, y, colWidths[i], 20).stroke()
          doc.text(header, x + 5, y + 5, { width: colWidths[i] - 10 })
          x += colWidths[i]
        })
        y += 20

        doc.font("Helvetica")
        for (const event of events) {
          const rounds = await storage.getRoundsByEvent(event.id)
          const eventParticipants = await storage.getParticipantsByEvent(event.id)
          const leaderboard = await storage.getEventLeaderboard(event.id)

          const completionRate =
            eventParticipants.length > 0 ? ((leaderboard.length / eventParticipants.length) * 100).toFixed(2) : "0"

          x = 50
          const rowData = [
            event.name,
            event.type,
            eventParticipants.length.toString(),
            rounds.length.toString(),
            `${completionRate}%`,
          ]

          rowData.forEach((data, i) => {
            doc.rect(x, y, colWidths[i], 20).stroke()
            doc.text(data, x + 5, y + 5, { width: colWidths[i] - 10 })
            x += colWidths[i]
          })
          y += 20

          if (y > 500) {
            doc.addPage()
            y = 50
          }
        }

        doc.addPage()
        doc.fontSize(14).font("Helvetica-Bold").text("Top Performers", { underline: true })
        doc.moveDown(0.5)

        const userScores = new Map<string, { name: string; totalScore: number; eventsCount: number }>()

        for (const event of events) {
          const leaderboard = await storage.getEventLeaderboard(event.id)

          for (const entry of leaderboard) {
            const existing = userScores.get(entry.userId)
            if (existing) {
              existing.totalScore += entry.totalScore || 0
              existing.eventsCount += 1
            } else {
              userScores.set(entry.userId, {
                name: entry.userName,
                totalScore: entry.totalScore || 0,
                eventsCount: 1,
              })
            }
          }
        }

        const topPerformers = Array.from(userScores.values())
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 20)

        y = doc.y
        const tpHeaders = ["Rank", "Name", "Total Score", "Events"]
        const tpColWidths = [60, 200, 120, 100]
        x = 50

        doc.fontSize(9).font("Helvetica-Bold")
        tpHeaders.forEach((header, i) => {
          doc.rect(x, y, tpColWidths[i], 20).stroke()
          doc.text(header, x + 5, y + 5, { width: tpColWidths[i] - 10 })
          x += tpColWidths[i]
        })
        y += 20

        doc.font("Helvetica")
        topPerformers.forEach((performer, index) => {
          x = 50
          const rowData = [
            (index + 1).toString(),
            performer.name,
            performer.totalScore.toString(),
            performer.eventsCount.toString(),
          ]

          rowData.forEach((data, i) => {
            doc.rect(x, y, tpColWidths[i], 20).stroke()
            doc.text(data, x + 5, y + 5, { width: tpColWidths[i] - 10 })
            x += tpColWidths[i]
          })
          y += 20

          if (y > 500) {
            doc.addPage()
            y = 50
          }
        })

        doc.end()
      } catch (error) {
        console.error("Export symposium PDF error:", error)
        res.status(500).json({ message: "Failed to generate Symposium PDF report" })
      }
    },
  )

  // ==================== Super Admin Override Routes ====================

  // PUT /api/super-admin/events/:eventId/override - Update any event
  app.put(
    "/api/super-admin/events/:eventId/override",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { eventId } = req.params
        const { name, description, type, category, status, reason } = req.body
        const user = req.user!
        const ipAddress = getClientIp(req)

        // Get existing event
        const existingEvent = await storage.getEvent(eventId)
        if (!existingEvent) {
          return res.status(404).json({ message: "Event not found" })
        }

        // Prepare update data
        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (type !== undefined) updateData.type = type
        if (category !== undefined) updateData.category = category
        if (status !== undefined) updateData.status = status

        // Store before/after values
        const before = {
          name: existingEvent.name,
          description: existingEvent.description,
          type: existingEvent.type,
          category: existingEvent.category,
          status: existingEvent.status,
        }

        // Update event
        const updatedEvent = await storage.updateEvent(eventId, updateData)
        if (!updatedEvent) {
          return res.status(500).json({ message: "Failed to update event" })
        }

        const after = {
          name: updatedEvent.name,
          description: updatedEvent.description,
          type: updatedEvent.type,
          category: updatedEvent.category,
          status: updatedEvent.status,
        }

        // Log audit entry
        await logSuperAdminAction(
          user.id,
          user.username,
          "override_event",
          "event",
          eventId,
          updatedEvent.name,
          { before, after },
          reason || null,
          ipAddress,
        )

        // Notify via WebSocket
        WebSocketService.notifyOverrideAction("override_event", "event", eventId, { before, after })

        res.json(updatedEvent)
      } catch (error) {
        console.error("Override event error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  // DELETE /api/super-admin/events/:eventId/override - Delete any event
  app.delete(
    "/api/super-admin/events/:eventId/override",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { eventId } = req.params
        const { reason } = req.body
        const user = req.user!
        const ipAddress = getClientIp(req)

        // Get existing event details
        const existingEvent = await storage.getEvent(eventId)
        if (!existingEvent) {
          return res.status(404).json({ message: "Event not found" })
        }

        // Delete event
        await storage.deleteEvent(eventId)

        // Log audit entry
        await logSuperAdminAction(
          user.id,
          user.username,
          "delete_event",
          "event",
          eventId,
          existingEvent.name,
          null,
          reason || null,
          ipAddress,
        )

        // Notify via WebSocket
        WebSocketService.notifyOverrideAction("delete_event", "event", eventId, { eventName: existingEvent.name })

        res.status(204).send()
      } catch (error) {
        console.error("Delete event override error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  // PUT /api/super-admin/questions/:questionId/override - Update any question
  app.put(
    "/api/super-admin/questions/:questionId/override",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { questionId } = req.params
        const { questionText, points, correctAnswer, options, expectedOutput, testCases, reason, ...otherFields } =
          req.body
        const user = req.user!
        const ipAddress = getClientIp(req)

        // Get existing question
        const existingQuestion = await storage.getQuestion(questionId)
        if (!existingQuestion) {
          return res.status(404).json({ message: "Question not found" })
        }

        // Get round and event info for context
        const round = await storage.getRound(existingQuestion.roundId)
        const event = round ? await storage.getEvent(round.eventId) : null
        const targetName = `${event?.name || "Unknown Event"} - ${round?.name || "Unknown Round"} - Q${existingQuestion.questionNumber}`

        // Prepare update data
        const updateData: any = { ...otherFields }
        if (questionText !== undefined) updateData.questionText = questionText
        if (points !== undefined) updateData.points = points
        if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer
        if (options !== undefined) updateData.options = options
        if (expectedOutput !== undefined) updateData.expectedOutput = expectedOutput
        if (testCases !== undefined) updateData.testCases = testCases

        // Store before/after values
        const before = {
          questionText: existingQuestion.questionText,
          points: existingQuestion.points,
          correctAnswer: existingQuestion.correctAnswer,
          options: existingQuestion.options,
          expectedOutput: existingQuestion.expectedOutput,
          testCases: existingQuestion.testCases,
        }

        // Update question
        const updatedQuestion = await storage.updateQuestion(questionId, updateData)
        if (!updatedQuestion) {
          return res.status(500).json({ message: "Failed to update question" })
        }

        const after = {
          questionText: updatedQuestion.questionText,
          points: updatedQuestion.points,
          correctAnswer: updatedQuestion.correctAnswer,
          options: updatedQuestion.options,
          expectedOutput: updatedQuestion.expectedOutput,
          testCases: updatedQuestion.testCases,
        }

        // Log audit entry
        await logSuperAdminAction(
          user.id,
          user.username,
          "override_question",
          "question",
          questionId,
          targetName,
          { before, after },
          reason || null,
          ipAddress,
        )

        // Notify via WebSocket
        WebSocketService.notifyOverrideAction("override_question", "question", questionId, { before, after })

        res.json(updatedQuestion)
      } catch (error) {
        console.error("Override question error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  // DELETE /api/super-admin/questions/:questionId/override - Delete any question
  app.delete(
    "/api/super-admin/questions/:questionId/override",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { questionId } = req.params
        const { reason } = req.body
        const user = req.user!
        const ipAddress = getClientIp(req)

        // Get existing question details
        const existingQuestion = await storage.getQuestion(questionId)
        if (!existingQuestion) {
          return res.status(404).json({ message: "Question not found" })
        }

        // Delete question
        await storage.deleteQuestion(questionId)

        // Log audit entry
        await logSuperAdminAction(
          user.id,
          user.username,
          "delete_question",
          "question",
          questionId,
          existingQuestion.questionText,
          null,
          reason || null,
          ipAddress,
        )

        // Notify via WebSocket
        WebSocketService.notifyOverrideAction("delete_question", "question", questionId, {
          questionText: existingQuestion.questionText,
        })

        res.status(204).send()
      } catch (error) {
        console.error("Delete question override error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  // PUT /api/super-admin/rounds/:roundId/override - Override round settings
  app.put(
    "/api/super-admin/rounds/:roundId/override",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { roundId } = req.params
        const { duration, startTime, endTime, status, reason } = req.body
        const user = req.user!
        const ipAddress = getClientIp(req)

        // Get existing round
        const existingRound = await storage.getRound(roundId)
        if (!existingRound) {
          return res.status(404).json({ message: "Round not found" })
        }

        // Get event info for context
        const event = await storage.getEvent(existingRound.eventId)
        const targetName = `${event?.name || "Unknown Event"} - ${existingRound.name}`

        // Prepare update data
        const updateData: any = {}
        if (duration !== undefined) updateData.duration = duration
        if (startTime !== undefined) updateData.startTime = startTime
        if (endTime !== undefined) updateData.endTime = endTime
        if (status !== undefined) updateData.status = status

        // Store before/after values
        const before = {
          duration: existingRound.duration,
          startTime: existingRound.startTime,
          endTime: existingRound.endTime,
          status: existingRound.status,
        }

        // Update round
        const updatedRound = await storage.updateRound(roundId, updateData)
        if (!updatedRound) {
          return res.status(500).json({ message: "Failed to update round" })
        }

        const after = {
          duration: updatedRound.duration,
          startTime: updatedRound.startTime,
          endTime: updatedRound.endTime,
          status: updatedRound.status,
        }

        // Log audit entry
        await logSuperAdminAction(
          user.id,
          user.username,
          "override_round",
          "round",
          roundId,
          targetName,
          { before, after },
          reason || null,
          ipAddress,
        )

        // Notify via WebSocket
        WebSocketService.notifyOverrideAction("override_round", "round", roundId, { before, after })

        res.json(updatedRound)
      } catch (error) {
        console.error("Override round error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  // GET /api/super-admin/audit-logs - Retrieve audit logs with filters
  app.get("/api/super-admin/audit-logs", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { adminId, targetType, startDate, endDate } = req.query

      const filters: any = {}
      if (adminId) filters.adminId = adminId as string
      if (targetType) filters.targetType = targetType as string
      if (startDate) filters.startDate = new Date(startDate as string)
      if (endDate) filters.endDate = new Date(endDate as string)

      const logs = await storage.getAuditLogs(filters)
      res.json(logs)
    } catch (error) {
      console.error("Get audit logs error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  // GET /api/super-admin/audit-logs/target/:targetType/:targetId - Get audit history for a specific resource
  app.get(
    "/api/super-admin/audit-logs/target/:targetType/:targetId",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { targetType, targetId } = req.params

        const logs = await storage.getAuditLogsByTarget(targetType, targetId)
        res.json(logs)
      } catch (error) {
        console.error("Get audit logs by target error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  // GET /api/email-logs - Retrieve email logs with filters (Super Admin only)
  app.get("/api/email-logs", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { status, templateType, startDate, endDate } = req.query

      const filters: any = {}
      if (status) filters.status = status as string
      if (templateType) filters.templateType = templateType as string
      if (startDate) filters.startDate = new Date(startDate as string)
      if (endDate) filters.endDate = new Date(endDate as string)

      const logs = await storage.getEmailLogs(filters)
      res.json(logs)
    } catch (error) {
      console.error("Get email logs error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  // GET /api/email-logs/recipient/:email - Get email logs for a specific recipient
  app.get(
    "/api/email-logs/recipient/:email",
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const { email } = req.params

        const logs = await storage.getEmailLogsByRecipient(email)
        res.json(logs)
      } catch (error) {
        console.error("Get email logs by recipient error:", error)
        res.status(500).json({ message: "Internal server error" })
      }
    },
  )

  // POST /api/test-email - Send a test email
  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      const { to, name } = req.body

      if (!to || !name) {
        return res.status(400).json({ message: "Email address and name are required" })
      }

      const result = await emailService.sendRegistrationApproved(
        to,
        name,
        "BootFeet 2K26 Test Event",
        "test-user-001",
        "testpass123"
      )

      if (result.success) {
        res.json({
          success: true,
          message: "Test email sent successfully",
          messageId: result.messageId
        })
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send test email",
          error: result.error
        })
      }
    } catch (error) {
      console.error("Test email error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  const httpServer = createServer(app)

  return httpServer
}
