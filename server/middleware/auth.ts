import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "symposium-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    eventId?: string;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string; eventId?: string };
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      eventId: decoded.eventId
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super Admin access required" });
  }

  next();
}

export function requireEventAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "event_admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Event Admin access required" });
  }

  next();
}

export function requireParticipant(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "participant") {
    return res.status(403).json({ message: "Participant access required" });
  }

  next();
}

export function requireRegistrationCommittee(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "registration_committee" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Registration Committee access required" });
  }

  next();
}

export async function requireEventAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role === "super_admin") {
    return next();
  }

  const eventId = req.params.eventId || req.params.id;
  if (!eventId) {
    return res.status(400).json({ message: "Event ID is required" });
  }

  if (req.user.role === "event_admin") {
    const admins = await storage.getEventAdminsByEvent(eventId);
    const isAssigned = admins.some(admin => admin.id === req.user!.id);
    
    if (!isAssigned) {
      return res.status(403).json({ message: "You are not assigned to this event" });
    }
    
    return next();
  }

  if (req.user.role === "participant") {
    const participant = await storage.getParticipantByUserAndEvent(req.user.id, eventId);
    
    if (!participant) {
      return res.status(403).json({ message: "You are not registered for this event" });
    }
    
    return next();
  }

  return res.status(403).json({ message: "Access denied" });
}

export async function requireRoundAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role === "super_admin") {
    return next();
  }

  const roundId = req.params.roundId;
  if (!roundId) {
    return res.status(400).json({ message: "Round ID is required" });
  }

  const round = await storage.getRound(roundId);
  if (!round) {
    return res.status(404).json({ message: "Round not found" });
  }

  if (req.user.role === "event_admin") {
    const admins = await storage.getEventAdminsByEvent(round.eventId);
    const isAssigned = admins.some(admin => admin.id === req.user!.id);
    
    if (!isAssigned) {
      return res.status(403).json({ message: "You are not assigned to this event" });
    }
    
    return next();
  }

  return res.status(403).json({ message: "Access denied" });
}

export async function requireEventAdminOrSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role === "super_admin") {
    return next();
  }

  const eventId = req.params.eventId;
  if (!eventId) {
    return res.status(400).json({ message: "Event ID is required" });
  }

  if (req.user.role === "event_admin") {
    const admins = await storage.getEventAdminsByEvent(eventId);
    const isAssigned = admins.some(admin => admin.id === req.user!.id);
    
    if (!isAssigned) {
      return res.status(403).json({ message: "You are not assigned to this event" });
    }
    
    return next();
  }

  return res.status(403).json({ message: "Access denied" });
}
