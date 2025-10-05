var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { eq, and, desc, asc, sql as sql3, gte, lte } from "drizzle-orm";

// server/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  answers: () => answers,
  auditLogs: () => auditLogs,
  auditLogsRelations: () => auditLogsRelations,
  emailLogs: () => emailLogs,
  eventAdmins: () => eventAdmins,
  eventCredentials: () => eventCredentials,
  eventRules: () => eventRules,
  events: () => events,
  insertAnswerSchema: () => insertAnswerSchema,
  insertAuditLogSchema: () => insertAuditLogSchema,
  insertEmailLogSchema: () => insertEmailLogSchema,
  insertEventCredentialSchema: () => insertEventCredentialSchema,
  insertEventRulesSchema: () => insertEventRulesSchema,
  insertEventSchema: () => insertEventSchema,
  insertParticipantSchema: () => insertParticipantSchema,
  insertQuestionSchema: () => insertQuestionSchema,
  insertRegistrationFormSchema: () => insertRegistrationFormSchema,
  insertRegistrationSchema: () => insertRegistrationSchema,
  insertReportSchema: () => insertReportSchema,
  insertRoundRulesSchema: () => insertRoundRulesSchema,
  insertRoundSchema: () => insertRoundSchema,
  insertTestAttemptSchema: () => insertTestAttemptSchema,
  insertUserSchema: () => insertUserSchema,
  participants: () => participants,
  questions: () => questions,
  registrationForms: () => registrationForms,
  registrations: () => registrations,
  reports: () => reports,
  roundRules: () => roundRules,
  rounds: () => rounds,
  testAttempts: () => testAttempts,
  users: () => users
});
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: varchar("role", { enum: ["super_admin", "event_admin", "participant", "registration_committee"] }).notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  // quiz, coding, general, etc.
  category: varchar("category", { enum: ["technical", "non_technical"] }).notNull().default("technical"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("draft"),
  // draft, active, completed
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var eventAdmins = pgTable("event_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  adminId: varchar("admin_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull()
});
var eventRules = pgTable("event_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull().unique(),
  noRefresh: boolean("no_refresh").notNull().default(true),
  noTabSwitch: boolean("no_tab_switch").notNull().default(true),
  forceFullscreen: boolean("force_fullscreen").notNull().default(true),
  disableShortcuts: boolean("disable_shortcuts").notNull().default(true),
  autoSubmitOnViolation: boolean("auto_submit_on_violation").notNull().default(true),
  maxTabSwitchWarnings: integer("max_tab_switch_warnings").notNull().default(2),
  additionalRules: text("additional_rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var rounds = pgTable("rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  // Round 1, Round 2, etc.
  description: text("description"),
  roundNumber: integer("round_number").notNull(),
  duration: integer("duration").notNull(),
  // in minutes
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("not_started"),
  // not_started, in_progress, completed
  startedAt: timestamp("started_at"),
  // When admin starts the round
  endedAt: timestamp("ended_at"),
  // When admin ends the round
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var roundRules = pgTable("round_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id, { onDelete: "cascade" }).notNull().unique(),
  noRefresh: boolean("no_refresh").notNull().default(true),
  noTabSwitch: boolean("no_tab_switch").notNull().default(true),
  forceFullscreen: boolean("force_fullscreen").notNull().default(true),
  disableShortcuts: boolean("disable_shortcuts").notNull().default(true),
  autoSubmitOnViolation: boolean("auto_submit_on_violation").notNull().default(true),
  maxTabSwitchWarnings: integer("max_tab_switch_warnings").notNull().default(2),
  additionalRules: text("additional_rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id, { onDelete: "cascade" }).notNull(),
  questionType: text("question_type").notNull(),
  // multiple_choice, coding, descriptive
  questionText: text("question_text").notNull(),
  questionNumber: integer("question_number").notNull(),
  points: integer("points").notNull().default(1),
  // For multiple choice questions
  options: jsonb("options"),
  // Array of options
  correctAnswer: text("correct_answer"),
  // For multiple choice
  // For coding/descriptive questions
  expectedOutput: text("expected_output"),
  testCases: jsonb("test_cases"),
  // For coding questions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
  status: text("status").notNull().default("registered")
  // registered, completed, disqualified
});
var testAttempts = pgTable("test_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  status: text("status").notNull().default("in_progress"),
  // in_progress, completed, auto_submitted
  // Proctoring violations
  tabSwitchCount: integer("tab_switch_count").notNull().default(0),
  refreshAttemptCount: integer("refresh_attempt_count").notNull().default(0),
  violationLogs: jsonb("violation_logs"),
  // Array of violation timestamps and types
  // Scoring
  totalScore: integer("total_score").default(0),
  maxScore: integer("max_score"),
  completedAt: timestamp("completed_at")
});
var answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").references(() => testAttempts.id, { onDelete: "cascade" }).notNull(),
  questionId: varchar("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct"),
  pointsAwarded: integer("points_awarded").default(0),
  answeredAt: timestamp("answered_at").defaultNow().notNull()
});
var reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(),
  // event_wise, symposium_wide
  title: text("title").notNull(),
  generatedBy: varchar("generated_by").references(() => users.id, { onDelete: "set null" }),
  reportData: jsonb("report_data").notNull(),
  // JSON data for the report
  fileUrl: text("file_url"),
  // URL to the generated PDF/Excel file
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var registrationForms = pgTable("registration_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  formSlug: varchar("form_slug").unique().notNull(),
  formFields: jsonb("form_fields").notNull().$type(),
  allowedCategories: jsonb("allowed_categories").notNull().default(sql`'["technical", "non_technical"]'::jsonb`).$type(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").references(() => registrationForms.id, { onDelete: "cascade" }).notNull(),
  submittedData: jsonb("submitted_data").notNull().$type(),
  selectedEvents: jsonb("selected_events").notNull().$type(),
  paymentStatus: varchar("payment_status", { enum: ["pending", "paid", "declined"] }).default("pending").notNull(),
  participantUserId: varchar("participant_user_id").references(() => users.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => users.id, { onDelete: "set null" })
});
var eventCredentials = pgTable("event_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantUserId: varchar("participant_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  eventUsername: varchar("event_username").unique().notNull(),
  eventPassword: varchar("event_password").notNull(),
  testEnabled: boolean("test_enabled").notNull().default(false),
  enabledAt: timestamp("enabled_at"),
  enabledBy: varchar("enabled_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  adminUsername: text("admin_username").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  targetName: text("target_name"),
  changes: jsonb("changes"),
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: text("ip_address")
});
var emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  templateType: text("template_type").notNull(),
  status: text("status").notNull().default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  metadata: jsonb("metadata")
});
var auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [auditLogs.adminId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertEventRulesSchema = createInsertSchema(eventRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRoundRulesSchema = createInsertSchema(roundRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  registeredAt: true
});
var insertTestAttemptSchema = createInsertSchema(testAttempts).omit({
  id: true,
  startedAt: true,
  completedAt: true
});
var insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  answeredAt: true
});
var insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true
});
var insertRegistrationFormSchema = createInsertSchema(registrationForms).omit({
  id: true,
  createdAt: true
});
var insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  submittedAt: true,
  processedAt: true
});
var insertEventCredentialSchema = createInsertSchema(eventCredentials).omit({
  id: true,
  createdAt: true
});
var insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true
});
var insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true
});

// server/db.ts
import "dotenv/config";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Ensure the database is provisioned.");
}
var sql2 = neon(process.env.DATABASE_URL);
var db = drizzle(sql2, { schema: schema_exports });

// server/storage.ts
var DatabaseStorage = class {
  async getUsers() {
    return await db.select().from(users);
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    const [user] = result;
    return user;
  }
  async updateUserCredentials(userId, updates) {
    if (updates.username) {
      const existingUser = await this.getUserByUsername(updates.username);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("Username already exists");
      }
    }
    if (updates.email) {
      const existingUser = await this.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("Email already exists");
      }
    }
    const updateData = {};
    if (updates.username !== void 0) updateData.username = updates.username;
    if (updates.email !== void 0) updateData.email = updates.email;
    if (updates.password !== void 0) updateData.password = updates.password;
    const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
    return user;
  }
  async deleteUser(userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
  async getOrphanedEventAdmins() {
    const adminsWithAssignments = await db.select({ adminId: eventAdmins.adminId }).from(eventAdmins).groupBy(eventAdmins.adminId);
    const assignedAdminIds = new Set(adminsWithAssignments.map((a) => a.adminId));
    const allEventAdmins = await db.select().from(users).where(eq(users.role, "event_admin"));
    return allEventAdmins.filter((admin) => !assignedAdminIds.has(admin.id));
  }
  async getEvents() {
    return await db.select().from(events);
  }
  async getEvent(id) {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }
  async getEventByName(name) {
    const [event] = await db.select().from(events).where(eq(events.name, name));
    return event;
  }
  async getEventsByCreator(creatorId) {
    return await db.select().from(events).where(eq(events.createdBy, creatorId));
  }
  async getEventsByAdmin(adminId) {
    const result = await db.select({ event: events }).from(eventAdmins).innerJoin(events, eq(eventAdmins.eventId, events.id)).where(eq(eventAdmins.adminId, adminId));
    return result.map((r) => r.event);
  }
  async getEventsWithoutAdmins() {
    const eventsWithAdmins = await db.select({ eventId: eventAdmins.eventId }).from(eventAdmins).groupBy(eventAdmins.eventId);
    const assignedEventIds = new Set(eventsWithAdmins.map((e) => e.eventId));
    const allEvents = await db.select().from(events);
    return allEvents.filter((event) => !assignedEventIds.has(event.id));
  }
  async createEvent(insertEvent) {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }
  async updateEvent(id, updateData) {
    const [event] = await db.update(events).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(events.id, id)).returning();
    return event;
  }
  async deleteEvent(id) {
    await db.delete(events).where(eq(events.id, id));
  }
  async getEventAdminsByEvent(eventId) {
    const result = await db.select({ user: users }).from(eventAdmins).innerJoin(users, eq(eventAdmins.adminId, users.id)).where(eq(eventAdmins.eventId, eventId));
    return result.map((r) => r.user);
  }
  async assignEventAdmin(eventId, adminId) {
    await db.insert(eventAdmins).values({ eventId, adminId });
  }
  async removeEventAdmin(eventId, adminId) {
    await db.delete(eventAdmins).where(and(eq(eventAdmins.eventId, eventId), eq(eventAdmins.adminId, adminId)));
  }
  async getEventRules(eventId) {
    const [rules] = await db.select().from(eventRules).where(eq(eventRules.eventId, eventId));
    return rules;
  }
  async createEventRules(insertRules) {
    const [rules] = await db.insert(eventRules).values(insertRules).returning();
    return rules;
  }
  async updateEventRules(eventId, updateData) {
    const [rules] = await db.update(eventRules).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(eventRules.eventId, eventId)).returning();
    return rules;
  }
  async getRoundsByEvent(eventId) {
    return await db.select().from(rounds).where(eq(rounds.eventId, eventId));
  }
  async getRound(id) {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
    return round;
  }
  async createRound(insertRound) {
    const [round] = await db.insert(rounds).values(insertRound).returning();
    return round;
  }
  async updateRound(id, updateData) {
    const [round] = await db.update(rounds).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(rounds.id, id)).returning();
    return round;
  }
  async updateRoundStatus(roundId, status, timestamp2) {
    if (status === "in_progress") {
      const [round] = await db.update(rounds).set({
        status: "in_progress",
        startedAt: timestamp2 || /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(rounds.id, roundId)).returning();
      return round;
    } else if (status === "completed") {
      const [round] = await db.update(rounds).set({
        status: "completed",
        endedAt: timestamp2 || /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(rounds.id, roundId)).returning();
      return round;
    } else if (status === "not_started") {
      const [round] = await db.update(rounds).set({
        status: "not_started",
        startedAt: null,
        endedAt: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(rounds.id, roundId)).returning();
      return round;
    }
    return void 0;
  }
  async deleteRound(id) {
    await db.delete(rounds).where(eq(rounds.id, id));
  }
  async getRoundRules(roundId) {
    const [rules] = await db.select().from(roundRules).where(eq(roundRules.roundId, roundId));
    return rules;
  }
  async createRoundRules(insertRules) {
    const [rules] = await db.insert(roundRules).values(insertRules).returning();
    return rules;
  }
  async updateRoundRules(roundId, updateData) {
    const [rules] = await db.update(roundRules).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(roundRules.roundId, roundId)).returning();
    return rules;
  }
  async getQuestionsByRound(roundId) {
    return await db.select().from(questions).where(eq(questions.roundId, roundId));
  }
  async getQuestion(id) {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }
  async createQuestion(insertQuestion) {
    const [question] = await db.insert(questions).values(insertQuestion).returning();
    return question;
  }
  async updateQuestion(id, updateData) {
    const [question] = await db.update(questions).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(questions.id, id)).returning();
    return question;
  }
  async deleteQuestion(id) {
    await db.delete(questions).where(eq(questions.id, id));
  }
  async getParticipantsByEvent(eventId) {
    return await db.select().from(participants).where(eq(participants.eventId, eventId));
  }
  async getParticipantsByUser(userId) {
    return await db.select().from(participants).where(eq(participants.userId, userId));
  }
  async registerParticipant(insertParticipant) {
    const [participant] = await db.insert(participants).values(insertParticipant).returning();
    return participant;
  }
  async getParticipantByUserAndEvent(userId, eventId) {
    const [participant] = await db.select().from(participants).where(and(eq(participants.userId, userId), eq(participants.eventId, eventId)));
    return participant;
  }
  async updateParticipantStatus(participantId, status) {
    const [participant] = await db.update(participants).set({ status }).where(eq(participants.id, participantId)).returning();
    return participant;
  }
  async getParticipantsByAdmin(adminId) {
    const result = await db.select({
      participant: participants,
      user: users,
      event: events
    }).from(participants).innerJoin(users, eq(participants.userId, users.id)).innerJoin(events, eq(participants.eventId, events.id)).innerJoin(eventAdmins, eq(events.id, eventAdmins.eventId)).where(eq(eventAdmins.adminId, adminId)).orderBy(desc(participants.registeredAt));
    return result.map((r) => ({
      ...r.participant,
      user: r.user,
      event: r.event
    }));
  }
  async getTestAttempt(id) {
    const [attempt] = await db.select().from(testAttempts).where(eq(testAttempts.id, id));
    return attempt;
  }
  async getTestAttemptByUserAndRound(userId, roundId) {
    const [attempt] = await db.select().from(testAttempts).where(and(eq(testAttempts.userId, userId), eq(testAttempts.roundId, roundId)));
    return attempt;
  }
  async getTestAttemptsByUser(userId) {
    return await db.select().from(testAttempts).where(eq(testAttempts.userId, userId));
  }
  async createTestAttempt(insertAttempt) {
    const [attempt] = await db.insert(testAttempts).values(insertAttempt).returning();
    return attempt;
  }
  async updateTestAttempt(id, updateData) {
    const [attempt] = await db.update(testAttempts).set(updateData).where(eq(testAttempts.id, id)).returning();
    return attempt;
  }
  async deleteTestAttemptsByRound(roundId) {
    await db.delete(testAttempts).where(eq(testAttempts.roundId, roundId));
  }
  async getAnswersByAttempt(attemptId) {
    return await db.select().from(answers).where(eq(answers.attemptId, attemptId));
  }
  async createAnswer(insertAnswer) {
    const [answer] = await db.insert(answers).values(insertAnswer).returning();
    return answer;
  }
  async updateAnswer(id, updateData) {
    const [answer] = await db.update(answers).set(updateData).where(eq(answers.id, id)).returning();
    return answer;
  }
  async getReports() {
    return await db.select().from(reports);
  }
  async getReportsByEvent(eventId) {
    return await db.select().from(reports).where(eq(reports.eventId, eventId));
  }
  async getReport(id) {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }
  async createReport(insertReport) {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }
  async updateReport(id, updateData) {
    const [report] = await db.update(reports).set(updateData).where(eq(reports.id, id)).returning();
    return report;
  }
  async deleteReport(id) {
    await db.delete(reports).where(eq(reports.id, id));
  }
  async generateEventReport(eventId, generatedBy) {
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    const eventRoundsData = await db.select().from(rounds).where(eq(rounds.eventId, eventId));
    const eventParticipants = await this.getParticipantsByEvent(eventId);
    const eventRulesData = await this.getEventRules(eventId);
    const roundsDetails = await Promise.all(
      eventRoundsData.map(async (round) => {
        const questionsData = await this.getQuestionsByRound(round.id);
        const attemptsData = await db.select({
          attempt: testAttempts,
          user: users
        }).from(testAttempts).innerJoin(users, eq(testAttempts.userId, users.id)).where(eq(testAttempts.roundId, round.id));
        const questionAnalysis = await Promise.all(
          questionsData.map(async (question) => {
            const answersData = await db.select({
              answer: answers,
              attempt: testAttempts
            }).from(answers).innerJoin(testAttempts, eq(answers.attemptId, testAttempts.id)).where(and(
              eq(answers.questionId, question.id),
              eq(testAttempts.roundId, round.id)
            ));
            const totalAnswers = answersData.length;
            const correctAnswers = answersData.filter((a) => a.answer.isCorrect).length;
            const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers * 100 : 0;
            return {
              questionId: question.id,
              questionText: question.questionText,
              questionType: question.questionType,
              points: question.points,
              totalAnswers,
              correctAnswers,
              accuracy: Math.round(accuracy * 100) / 100
            };
          })
        );
        const completedAttempts = attemptsData.filter((a) => a.attempt.status === "completed");
        const totalScore = completedAttempts.reduce((sum, a) => sum + (a.attempt.totalScore || 0), 0);
        const avgScore = completedAttempts.length > 0 ? totalScore / completedAttempts.length : 0;
        const violations = attemptsData.map((a) => ({
          userId: a.user.id,
          userName: a.user.fullName,
          tabSwitches: a.attempt.tabSwitchCount || 0,
          refreshAttempts: a.attempt.refreshAttemptCount || 0,
          violationLogs: a.attempt.violationLogs || []
        }));
        const leaderboard = await this.getRoundLeaderboard(round.id);
        return {
          roundId: round.id,
          roundName: round.name,
          roundNumber: round.roundNumber,
          duration: round.duration,
          status: round.status,
          totalQuestions: questionsData.length,
          totalAttempts: attemptsData.length,
          completedAttempts: completedAttempts.length,
          averageScore: Math.round(avgScore * 100) / 100,
          questionAnalysis,
          violations,
          leaderboard: leaderboard.slice(0, 10)
        };
      })
    );
    const participantDetails = await Promise.all(
      eventParticipants.map(async (participant) => {
        const user = await this.getUser(participant.userId);
        const attempts = await db.select().from(testAttempts).innerJoin(rounds, eq(testAttempts.roundId, rounds.id)).where(and(
          eq(rounds.eventId, eventId),
          eq(testAttempts.userId, participant.userId)
        ));
        const totalScore = attempts.filter((a) => a.test_attempts.status === "completed").reduce((sum, a) => sum + (a.test_attempts.totalScore || 0), 0);
        return {
          userId: participant.userId,
          userName: user?.fullName,
          email: user?.email,
          registeredAt: participant.registeredAt,
          status: participant.status,
          attemptsCount: attempts.length,
          completedAttempts: attempts.filter((a) => a.test_attempts.status === "completed").length,
          totalScore
        };
      })
    );
    const reportData = {
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status
      },
      rules: eventRulesData,
      totalRounds: eventRoundsData.length,
      totalParticipants: eventParticipants.length,
      rounds: roundsDetails,
      participants: participantDetails,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const report = await this.createReport({
      eventId,
      reportType: "event_wise",
      title: `${event.name} - Event Report`,
      generatedBy,
      reportData,
      fileUrl: null
    });
    return report;
  }
  async generateSymposiumReport(generatedBy) {
    const allEvents = await this.getEvents();
    const allUsers = await this.getUsers();
    const eventSummaries = await Promise.all(
      allEvents.map(async (event) => {
        const eventRoundsData = await db.select().from(rounds).where(eq(rounds.eventId, event.id));
        const eventParticipants = await this.getParticipantsByEvent(event.id);
        const roundIds = eventRoundsData.map((r) => r.id);
        let completedAttempts = 0;
        let totalAttempts = 0;
        let totalScore = 0;
        if (roundIds.length > 0) {
          const attemptsData = await db.select().from(testAttempts).where(sql3`${testAttempts.roundId} IN (${sql3.join(roundIds.map((id) => sql3`${id}`), sql3`, `)})`);
          totalAttempts = attemptsData.length;
          completedAttempts = attemptsData.filter((a) => a.status === "completed").length;
          totalScore = attemptsData.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.totalScore || 0), 0);
        }
        return {
          eventId: event.id,
          eventName: event.name,
          eventType: event.type,
          status: event.status,
          totalRounds: eventRoundsData.length,
          totalParticipants: eventParticipants.length,
          totalAttempts,
          completedAttempts,
          completionRate: totalAttempts > 0 ? Math.round(completedAttempts / totalAttempts * 100) : 0,
          averageScore: completedAttempts > 0 ? Math.round(totalScore / completedAttempts * 100) / 100 : 0
        };
      })
    );
    const allAttempts = await db.select({
      userId: testAttempts.userId,
      userName: users.fullName,
      totalScore: sql3`SUM(${testAttempts.totalScore})`.as("total_score"),
      attemptsCount: sql3`COUNT(*)`.as("attempts_count")
    }).from(testAttempts).innerJoin(users, eq(testAttempts.userId, users.id)).where(eq(testAttempts.status, "completed")).groupBy(testAttempts.userId, users.fullName).orderBy(desc(sql3`SUM(${testAttempts.totalScore})`)).limit(50);
    const participantCount = await db.select({ userId: participants.userId }).from(participants).groupBy(participants.userId);
    const totalCompletedAttempts = await db.select({ count: sql3`COUNT(*)`.as("count") }).from(testAttempts).where(eq(testAttempts.status, "completed"));
    const totalViolations = await db.select({
      totalTabSwitches: sql3`SUM(${testAttempts.tabSwitchCount})`.as("total_tab_switches"),
      totalRefreshes: sql3`SUM(${testAttempts.refreshAttemptCount})`.as("total_refreshes")
    }).from(testAttempts);
    const reportData = {
      overview: {
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter((e) => e.status === "active").length,
        completedEvents: allEvents.filter((e) => e.status === "completed").length,
        totalParticipants: participantCount.length,
        totalEventAdmins: allUsers.filter((u) => u.role === "event_admin").length,
        totalCompletedAttempts: totalCompletedAttempts[0]?.count || 0,
        totalViolations: {
          tabSwitches: totalViolations[0]?.totalTabSwitches || 0,
          refreshes: totalViolations[0]?.totalRefreshes || 0
        }
      },
      eventSummaries,
      topPerformers: allAttempts.slice(0, 20).map((performer, index) => ({
        rank: index + 1,
        userId: performer.userId,
        userName: performer.userName,
        totalScore: performer.totalScore,
        attemptsCount: performer.attemptsCount
      })),
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const report = await this.createReport({
      eventId: null,
      reportType: "symposium_wide",
      title: "Symposium-wide Report",
      generatedBy,
      reportData,
      fileUrl: null
    });
    return report;
  }
  async getRoundLeaderboard(roundId) {
    const attempts = await db.select({
      attemptId: testAttempts.id,
      userId: testAttempts.userId,
      userName: users.fullName,
      totalScore: testAttempts.totalScore,
      maxScore: testAttempts.maxScore,
      submittedAt: testAttempts.submittedAt,
      status: testAttempts.status
    }).from(testAttempts).innerJoin(users, eq(testAttempts.userId, users.id)).where(and(
      eq(testAttempts.roundId, roundId),
      eq(testAttempts.status, "completed")
    )).orderBy(desc(testAttempts.totalScore), asc(testAttempts.submittedAt));
    return attempts.map((attempt, index) => ({
      ...attempt,
      rank: index + 1
    }));
  }
  async getEventLeaderboard(eventId) {
    const roundsData = await db.select().from(rounds).where(eq(rounds.eventId, eventId));
    const roundIds = roundsData.map((r) => r.id);
    if (roundIds.length === 0) {
      return [];
    }
    const attempts = await db.select({
      userId: testAttempts.userId,
      userName: users.fullName,
      totalScore: sql3`SUM(${testAttempts.totalScore})`.as("total_score"),
      submittedAt: sql3`MAX(${testAttempts.submittedAt})`.as("last_submitted")
    }).from(testAttempts).innerJoin(users, eq(testAttempts.userId, users.id)).where(and(
      sql3`${testAttempts.roundId} IN (${sql3.join(roundIds.map((id) => sql3`${id}`), sql3`, `)})`,
      eq(testAttempts.status, "completed")
    )).groupBy(testAttempts.userId, users.fullName).orderBy(desc(sql3`SUM(${testAttempts.totalScore})`), asc(sql3`MAX(${testAttempts.submittedAt})`));
    return attempts.map((attempt, index) => ({
      ...attempt,
      rank: index + 1
    }));
  }
  async createRegistrationForm(title, description, formFields, slug) {
    const [form] = await db.insert(registrationForms).values({
      title,
      description,
      formSlug: slug,
      formFields,
      isActive: true
    }).returning();
    return form;
  }
  async getRegistrationFormBySlug(slug) {
    const [form] = await db.select().from(registrationForms).where(eq(registrationForms.formSlug, slug));
    return form;
  }
  async getAllRegistrationForms() {
    return await db.select().from(registrationForms).orderBy(desc(registrationForms.createdAt));
  }
  async getActiveRegistrationForm() {
    const [form] = await db.select().from(registrationForms).where(eq(registrationForms.isActive, true)).orderBy(desc(registrationForms.createdAt)).limit(1);
    return form;
  }
  async updateRegistrationForm(id, updates) {
    const [form] = await db.update(registrationForms).set(updates).where(eq(registrationForms.id, id)).returning();
    return form;
  }
  async createRegistration(formId, data, selectedEvents) {
    const [registration] = await db.insert(registrations).values({
      formId,
      submittedData: data,
      selectedEvents,
      paymentStatus: "pending",
      participantUserId: null,
      processedBy: null
    }).returning();
    return registration;
  }
  async getRegistrations() {
    const result = await db.select({
      registration: registrations,
      form: registrationForms
    }).from(registrations).leftJoin(registrationForms, eq(registrations.formId, registrationForms.id)).orderBy(desc(registrations.submittedAt));
    return result.map((r) => {
      const participantDetails = this.extractParticipantDetails(r.registration.submittedData, r.form?.formFields || []);
      return {
        ...r.registration,
        participantName: participantDetails.name,
        participantEmail: participantDetails.email,
        participantPhone: participantDetails.phone,
        form: r.form
      };
    });
  }
  async getRegistration(id) {
    const result = await db.select({
      registration: registrations,
      form: registrationForms
    }).from(registrations).leftJoin(registrationForms, eq(registrations.formId, registrationForms.id)).where(eq(registrations.id, id));
    if (result.length === 0) return void 0;
    const r = result[0];
    const participantDetails = this.extractParticipantDetails(r.registration.submittedData, r.form?.formFields || []);
    return {
      ...r.registration,
      participantName: participantDetails.name,
      participantEmail: participantDetails.email,
      participantPhone: participantDetails.phone,
      form: r.form
    };
  }
  async getRegistrationByUserId(userId) {
    const result = await db.select({
      registration: registrations,
      form: registrationForms
    }).from(registrations).leftJoin(registrationForms, eq(registrations.formId, registrationForms.id)).where(eq(registrations.participantUserId, userId));
    if (result.length === 0) return void 0;
    const r = result[0];
    const participantDetails = this.extractParticipantDetails(r.registration.submittedData, r.form?.formFields || []);
    return {
      ...r.registration,
      participantName: participantDetails.name,
      participantEmail: participantDetails.email,
      participantPhone: participantDetails.phone,
      form: r.form
    };
  }
  extractParticipantDetails(submittedData, formFields) {
    let name = "N/A";
    let email = "N/A";
    let phone = "N/A";
    for (const field of formFields) {
      const value = submittedData[field.id];
      if (!value) continue;
      const lowerLabel = field.label.toLowerCase();
      if (field.type === "email" || lowerLabel.includes("email")) {
        email = value;
      } else if (field.type === "tel" || lowerLabel.includes("phone") || lowerLabel.includes("mobile") || lowerLabel.includes("contact")) {
        phone = value;
      } else if (lowerLabel.includes("name") && !lowerLabel.includes("college") && !lowerLabel.includes("school") && !lowerLabel.includes("institution")) {
        if (name === "N/A" || lowerLabel.includes("full")) {
          name = value;
        }
      }
    }
    return { name, email, phone };
  }
  async updateRegistrationStatus(id, status, participantUserId, processedBy) {
    const [registration] = await db.update(registrations).set({
      paymentStatus: status,
      participantUserId,
      processedBy,
      processedAt: /* @__PURE__ */ new Date()
    }).where(eq(registrations.id, id)).returning();
    return registration;
  }
  async getEventsByIds(eventIds) {
    if (eventIds.length === 0) return [];
    return await db.select().from(events).where(
      sql3`${events.id} IN (${sql3.join(eventIds.map((id) => sql3`${id}`), sql3`, `)})`
    );
  }
  async createParticipant(userId, eventId) {
    const [participant] = await db.insert(participants).values({
      userId,
      eventId,
      status: "registered"
    }).returning();
    return participant;
  }
  async createEventCredential(participantUserId, eventId, eventUsername, eventPassword) {
    const [credential] = await db.insert(eventCredentials).values({
      participantUserId,
      eventId,
      eventUsername,
      eventPassword
    }).returning();
    return credential;
  }
  async getEventCredentialsByParticipant(participantUserId) {
    return await db.select().from(eventCredentials).where(eq(eventCredentials.participantUserId, participantUserId));
  }
  async getEventCredentialsByEvent(eventId) {
    const result = await db.select({
      id: eventCredentials.id,
      participantUserId: eventCredentials.participantUserId,
      eventId: eventCredentials.eventId,
      eventUsername: eventCredentials.eventUsername,
      eventPassword: eventCredentials.eventPassword,
      testEnabled: eventCredentials.testEnabled,
      enabledAt: eventCredentials.enabledAt,
      enabledBy: eventCredentials.enabledBy,
      createdAt: eventCredentials.createdAt,
      participant: users,
      event: events,
      paymentStatus: registrations.paymentStatus
    }).from(eventCredentials).innerJoin(users, eq(eventCredentials.participantUserId, users.id)).innerJoin(events, eq(eventCredentials.eventId, events.id)).leftJoin(registrations, eq(registrations.participantUserId, users.id)).where(eq(eventCredentials.eventId, eventId));
    return result;
  }
  async getEventCredential(credentialId) {
    const [credential] = await db.select().from(eventCredentials).where(eq(eventCredentials.id, credentialId));
    return credential;
  }
  async getEventCredentialByUserAndEvent(userId, eventId) {
    const [credential] = await db.select().from(eventCredentials).where(and(eq(eventCredentials.participantUserId, userId), eq(eventCredentials.eventId, eventId)));
    return credential;
  }
  async updateEventCredentialTestStatus(credentialId, testEnabled, enabledBy) {
    const updateData = {
      testEnabled
    };
    if (testEnabled) {
      updateData.enabledAt = /* @__PURE__ */ new Date();
      updateData.enabledBy = enabledBy;
    }
    const [credential] = await db.update(eventCredentials).set(updateData).where(eq(eventCredentials.id, credentialId)).returning();
    return credential;
  }
  async getEventCredentialsWithParticipants(eventId) {
    const result = await db.select({
      id: eventCredentials.id,
      participantUserId: eventCredentials.participantUserId,
      eventId: eventCredentials.eventId,
      eventUsername: eventCredentials.eventUsername,
      eventPassword: eventCredentials.eventPassword,
      testEnabled: eventCredentials.testEnabled,
      enabledAt: eventCredentials.enabledAt,
      enabledBy: eventCredentials.enabledBy,
      createdAt: eventCredentials.createdAt,
      participant: users
    }).from(eventCredentials).innerJoin(users, eq(eventCredentials.participantUserId, users.id)).where(eq(eventCredentials.eventId, eventId)).orderBy(asc(users.fullName));
    return result;
  }
  async getEventCredentialByUsername(eventUsername) {
    const [credential] = await db.select().from(eventCredentials).where(eq(eventCredentials.eventUsername, eventUsername));
    return credential;
  }
  async getUserById(userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }
  async isUserEventAdmin(userId, eventId) {
    const [assignment] = await db.select().from(eventAdmins).where(and(eq(eventAdmins.adminId, userId), eq(eventAdmins.eventId, eventId)));
    return !!assignment;
  }
  async getEventById(eventId) {
    return await this.getEvent(eventId);
  }
  async getParticipantCredentialWithDetails(userId, eventId) {
    const credential = await this.getEventCredentialByUserAndEvent(userId, eventId);
    if (!credential) {
      return null;
    }
    const event = await this.getEvent(eventId);
    if (!event) {
      return null;
    }
    const rounds2 = await this.getRoundsByEvent(eventId);
    const eventRules2 = await this.getEventRules(eventId);
    const activeRound = rounds2.find((r) => r.status === "active");
    let activeRoundRules = null;
    if (activeRound) {
      activeRoundRules = await this.getRoundRules(activeRound.id);
    }
    return {
      credential,
      event,
      rounds: rounds2,
      eventRules: eventRules2,
      activeRoundRules
    };
  }
  async getOnSpotParticipantsByCreator(creatorId) {
    const participantUsers = await db.select().from(users).where(and(eq(users.createdBy, creatorId), eq(users.role, "participant"))).orderBy(desc(users.createdAt));
    const result = await Promise.all(participantUsers.map(async (user) => {
      const credentials = await db.select({
        id: eventCredentials.id,
        participantUserId: eventCredentials.participantUserId,
        eventId: eventCredentials.eventId,
        eventUsername: eventCredentials.eventUsername,
        eventPassword: eventCredentials.eventPassword,
        testEnabled: eventCredentials.testEnabled,
        enabledAt: eventCredentials.enabledAt,
        enabledBy: eventCredentials.enabledBy,
        createdAt: eventCredentials.createdAt,
        event: events
      }).from(eventCredentials).innerJoin(events, eq(eventCredentials.eventId, events.id)).where(eq(eventCredentials.participantUserId, user.id));
      return {
        ...user,
        eventCredentials: credentials
      };
    }));
    return result;
  }
  async updateUserDetails(userId, updates) {
    if (updates.email) {
      const existingUser = await this.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("Email already exists");
      }
    }
    const updateData = {};
    if (updates.fullName !== void 0) updateData.fullName = updates.fullName;
    if (updates.email !== void 0) updateData.email = updates.email;
    if (updates.phone !== void 0) updateData.phone = updates.phone;
    const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
    return user;
  }
  async getEventCredentialCountForEvent(eventId) {
    const result = await db.select({ count: sql3`count(*)` }).from(eventCredentials).where(eq(eventCredentials.eventId, eventId));
    return result[0]?.count || 0;
  }
  async createAuditLog(insertLog) {
    const [log2] = await db.insert(auditLogs).values(insertLog).returning();
    return log2;
  }
  async getAuditLogs(filters) {
    let query = db.select().from(auditLogs);
    const conditions = [];
    if (filters?.adminId) conditions.push(eq(auditLogs.adminId, filters.adminId));
    if (filters?.targetType) conditions.push(eq(auditLogs.targetType, filters.targetType));
    if (filters?.startDate) conditions.push(gte(auditLogs.timestamp, filters.startDate));
    if (filters?.endDate) conditions.push(lte(auditLogs.timestamp, filters.endDate));
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query.orderBy(desc(auditLogs.timestamp));
  }
  async getAuditLogsByTarget(targetType, targetId) {
    return await db.select().from(auditLogs).where(and(eq(auditLogs.targetType, targetType), eq(auditLogs.targetId, targetId))).orderBy(desc(auditLogs.timestamp));
  }
  async createEmailLog(insertLog) {
    const [log2] = await db.insert(emailLogs).values(insertLog).returning();
    return log2;
  }
  async getEmailLogs(filters) {
    let query = db.select().from(emailLogs);
    const conditions = [];
    if (filters?.status) conditions.push(eq(emailLogs.status, filters.status));
    if (filters?.templateType) conditions.push(eq(emailLogs.templateType, filters.templateType));
    if (filters?.startDate) conditions.push(gte(emailLogs.sentAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(emailLogs.sentAt, filters.endDate));
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query.orderBy(desc(emailLogs.sentAt));
  }
  async getEmailLogsByRecipient(email) {
    return await db.select().from(emailLogs).where(eq(emailLogs.recipientEmail, email)).orderBy(desc(emailLogs.sentAt));
  }
  async getParticipantsByEventId(eventId) {
    const result = await db.select({ user: users }).from(users).innerJoin(participants, eq(participants.userId, users.id)).where(and(eq(participants.eventId, eventId), eq(users.role, "participant"))).groupBy(users.id);
    return result.map((r) => r.user);
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcrypt";
import jwt3 from "jsonwebtoken";
import crypto from "crypto";
import { nanoid } from "nanoid";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import QRCode from "qrcode";

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "symposium-secret-key-change-in-production";
async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
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
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
}
function requireEventAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "event_admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Event Admin access required" });
  }
  next();
}
function requireParticipant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "participant") {
    return res.status(403).json({ message: "Participant access required" });
  }
  next();
}
function requireRegistrationCommittee(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "registration_committee" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Registration Committee access required" });
  }
  next();
}
async function requireEventAccess(req, res, next) {
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
    const isAssigned = admins.some((admin) => admin.id === req.user.id);
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
async function requireRoundAccess(req, res, next) {
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
    const isAssigned = admins.some((admin) => admin.id === req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ message: "You are not assigned to this event" });
    }
    return next();
  }
  return res.status(403).json({ message: "Access denied" });
}
async function requireEventAdminOrSuperAdmin(req, res, next) {
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
    const isAssigned = admins.some((admin) => admin.id === req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ message: "You are not assigned to this event" });
    }
    return next();
  }
  return res.status(403).json({ message: "Access denied" });
}

// server/services/emailService.ts
import nodemailer from "nodemailer";

// server/templates/emailTemplates.ts
function generateRegistrationApprovedEmail(name, eventName, username, password) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Approved - ${eventName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header with gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #166534; font-weight: 600; font-size: 16px;">\u2713 Registration Approved</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Hello ${name}!</h2>
                    
                    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Congratulations! Your registration for <strong>${eventName}</strong> has been approved.
                    </p>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Below are your login credentials to access the event platform:
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Username</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${username}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Password</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${password}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || "https://symposium.replit.app"}/login" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Login to Platform
                      </a>
                    </div>
                    
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                        <strong>Important:</strong> Please keep your credentials secure. Do not share them with anyone.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Need help? Contact our support team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      \xA9 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
function generateCredentialsEmail(name, eventName, username, password) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Credentials - ${eventName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 16px;">\u{1F511} Your Event Credentials</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Welcome ${name}!</h2>
                    
                    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your registration for <strong>${eventName}</strong> has been successfully completed.
                    </p>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Use these credentials to access the event platform:
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Username</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${username}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Password</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${password}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || "https://symposium.replit.app"}/login" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Access Platform
                      </a>
                    </div>
                    
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                        <strong>Security Tip:</strong> Keep your credentials confidential and do not share them with anyone.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Questions? Contact our support team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      \xA9 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
function generateTestStartReminderEmail(name, eventName, roundName, startTime) {
  const formattedTime = startTime.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short"
  });
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Starting Soon - ${roundName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 16px;">\u23F0 Test Reminder</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Hi ${name}!</h2>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      This is a reminder that <strong>${roundName}</strong> for <strong>${eventName}</strong> is starting soon.
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Event</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${eventName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Round</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${roundName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Start Time</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${formattedTime}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || "https://symposium.replit.app"}/participant/my-tests" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Go to Dashboard
                      </a>
                    </div>
                    
                    <div style="background: #e0e7ff; border-left: 4px solid #6366f1; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #3730a3; font-size: 14px; line-height: 1.5;">
                        <strong>Preparation Tips:</strong> Ensure you have a stable internet connection and your device is fully charged.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Good luck! You've got this! \u{1F680}
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      \xA9 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
function generateResultPublishedEmail(name, eventName, score, rank) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Results Published - ${eventName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 16px;">\u{1F4CA} Results Published</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Congratulations ${name}!</h2>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your results for <strong>${eventName}</strong> are now available.
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Event</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${eventName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Your Score</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 24px;">${score}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Your Rank</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 24px;">#${rank}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || "https://symposium.replit.app"}/participant/test-results" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        View Full Results
                      </a>
                    </div>
                    
                    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                        <strong>Well Done!</strong> Thank you for participating. Keep up the great work!
                      </p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Thank you for participating! \u{1F389}
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      \xA9 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// server/services/emailService.ts
var EmailService = class {
  transporter;
  isDevelopmentMode;
  constructor() {
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    this.isDevelopmentMode = !hasSmtpConfig;
    if (hasSmtpConfig) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log("\u2705 Email service initialized with SMTP configuration");
    } else {
      this.transporter = null;
      console.log("\u26A0\uFE0F  Email service running in DEVELOPMENT MODE - emails will be logged, not sent");
      console.log("   To enable email sending, configure SMTP secrets: SMTP_HOST, SMTP_USER, SMTP_PASS");
    }
  }
  async sendWithRetry(mailOptions, maxRetries = 3, attempt = 1) {
    if (this.isDevelopmentMode || !this.transporter) {
      console.log("\n\u{1F4E7} [DEV MODE] Email would be sent:");
      console.log("   To:", mailOptions.to);
      console.log("   From:", mailOptions.from);
      console.log("   Subject:", mailOptions.subject);
      console.log("   (Email content logged to email_logs table)\n");
      return {
        success: true,
        messageId: `dev-mode-${Date.now()}`,
        retryCount: 0
      };
    }
    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId, retryCount: attempt - 1 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isRetryable = this.isRetryableError(error);
      if (isRetryable && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1e3;
        console.log(`Email send failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.sendWithRetry(mailOptions, maxRetries, attempt + 1);
      }
      return { success: false, error: errorMessage, retryCount: attempt - 1 };
    }
  }
  isRetryableError(error) {
    if (!error) return false;
    const errorString = String(error).toLowerCase();
    const smtpCodeMatch = errorString.match(/\b(4\d\d)\b/);
    if (smtpCodeMatch) {
      const code = parseInt(smtpCodeMatch[1]);
      if (code >= 400 && code <= 499) {
        return true;
      }
    }
    if (error.responseCode) {
      const code = parseInt(String(error.responseCode));
      if (code >= 400 && code <= 499) {
        return true;
      }
    }
    if (error.code && typeof error.code === "number") {
      if (error.code >= 400 && error.code <= 499) {
        return true;
      }
    }
    const retryablePatterns = [
      "network",
      "timeout",
      "econnrefused",
      "econnreset",
      "etimedout",
      "temporary failure",
      "connection timeout",
      "socket hang up"
    ];
    return retryablePatterns.some((pattern) => errorString.includes(pattern));
  }
  async sendEmail(options, templateType, recipientName) {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"BootFeet 2K26" <noreply@bootfeet.com>',
      to: options.to,
      subject: options.subject,
      html: options.html
    };
    const result = await this.sendWithRetry(mailOptions);
    const metadata = {
      ...options.metadata || {},
      retryCount: result.retryCount
    };
    try {
      await storage.createEmailLog({
        recipientEmail: options.to,
        recipientName: recipientName || null,
        subject: options.subject,
        templateType,
        status: result.success ? "sent" : "failed",
        metadata,
        errorMessage: result.error || null
      });
    } catch (logError) {
      console.warn("\u26A0\uFE0F  Failed to log email to database:", logError instanceof Error ? logError.message : "Unknown error");
    }
    if (result.success) {
      if (this.isDevelopmentMode) {
        console.log(`\u2705 [DEV MODE] Email logged successfully: ${templateType} to ${options.to}`);
      } else {
        console.log(`\u2705 Email sent successfully to ${options.to} (${templateType})`);
      }
    } else {
      console.error(`\u274C Email send failed to ${options.to}:`, result.error);
    }
    return result;
  }
  async sendRegistrationApproved(to, name, eventName, username, password) {
    const html = generateRegistrationApprovedEmail(name, eventName, username, password);
    return this.sendEmail(
      {
        to,
        subject: `Registration Approved - ${eventName}`,
        html,
        metadata: { eventName, username }
      },
      "registration_approved",
      name
    );
  }
  async sendCredentials(to, name, eventName, username, password) {
    const html = generateCredentialsEmail(name, eventName, username, password);
    return this.sendEmail(
      {
        to,
        subject: `Your Credentials for ${eventName}`,
        html,
        metadata: { eventName, username }
      },
      "credentials_distribution",
      name
    );
  }
  async sendTestStartReminder(to, name, eventName, roundName, startTime) {
    const html = generateTestStartReminderEmail(name, eventName, roundName, startTime);
    return this.sendEmail(
      {
        to,
        subject: `Test Starting Soon - ${roundName}`,
        html,
        metadata: { eventName, roundName, startTime: startTime.toISOString() }
      },
      "test_start_reminder",
      name
    );
  }
  async sendResultPublished(to, name, eventName, score, rank) {
    const html = generateResultPublishedEmail(name, eventName, score, rank);
    return this.sendEmail(
      {
        to,
        subject: `Results Published - ${eventName}`,
        html,
        metadata: { eventName, score, rank }
      },
      "result_published",
      name
    );
  }
};
var emailService = new EmailService();

// server/websocket.ts
import { Server } from "socket.io";
import jwt2 from "jsonwebtoken";
var JWT_SECRET2 = process.env.JWT_SECRET || "symposium-secret-key-change-in-production";
function setupWebSocket(httpServer) {
  const io2 = new Server(httpServer, {
    cors: {
      origin: "*",
      credentials: true
    }
  });
  io2.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt2.verify(token, JWT_SECRET2);
      const isTestUser = decoded.id?.startsWith("test-") || decoded.id?.startsWith("stress-");
      if (isTestUser) {
        socket.data.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
          eventId: decoded.eventId
        };
        next();
      } else {
        const user = await storage.getUser(decoded.id);
        if (!user) {
          return next(new Error("User not found"));
        }
        socket.data.user = user;
        next();
      }
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });
  io2.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`WebSocket: User connected: ${user.username} (${user.role})`);
    const isTestUser = user.id?.startsWith("test-") || user.id?.startsWith("stress-");
    if (user.role === "super_admin") {
      socket.join("super_admin");
    } else if (user.role === "event_admin") {
      if (isTestUser && user.eventId) {
        socket.join(`event:${user.eventId}`);
      } else {
        storage.getEventsByAdmin(user.id).then((events2) => {
          events2.forEach((event) => {
            socket.join(`event:${event.id}`);
          });
        });
      }
    } else if (user.role === "participant") {
      socket.join(`participant:${user.id}`);
    } else if (user.role === "registration_committee") {
      socket.join("registration_committee");
    }
    socket.on("testEvent", async (data) => {
      if (!isTestUser) return;
      const { type, eventId, roundId, participantId, registration, status, round, action, targetType, targetId, changes, result } = data;
      switch (type) {
        case "registrationUpdate":
          io2.to("super_admin").emit("registrationUpdate", {
            type: "new_registration",
            eventId,
            registration
          });
          io2.to("registration_committee").emit("registrationUpdate", {
            type: "new_registration",
            eventId,
            registration
          });
          io2.to(`event:${eventId}`).emit("registrationUpdate", {
            type: "new_registration",
            eventId,
            registration
          });
          break;
        case "roundStatus":
          io2.to("super_admin").emit("roundStatus", {
            eventId,
            roundId,
            status,
            round
          });
          io2.to(`event:${eventId}`).emit("roundStatus", {
            eventId,
            roundId,
            status,
            round
          });
          const sockets = await io2.fetchSockets();
          sockets.forEach((s) => {
            if (s.data.user?.role === "participant") {
              const isTestUser2 = s.data.user.id?.startsWith("test-") || s.data.user.id?.startsWith("stress-");
              if (isTestUser2 && s.data.user.eventId === eventId) {
                io2.to(`participant:${s.data.user.id}`).emit("roundStatus", {
                  eventId,
                  roundId,
                  status,
                  round
                });
              }
            }
          });
          break;
        case "overrideAction":
          io2.to("super_admin").emit("overrideAction", {
            action,
            targetType,
            targetId,
            changes,
            timestamp: /* @__PURE__ */ new Date()
          });
          break;
        case "resultPublished":
          io2.to(`participant:${participantId}`).emit("resultPublished", {
            eventId,
            result
          });
          break;
      }
    });
    socket.on("disconnect", () => {
      console.log(`WebSocket: User disconnected: ${user.username}`);
    });
  });
  return io2;
}
var io;
function setIO(server) {
  io = server;
}

// server/services/websocketService.ts
var WebSocketService = class {
  // Registration update - notify admins and registration committee
  static notifyRegistrationUpdate(eventId, registration) {
    if (!io) return;
    io.to("super_admin").emit("registrationUpdate", {
      type: "new_registration",
      eventId,
      registration
    });
    io.to("registration_committee").emit("registrationUpdate", {
      type: "new_registration",
      eventId,
      registration
    });
    io.to(`event:${eventId}`).emit("registrationUpdate", {
      type: "new_registration",
      eventId,
      registration
    });
  }
  // Round status change - notify all participants of the event and admins
  static async notifyRoundStatus(eventId, roundId, status, round) {
    if (!io) return;
    io.to("super_admin").emit("roundStatus", {
      eventId,
      roundId,
      status,
      round
    });
    io.to(`event:${eventId}`).emit("roundStatus", {
      eventId,
      roundId,
      status,
      round
    });
    const participants2 = await storage.getParticipantsByEventId(eventId);
    participants2.forEach((participant) => {
      io.to(`participant:${participant.id}`).emit("roundStatus", {
        eventId,
        roundId,
        status,
        round
      });
    });
  }
  // Super admin override - notify all admins and affected users
  static notifyOverrideAction(action, targetType, targetId, changes) {
    if (!io) return;
    io.to("super_admin").emit("overrideAction", {
      action,
      targetType,
      targetId,
      changes,
      timestamp: /* @__PURE__ */ new Date()
    });
    if (targetType === "event") {
      io.to(`event:${targetId}`).emit("overrideAction", {
        action,
        targetType,
        targetId,
        changes,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
  }
  // Result published - notify specific participant
  static notifyResultPublished(participantId, eventId, result) {
    if (!io) return;
    io.to(`participant:${participantId}`).emit("resultPublished", {
      eventId,
      result
    });
  }
  // Broadcast to specific event participants
  static broadcastToEvent(eventId, event, data) {
    if (!io) return;
    io.to(`event:${eventId}`).emit(event, data);
  }
  // Broadcast to all super admins
  static broadcastToSuperAdmins(event, data) {
    if (!io) return;
    io.to("super_admin").emit(event, data);
  }
};

// server/routes.ts
var JWT_SECRET3 = process.env.JWT_SECRET || "symposium-secret-key-change-in-production";
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production environment");
}
function generateFormSlug(eventName) {
  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${slug}-${nanoid(8)}`;
}
function generateSecurePassword() {
  return crypto.randomBytes(12).toString("base64").slice(0, 16);
}
function generateHumanReadableCredentials(fullName, eventName, counter) {
  const firstName = fullName.split(" ")[0].toLowerCase();
  const shortName = fullName.split(" ").pop()?.toLowerCase() || fullName.substring(0, 5).toLowerCase();
  const cleanEventName = eventName.toLowerCase().replace(/\s+/g, "-");
  const formattedCounter = String(counter).padStart(3, "0");
  return {
    username: `${cleanEventName}-${firstName}-${formattedCounter}`,
    password: `${shortName}${formattedCounter}`
  };
}
function timesOverlap(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) return false;
  return start1 < end2 && start2 < end1;
}
async function validateEventSelection(eventIds) {
  if (eventIds.length === 0) {
    return { valid: false, error: "At least one event must be selected" };
  }
  const events2 = await storage.getEventsByIds(eventIds);
  if (events2.length !== eventIds.length) {
    return { valid: false, error: "One or more selected events not found" };
  }
  const technical = events2.filter((e) => e.category === "technical");
  const nonTechnical = events2.filter((e) => e.category === "non_technical");
  if (technical.length > 1) {
    return { valid: false, error: "Only one technical event can be selected" };
  }
  if (nonTechnical.length > 1) {
    return { valid: false, error: "Only one non-technical event can be selected" };
  }
  for (let i = 0; i < events2.length; i++) {
    for (let j = i + 1; j < events2.length; j++) {
      const e1 = events2[i];
      const e2 = events2[j];
      const e1Rounds = await storage.getRoundsByEvent(e1.id);
      const e2Rounds = await storage.getRoundsByEvent(e2.id);
      for (const r1 of e1Rounds) {
        for (const r2 of e2Rounds) {
          if (timesOverlap(r1.startTime, r1.endTime, r2.startTime, r2.endTime)) {
            return { valid: false, error: `Events "${e1.name}" and "${e2.name}" have overlapping times` };
          }
        }
      }
    }
  }
  return { valid: true };
}
async function logSuperAdminAction(adminId, adminUsername, action, targetType, targetId, targetName, changes, reason, ipAddress) {
  await storage.createAuditLog({
    adminId,
    adminUsername,
    action,
    targetType,
    targetId,
    targetName,
    changes,
    reason,
    ipAddress
  });
}
var getClientIp = (req) => {
  return req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.headers["x-real-ip"]?.toString() || req.connection.remoteAddress || null;
};
async function registerRoutes(app2) {
  app2.get("/api/users", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const usersWithoutPasswords = users2.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/users/:id/credentials", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username && !email && !password) {
        return res.status(400).json({ message: "At least one field (username, email, or password) must be provided" });
      }
      const updates = {};
      if (username !== void 0) updates.username = username;
      if (email !== void 0) updates.email = email;
      if (password !== void 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.password = hashedPassword;
      }
      const user = await storage.updateUserCredentials(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "User credentials updated successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Update user credentials error:", error);
      if (error.message === "Username already exists" || error.message === "Email already exists") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete("/api/users/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.get("/api/admin/orphaned-admins", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const orphanedAdmins = await storage.getOrphanedEventAdmins();
      const adminsWithoutPasswords = orphanedAdmins.map(({ password, ...admin }) => admin);
      res.json(adminsWithoutPasswords);
    } catch (error) {
      console.error("Get orphaned admins error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, email, fullName, role } = req.body;
      if (!username || !password || !email || !fullName || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const validRoles = ["super_admin", "event_admin", "participant", "registration_committee"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        fullName,
        role
      });
      const token = jwt3.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET3, { expiresIn: "7d" });
      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      if (username.startsWith("DISABLED_")) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const eventCredential = await storage.getEventCredentialByUsername(username);
      if (eventCredential) {
        if (eventCredential.eventPassword !== password) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        const user2 = await storage.getUserById(eventCredential.participantUserId);
        if (!user2) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        const token2 = jwt3.sign(
          { id: user2.id, username: user2.username, role: user2.role, eventId: eventCredential.eventId },
          JWT_SECRET3,
          { expiresIn: "7d" }
        );
        return res.json({
          message: "Login successful",
          user: {
            id: user2.id,
            username: user2.username,
            email: user2.email,
            fullName: user2.fullName,
            role: user2.role,
            eventId: eventCredential.eventId
          },
          token: token2
        });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt3.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET3, { expiresIn: "7d" });
      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    res.json(req.user);
  });
  app2.get(
    "/api/participants/my-credential",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const user = req.user;
        let data;
        if (user.eventId) {
          data = await storage.getParticipantCredentialWithDetails(user.id, user.eventId);
        } else {
          const credentials = await storage.getEventCredentialsByParticipant(user.id);
          if (credentials.length === 0) {
            return res.status(400).json({ message: "No event associated with this user" });
          }
          const firstCredential = credentials[0];
          data = await storage.getParticipantCredentialWithDetails(user.id, firstCredential.eventId);
        }
        if (!data) {
          return res.status(404).json({ message: "Event credential not found" });
        }
        const { credential, event, rounds: rounds2, eventRules: eventRules2, activeRoundRules } = data;
        res.json({
          credential: {
            id: credential.id,
            eventUsername: credential.eventUsername,
            testEnabled: credential.testEnabled,
            enabledAt: credential.enabledAt
          },
          event: {
            id: event.id,
            name: event.name,
            description: event.description,
            type: event.type,
            category: event.category
          },
          rounds: rounds2.map((round) => ({
            id: round.id,
            name: round.name,
            duration: round.duration,
            startTime: round.startTime,
            endTime: round.endTime,
            status: round.status
          })),
          eventRules: {
            noRefresh: eventRules2?.noRefresh,
            noTabSwitch: eventRules2?.noTabSwitch,
            forceFullscreen: eventRules2?.forceFullscreen,
            disableShortcuts: eventRules2?.disableShortcuts,
            autoSubmitOnViolation: eventRules2?.autoSubmitOnViolation,
            maxTabSwitchWarnings: eventRules2?.maxTabSwitchWarnings,
            additionalRules: eventRules2?.additionalRules
          },
          roundRules: activeRoundRules ? {
            noRefresh: activeRoundRules.noRefresh,
            noTabSwitch: activeRoundRules.noTabSwitch,
            forceFullscreen: activeRoundRules.forceFullscreen,
            disableShortcuts: activeRoundRules.disableShortcuts,
            autoSubmitOnViolation: activeRoundRules.autoSubmitOnViolation,
            maxTabSwitchWarnings: activeRoundRules.maxTabSwitchWarnings,
            additionalRules: activeRoundRules.additionalRules
          } : null
        });
      } catch (error) {
        console.error("Get participant credential error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.patch("/api/participants/:participantId/disqualify", requireAuth, async (req, res) => {
    try {
      const { participantId } = req.params;
      const participant = await storage.updateParticipantStatus(participantId, "disqualified");
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }
      res.json({
        message: "Participant disqualified successfully",
        participant
      });
    } catch (error) {
      console.error("Disqualify participant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events", requireAuth, async (req, res) => {
    try {
      if (req.user.role === "super_admin" || req.user.role === "registration_committee") {
        const events2 = await storage.getEvents();
        res.json(events2);
      } else if (req.user.role === "event_admin") {
        const events2 = await storage.getEventsByAdmin(req.user.id);
        res.json(events2);
      } else if (req.user.role === "participant") {
        const allEvents = await storage.getEvents();
        const activeEvents = allEvents.filter((e) => e.status === "active");
        res.json(activeEvents);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/unassigned", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const events2 = await storage.getEventsWithoutAdmins();
      res.json(events2);
    } catch (error) {
      console.error("Get unassigned events error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/for-registration", async (req, res) => {
    try {
      const activeForm = await storage.getActiveRegistrationForm();
      if (!activeForm) {
        return res.status(404).json({ message: "No active registration form found" });
      }
      const allEvents = await storage.getEvents();
      const allowedEvents = allEvents.filter((event) => activeForm.allowedCategories.includes(event.category));
      const eventsWithRounds = await Promise.all(
        allowedEvents.map(async (event) => {
          const rounds2 = await storage.getRoundsByEvent(event.id);
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            category: event.category,
            rounds: rounds2.map((r) => ({
              id: r.id,
              name: r.name,
              startTime: r.startTime,
              endTime: r.endTime
            }))
          };
        })
      );
      res.json(eventsWithRounds);
    } catch (error) {
      console.error("Get events for registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/for-registration-grouped", async (req, res) => {
    try {
      const activeForm = await storage.getActiveRegistrationForm();
      if (!activeForm) {
        return res.status(404).json({ message: "No active registration form found" });
      }
      const allEvents = await storage.getEvents();
      const allowedEvents = allEvents.filter((event) => activeForm.allowedCategories.includes(event.category));
      const eventsWithRounds = await Promise.all(
        allowedEvents.map(async (event) => {
          const rounds2 = await storage.getRoundsByEvent(event.id);
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            category: event.category,
            rounds: rounds2.map((r) => ({
              id: r.id,
              name: r.name,
              startTime: r.startTime,
              endTime: r.endTime
            }))
          };
        })
      );
      const technical = eventsWithRounds.filter((e) => e.category === "technical");
      const non_technical = eventsWithRounds.filter((e) => e.category === "non_technical");
      return res.json({ technical, non_technical });
    } catch (error) {
      console.error("Get grouped events for registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/:id", requireAuth, requireEventAccess, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/events", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { name, description, type, category, startDate, endDate, status } = req.body;
      try {
        console.log(`Create event payload category: ${category}`);
      } catch (e) {
      }
      if (!name || !description || !type) {
        return res.status(400).json({ message: "Name, description, and type are required" });
      }
      if (category !== void 0 && !["technical", "non_technical"].includes(category)) {
        return res.status(400).json({ message: "Invalid category. Must be 'technical' or 'non_technical'." });
      }
      const existingEvent = await storage.getEventByName(name);
      if (existingEvent) {
        return res.status(400).json({ message: "An event with this name already exists" });
      }
      const event = await storage.createEvent({
        name,
        description,
        type,
        category: category ?? "technical",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || "draft",
        createdBy: req.user.id
      });
      try {
        console.log(`Event created: id=${event.id} category=${event.category} name=${event.name}`);
      } catch (e) {
      }
      await storage.createEventRules({
        eventId: event.id,
        noRefresh: true,
        noTabSwitch: true,
        forceFullscreen: true,
        disableShortcuts: true,
        autoSubmitOnViolation: true,
        maxTabSwitchWarnings: 2,
        additionalRules: null
      });
      res.status(201).json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/events/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { name, description, type, category, startDate, endDate, status } = req.body;
      try {
        console.log(`Update event payload for id=${req.params.id} incoming category: ${category}`);
      } catch (e) {
      }
      if (name !== void 0) {
        const existingEvent = await storage.getEventByName(name);
        if (existingEvent && existingEvent.id !== req.params.id) {
          return res.status(400).json({ message: "An event with this name already exists" });
        }
      }
      if (category !== void 0 && !["technical", "non_technical"].includes(category)) {
        return res.status(400).json({ message: "Invalid category. Must be 'technical' or 'non_technical'." });
      }
      const updateData = {};
      if (name !== void 0) updateData.name = name;
      if (description !== void 0) updateData.description = description;
      if (type !== void 0) updateData.type = type;
      if (category !== void 0) updateData.category = category;
      if (startDate !== void 0) updateData.startDate = new Date(startDate);
      if (endDate !== void 0) updateData.endDate = new Date(endDate);
      if (status !== void 0) updateData.status = status;
      const event = await storage.updateEvent(req.params.id, updateData);
      try {
        console.log(`Event updated: id=${event?.id} category=${event?.category} name=${event?.name}`);
      } catch (e) {
      }
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete("/api/events/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/events/:eventId/admins", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { adminId } = req.body;
      if (!adminId) {
        return res.status(400).json({ message: "Admin ID is required" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin || admin.role !== "event_admin") {
        return res.status(400).json({ message: "Invalid event admin" });
      }
      await storage.assignEventAdmin(req.params.eventId, adminId);
      res.json({ message: "Event admin assigned successfully" });
    } catch (error) {
      console.error("Assign event admin error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/:eventId/admins", requireAuth, requireEventAccess, async (req, res) => {
    try {
      const admins = await storage.getEventAdminsByEvent(req.params.eventId);
      const adminsWithoutPasswords = admins.map(({ password, ...admin }) => admin);
      res.json(adminsWithoutPasswords);
    } catch (error) {
      console.error("Get event admins error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete(
    "/api/events/:eventId/admins/:adminId",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        await storage.removeEventAdmin(req.params.eventId, req.params.adminId);
        res.json({ message: "Event admin removed successfully" });
      } catch (error) {
        console.error("Remove event admin error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/events/:eventId/rules", requireAuth, requireEventAccess, async (req, res) => {
    try {
      const rules = await storage.getEventRules(req.params.eventId);
      if (!rules) {
        return res.status(404).json({ message: "Event rules not found" });
      }
      res.json(rules);
    } catch (error) {
      console.error("Get event rules error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/events/:eventId/rules", requireAuth, requireEventAccess, async (req, res) => {
    try {
      const {
        noRefresh,
        noTabSwitch,
        forceFullscreen,
        disableShortcuts,
        autoSubmitOnViolation,
        maxTabSwitchWarnings,
        additionalRules
      } = req.body;
      const updateData = {};
      if (noRefresh !== void 0) updateData.noRefresh = noRefresh;
      if (noTabSwitch !== void 0) updateData.noTabSwitch = noTabSwitch;
      if (forceFullscreen !== void 0) updateData.forceFullscreen = forceFullscreen;
      if (disableShortcuts !== void 0) updateData.disableShortcuts = disableShortcuts;
      if (autoSubmitOnViolation !== void 0) updateData.autoSubmitOnViolation = autoSubmitOnViolation;
      if (maxTabSwitchWarnings !== void 0) updateData.maxTabSwitchWarnings = maxTabSwitchWarnings;
      if (additionalRules !== void 0) updateData.additionalRules = additionalRules;
      const rules = await storage.updateEventRules(req.params.eventId, updateData);
      if (!rules) {
        return res.status(404).json({ message: "Event rules not found" });
      }
      res.json(rules);
    } catch (error) {
      console.error("Update event rules error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/:eventId/rounds", requireAuth, requireEventAccess, async (req, res) => {
    try {
      const rounds2 = await storage.getRoundsByEvent(req.params.eventId);
      res.json(rounds2);
    } catch (error) {
      console.error("Get rounds error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post(
    "/api/events/:eventId/rounds",
    requireAuth,
    requireEventAdmin,
    requireEventAccess,
    async (req, res) => {
      try {
        const { name, description, roundNumber, duration, startTime, endTime, status } = req.body;
        if (!name || roundNumber === void 0 || !duration) {
          return res.status(400).json({ message: "Name, round number, and duration are required" });
        }
        const round = await storage.createRound({
          eventId: req.params.eventId,
          name,
          description: description || null,
          roundNumber,
          duration,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          status: status || "not_started"
        });
        await storage.createRoundRules({
          roundId: round.id,
          noRefresh: true,
          noTabSwitch: true,
          forceFullscreen: true,
          disableShortcuts: true,
          autoSubmitOnViolation: true,
          maxTabSwitchWarnings: 2,
          additionalRules: null
        });
        res.status(201).json(round);
      } catch (error) {
        console.error("Create round error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/rounds/:roundId", requireAuth, requireRoundAccess, async (req, res) => {
    try {
      const round = await storage.getRound(req.params.roundId);
      if (!round) {
        return res.status(404).json({ message: "Round not found" });
      }
      res.json(round);
    } catch (error) {
      console.error("Get round error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete(
    "/api/rounds/:roundId",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        await storage.deleteRound(req.params.roundId);
        res.json({ message: "Round deleted successfully" });
      } catch (error) {
        console.error("Delete round error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.patch(
    "/api/rounds/:roundId",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        const { name, description, roundNumber, duration, startTime, endTime, status } = req.body;
        const updateData = {};
        if (name !== void 0) updateData.name = name;
        if (description !== void 0) updateData.description = description;
        if (roundNumber !== void 0) updateData.roundNumber = roundNumber;
        if (duration !== void 0) updateData.duration = duration;
        if (startTime !== void 0) updateData.startTime = new Date(startTime);
        if (endTime !== void 0) updateData.endTime = new Date(endTime);
        if (status !== void 0) updateData.status = status;
        const round = await storage.updateRound(req.params.roundId, updateData);
        if (!round) {
          return res.status(404).json({ message: "Round not found" });
        }
        res.json(round);
      } catch (error) {
        console.error("Update round error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/rounds/:roundId/start",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        const round = await storage.getRound(req.params.roundId);
        if (!round) {
          return res.status(404).json({ message: "Round not found" });
        }
        if (round.status !== "not_started") {
          return res.status(400).json({ message: "Round can only be started when status is 'not_started'" });
        }
        const updatedRound = await storage.updateRoundStatus(req.params.roundId, "in_progress");
        const credentials = await storage.getEventCredentialsByEvent(round.eventId);
        await Promise.all(
          credentials.map((cred) => storage.updateEventCredentialTestStatus(cred.id, true, req.user.id))
        );
        WebSocketService.notifyRoundStatus(round.eventId, req.params.roundId, "in_progress", updatedRound);
        res.json(updatedRound);
      } catch (error) {
        console.error("Start round error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/rounds/:roundId/end",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        const round = await storage.getRound(req.params.roundId);
        if (!round) {
          return res.status(404).json({ message: "Round not found" });
        }
        if (round.status !== "in_progress") {
          return res.status(400).json({ message: "Round can only be ended when status is 'in_progress'" });
        }
        const updatedRound = await storage.updateRoundStatus(req.params.roundId, "completed");
        WebSocketService.notifyRoundStatus(round.eventId, req.params.roundId, "completed", updatedRound);
        res.json(updatedRound);
      } catch (error) {
        console.error("End round error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/rounds/:roundId/restart",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        const round = await storage.getRound(req.params.roundId);
        if (!round) {
          return res.status(404).json({ message: "Round not found" });
        }
        await storage.deleteTestAttemptsByRound(req.params.roundId);
        const updatedRound = await storage.updateRoundStatus(req.params.roundId, "not_started", null);
        const credentials = await storage.getEventCredentialsByEvent(round.eventId);
        await Promise.all(
          credentials.map((cred) => storage.updateEventCredentialTestStatus(cred.id, false, req.user.id))
        );
        WebSocketService.notifyRoundStatus(round.eventId, req.params.roundId, "not_started", updatedRound);
        res.json({
          message: "Round restarted successfully",
          round: updatedRound
        });
      } catch (error) {
        console.error("Restart round error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/rounds/:roundId/rules", requireAuth, requireRoundAccess, async (req, res) => {
    try {
      let rules = await storage.getRoundRules(req.params.roundId);
      if (!rules) {
        const round = await storage.getRound(req.params.roundId);
        if (!round) {
          return res.status(404).json({ message: "Round not found" });
        }
        rules = await storage.createRoundRules({
          roundId: req.params.roundId,
          noRefresh: true,
          noTabSwitch: true,
          forceFullscreen: true,
          disableShortcuts: true,
          autoSubmitOnViolation: true,
          maxTabSwitchWarnings: 2,
          additionalRules: null
        });
      }
      res.json(rules);
    } catch (error) {
      console.error("Get round rules error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch(
    "/api/rounds/:roundId/rules",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        const {
          noRefresh,
          noTabSwitch,
          forceFullscreen,
          disableShortcuts,
          autoSubmitOnViolation,
          maxTabSwitchWarnings,
          additionalRules
        } = req.body;
        const updateData = {};
        if (noRefresh !== void 0) updateData.noRefresh = noRefresh;
        if (noTabSwitch !== void 0) updateData.noTabSwitch = noTabSwitch;
        if (forceFullscreen !== void 0) updateData.forceFullscreen = forceFullscreen;
        if (disableShortcuts !== void 0) updateData.disableShortcuts = disableShortcuts;
        if (autoSubmitOnViolation !== void 0) updateData.autoSubmitOnViolation = autoSubmitOnViolation;
        if (maxTabSwitchWarnings !== void 0) updateData.maxTabSwitchWarnings = maxTabSwitchWarnings;
        if (additionalRules !== void 0) updateData.additionalRules = additionalRules;
        const rules = await storage.updateRoundRules(req.params.roundId, updateData);
        if (!rules) {
          return res.status(404).json({ message: "Round rules not found" });
        }
        res.json(rules);
      } catch (error) {
        console.error("Update round rules error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get(
    "/api/rounds/:roundId/questions",
    requireAuth,
    requireRoundAccess,
    async (req, res) => {
      try {
        const questions2 = await storage.getQuestionsByRound(req.params.roundId);
        res.json(questions2);
      } catch (error) {
        console.error("Get questions error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/rounds/:roundId/questions",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        const {
          questionType,
          questionText,
          questionNumber,
          points,
          options,
          correctAnswer,
          expectedOutput,
          testCases
        } = req.body;
        if (!questionType || !questionText || questionNumber === void 0) {
          return res.status(400).json({ message: "Question type, text, and number are required" });
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
          testCases: testCases || null
        });
        res.status(201).json(question);
      } catch (error) {
        console.error("Create question error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/rounds/:roundId/questions/bulk",
    requireAuth,
    requireEventAdmin,
    requireRoundAccess,
    async (req, res) => {
      try {
        const { questions: questions2 } = req.body;
        if (!questions2 || !Array.isArray(questions2) || questions2.length === 0) {
          return res.status(400).json({ message: "Questions array is required and must not be empty" });
        }
        const errors = [];
        const createdQuestions = [];
        for (let i = 0; i < questions2.length; i++) {
          const q = questions2[i];
          if (!q.questionText || q.questionNumber === void 0) {
            errors.push(`Question ${i + 1}: questionText and questionNumber are required`);
            continue;
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
              testCases: q.testCases || null
            });
            createdQuestions.push(question);
          } catch (error) {
            errors.push(`Question ${i + 1}: ${error.message}`);
          }
        }
        if (errors.length > 0 && createdQuestions.length === 0) {
          return res.status(400).json({ message: "Failed to create any questions", errors });
        }
        res.status(201).json({
          message: `Successfully created ${createdQuestions.length} questions`,
          created: createdQuestions.length,
          errors: errors.length > 0 ? errors : void 0,
          questions: createdQuestions
        });
      } catch (error) {
        console.error("Bulk create questions error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/events/:eventId/participants",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const participant = await storage.registerParticipant({
          eventId: req.params.eventId,
          userId: req.user.id,
          status: "registered"
        });
        res.status(201).json(participant);
      } catch (error) {
        console.error("Register participant error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get(
    "/api/events/:eventId/participants",
    requireAuth,
    requireEventAccess,
    async (req, res) => {
      try {
        const participants2 = await storage.getParticipantsByEvent(req.params.eventId);
        res.json(participants2);
      } catch (error) {
        console.error("Get participants error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get(
    "/api/participants/my-registrations",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const participants2 = await storage.getParticipantsByUser(req.user.id);
        res.json(participants2);
      } catch (error) {
        console.error("Get my registrations error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/event-admin/participants", requireAuth, requireEventAdmin, async (req, res) => {
    try {
      const participants2 = await storage.getParticipantsByAdmin(req.user.id);
      const participantsWithoutPasswords = participants2.map((p) => ({
        ...p,
        user: p.user ? (({ password, ...user }) => user)(p.user) : p.user
      }));
      res.json(participantsWithoutPasswords);
    } catch (error) {
      console.error("Get admin participants error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/event-admin/my-event", requireAuth, requireEventAdmin, async (req, res) => {
    try {
      const events2 = await storage.getEventsByAdmin(req.user.id);
      if (events2.length === 0) {
        return res.status(404).json({ message: "No event assigned to this admin" });
      }
      const event = events2[0];
      const participants2 = await storage.getParticipantsByEvent(event.id);
      const participantCount = participants2.length;
      res.json({
        event,
        participantCount
      });
    } catch (error) {
      console.error("Get my event error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post(
    "/api/events/:eventId/rounds/:roundId/start",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const { roundId } = req.params;
        const userId = req.user.id;
        const existingAttempt = await storage.getTestAttemptByUserAndRound(userId, roundId);
        if (existingAttempt) {
          return res.status(400).json({ message: "You already have an attempt for this round" });
        }
        const round = await storage.getRound(roundId);
        if (!round) {
          return res.status(404).json({ message: "Round not found" });
        }
        const questions2 = await storage.getQuestionsByRound(roundId);
        const maxScore = questions2.reduce((sum, q) => sum + q.points, 0);
        const attempt = await storage.createTestAttempt({
          roundId,
          userId,
          status: "in_progress",
          tabSwitchCount: 0,
          refreshAttemptCount: 0,
          violationLogs: [],
          totalScore: 0,
          maxScore
        });
        res.status(201).json(attempt);
      } catch (error) {
        console.error("Start test attempt error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get(
    "/api/participants/rounds/:roundId/my-attempt",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const { roundId } = req.params;
        const userId = req.user.id;
        const existingAttempt = await storage.getTestAttemptByUserAndRound(userId, roundId);
        if (!existingAttempt) {
          return res.json({ attempt: null });
        }
        res.json({ attempt: existingAttempt });
      } catch (error) {
        console.error("Get my attempt error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/attempts/:attemptId", requireAuth, async (req, res) => {
    try {
      const attempt = await storage.getTestAttempt(req.params.attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      if (attempt.userId !== req.user.id && req.user.role === "participant") {
        return res.status(403).json({ message: "Access denied" });
      }
      const round = await storage.getRound(attempt.roundId);
      const questions2 = await storage.getQuestionsByRound(attempt.roundId);
      const answers2 = await storage.getAnswersByAttempt(attempt.id);
      const event = round ? await storage.getEvent(round.eventId) : null;
      const eventHasEnded = event?.endDate ? /* @__PURE__ */ new Date() > new Date(event.endDate) : false;
      let attemptDurationElapsed = false;
      if (attempt.startedAt && round?.duration) {
        const attemptEndTime = new Date(attempt.startedAt).getTime() + round.duration * 60 * 1e3;
        attemptDurationElapsed = Date.now() > attemptEndTime;
      }
      const eventEnded = eventHasEnded || attemptDurationElapsed;
      const isAdmin = req.user.role === "super_admin" || req.user.role === "event_admin";
      let responseData = {
        ...attempt,
        round,
        questions: questions2,
        answers: answers2,
        event,
        eventEnded
      };
      if (!eventEnded && !isAdmin && req.user.role === "participant") {
        responseData = {
          ...attempt,
          totalScore: null,
          maxScore: null,
          round: {
            ...round
          },
          questions: questions2.map((q) => ({
            ...q,
            correctAnswer: null
            // Hide correct answers
          })),
          answers: answers2.map((a) => ({
            ...a,
            isCorrect: null,
            // Hide correctness
            pointsAwarded: null
            // Hide points
          })),
          event,
          eventEnded
        };
      }
      res.json(responseData);
    } catch (error) {
      console.error("Get test attempt error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post(
    "/api/attempts/:attemptId/answers",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const { attemptId } = req.params;
        const { questionId, answer } = req.body;
        if (!questionId || answer === void 0) {
          return res.status(400).json({ message: "Question ID and answer are required" });
        }
        const attempt = await storage.getTestAttempt(attemptId);
        if (!attempt) {
          return res.status(404).json({ message: "Test attempt not found" });
        }
        if (attempt.userId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (attempt.status !== "in_progress") {
          return res.status(400).json({ message: "Test is not in progress" });
        }
        const existingAnswers = await storage.getAnswersByAttempt(attemptId);
        const existingAnswer = existingAnswers.find((a) => a.questionId === questionId);
        let savedAnswer;
        if (existingAnswer) {
          savedAnswer = await storage.updateAnswer(existingAnswer.id, { answer });
        } else {
          savedAnswer = await storage.createAnswer({
            attemptId,
            questionId,
            answer,
            isCorrect: false,
            pointsAwarded: 0
          });
        }
        res.json(savedAnswer);
      } catch (error) {
        console.error("Save answer error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/attempts/:attemptId/violations",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const { attemptId } = req.params;
        const { type } = req.body;
        const attempt = await storage.getTestAttempt(attemptId);
        if (!attempt) {
          return res.status(404).json({ message: "Test attempt not found" });
        }
        if (attempt.userId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (attempt.status !== "in_progress") {
          return res.status(400).json({ message: "Test is not in progress" });
        }
        const violationLogs = attempt.violationLogs || [];
        violationLogs.push({
          type,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        const updates = { violationLogs };
        if (type === "tab_switch") {
          updates.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
        } else if (type === "refresh") {
          updates.refreshAttemptCount = (attempt.refreshAttemptCount || 0) + 1;
        }
        const updatedAttempt = await storage.updateTestAttempt(attemptId, updates);
        res.json(updatedAttempt);
      } catch (error) {
        console.error("Log violation error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post(
    "/api/attempts/:attemptId/submit",
    requireAuth,
    requireParticipant,
    async (req, res) => {
      try {
        const { attemptId } = req.params;
        const attempt = await storage.getTestAttempt(attemptId);
        if (!attempt) {
          return res.status(404).json({ message: "Test attempt not found" });
        }
        if (attempt.userId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (attempt.status !== "in_progress") {
          return res.status(400).json({ message: "Test is already submitted" });
        }
        const questions2 = await storage.getQuestionsByRound(attempt.roundId);
        const answers2 = await storage.getAnswersByAttempt(attemptId);
        let totalScore = 0;
        for (const answer of answers2) {
          const question = questions2.find((q) => q.id === answer.questionId);
          if (!question) continue;
          let isCorrect = false;
          let pointsAwarded = 0;
          if (question.questionType === "multiple_choice" || question.questionType === "true_false") {
            isCorrect = answer.answer.toLowerCase() === (question.correctAnswer || "").toLowerCase();
            pointsAwarded = isCorrect ? question.points : 0;
          } else {
            isCorrect = false;
            pointsAwarded = 0;
          }
          totalScore += pointsAwarded;
          await storage.updateAnswer(answer.id, {
            isCorrect,
            pointsAwarded
          });
        }
        const updatedAttempt = await storage.updateTestAttempt(attemptId, {
          status: "completed",
          submittedAt: /* @__PURE__ */ new Date(),
          completedAt: /* @__PURE__ */ new Date(),
          totalScore
        });
        const round = await storage.getRound(attempt.roundId);
        if (round) {
          WebSocketService.notifyResultPublished(attempt.userId, round.eventId, updatedAttempt);
        }
        res.json(updatedAttempt);
      } catch (error) {
        console.error("Submit test error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/participants/my-attempts", requireAuth, requireParticipant, async (req, res) => {
    try {
      const attempts = await storage.getTestAttemptsByUser(req.user.id);
      res.json(attempts);
    } catch (error) {
      console.error("Get my attempts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/rounds/:roundId/leaderboard", requireAuth, async (req, res) => {
    try {
      const { roundId } = req.params;
      const leaderboard = await storage.getRoundLeaderboard(roundId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get round leaderboard error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/:eventId/leaderboard", requireAuth, async (req, res) => {
    try {
      const { eventId } = req.params;
      const leaderboard = await storage.getEventLeaderboard(eventId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get event leaderboard error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/reports", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const reports2 = await storage.getReports();
      res.json(reports2);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/reports/generate/event", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { eventId } = req.body;
      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }
      const report = await storage.generateEventReport(eventId, req.user.id);
      res.status(201).json(report);
    } catch (error) {
      console.error("Generate event report error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });
  app2.post(
    "/api/reports/generate/symposium",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const report = await storage.generateSymposiumReport(req.user.id);
        res.status(201).json(report);
      } catch (error) {
        console.error("Generate symposium report error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/reports/:id/download", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const report = await storage.getReport(id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${report.title.replace(/[^a-z0-9]/gi, "_")}_${id}.json"`
      );
      res.json(report.reportData);
    } catch (error) {
      console.error("Download report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post(
    "/api/admin/backfill-round-rules",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const events2 = await storage.getEvents();
        let processedCount = 0;
        let createdCount = 0;
        for (const event of events2) {
          const rounds2 = await storage.getRoundsByEvent(event.id);
          for (const round of rounds2) {
            processedCount++;
            const existingRules = await storage.getRoundRules(round.id);
            if (!existingRules) {
              await storage.createRoundRules({
                roundId: round.id,
                noRefresh: true,
                noTabSwitch: true,
                forceFullscreen: true,
                disableShortcuts: true,
                autoSubmitOnViolation: true,
                maxTabSwitchWarnings: 2,
                additionalRules: null
              });
              createdCount++;
            }
          }
        }
        res.json({
          message: "Backfill completed successfully",
          processedRounds: processedCount,
          createdRules: createdCount
        });
      } catch (error) {
        console.error("Backfill round rules error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.post("/api/registration-forms", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { title, description, formFields } = req.body;
      if (!title || !formFields || !Array.isArray(formFields)) {
        return res.status(400).json({ message: "Title and formFields are required" });
      }
      const slug = generateFormSlug(title);
      const form = await storage.createRegistrationForm(title, description || "", formFields, slug);
      res.status(201).json(form);
    } catch (error) {
      console.error("Create registration form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/registration-forms/active", async (req, res) => {
    try {
      const form = await storage.getActiveRegistrationForm();
      if (!form) {
        return res.status(404).json({ message: "No active registration form found" });
      }
      res.json(form);
    } catch (error) {
      console.error("Get active registration form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/registration-forms/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const updates = req.body;
      const form = await storage.updateRegistrationForm(req.params.id, updates);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      console.error("Update registration form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/registration-forms/all", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const forms = await storage.getAllRegistrationForms();
      res.json(forms);
    } catch (error) {
      console.error("Get all registration forms error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/registration-forms/:slug", async (req, res) => {
    try {
      const form = await storage.getRegistrationFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      console.error("Get registration form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/registration-forms/:slug/submit", async (req, res) => {
    try {
      const form = await storage.getRegistrationFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (!form.isActive) {
        return res.status(400).json({ message: "This form is no longer accepting submissions" });
      }
      const { submittedData, selectedEvents } = req.body;
      if (!submittedData || !selectedEvents || !Array.isArray(selectedEvents)) {
        return res.status(400).json({ message: "submittedData and selectedEvents are required" });
      }
      const events2 = await storage.getEventsByIds(selectedEvents);
      const invalidEvents = events2.filter((event) => !form.allowedCategories.includes(event.category));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          message: `The following events are not allowed by this form: ${invalidEvents.map((e) => e.name).join(", ")}`
        });
      }
      const validation = await validateEventSelection(selectedEvents);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      const registration = await storage.createRegistration(form.id, submittedData, selectedEvents);
      for (const eventId of selectedEvents) {
        const event = await storage.getEventById(eventId);
        WebSocketService.notifyRegistrationUpdate(eventId, {
          ...registration,
          eventName: event?.name || "Unknown Event"
        });
      }
      res.status(201).json(registration);
    } catch (error) {
      console.error("Submit registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/registrations", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin" && user.role !== "registration_committee") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const registrations2 = await storage.getRegistrations();
      res.json(registrations2);
    } catch (error) {
      console.error("Get registrations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/registrations/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin" && user.role !== "registration_committee") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const registration = await storage.getRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      if (registration.paymentStatus !== "pending") {
        return res.status(400).json({ message: "Registration has already been processed" });
      }
      const password = generateSecurePassword();
      const userData = registration.submittedData;
      const extractEmail = (data) => {
        for (const value of Object.values(data)) {
          if (value && typeof value === "string" && value.includes("@") && value.includes(".")) {
            return value;
          }
        }
        throw new Error("Email not found in registration data");
      };
      const extractFullName = (data) => {
        for (const value of Object.values(data)) {
          if (value && typeof value === "string" && value.includes(" ") && !value.includes("@")) {
            return value;
          }
        }
        return "Participant";
      };
      const email = extractEmail(userData);
      const fullName = extractFullName(userData);
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({
        username: `DISABLED_${nanoid(16)}`,
        password: hashedPassword,
        email,
        fullName,
        role: "participant"
      });
      const eventCredentialsList = [];
      for (const eventId of registration.selectedEvents) {
        await storage.createParticipant(newUser.id, eventId);
        const event = await storage.getEventById(eventId);
        if (!event) continue;
        const count = await storage.getEventCredentialCountForEvent(eventId);
        const counter = count + 1;
        const { username: eventUsername, password: eventPassword } = generateHumanReadableCredentials(
          fullName,
          event.name,
          counter
        );
        await storage.createEventCredential(newUser.id, eventId, eventUsername, eventPassword);
        eventCredentialsList.push({
          eventId,
          eventName: event.name,
          eventUsername,
          eventPassword
        });
      }
      const updated = await storage.updateRegistrationStatus(req.params.id, "paid", newUser.id, user.id);
      for (const eventCred of eventCredentialsList) {
        await emailService.sendRegistrationApproved(
          email,
          fullName,
          eventCred.eventName,
          eventCred.eventUsername,
          eventCred.eventPassword
        );
      }
      res.json({
        registration: updated,
        mainCredentials: {
          username: newUser.username,
          password,
          email: newUser.email
        },
        eventCredentials: eventCredentialsList
      });
    } catch (error) {
      console.error("Approve registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post(
    "/api/registration-committee/participants",
    requireAuth,
    requireRegistrationCommittee,
    async (req, res) => {
      try {
        const user = req.user;
        const { fullName, email, phone, selectedEvents } = req.body;
        if (!fullName || !email || !selectedEvents || selectedEvents.length === 0) {
          return res.status(400).json({ message: "Full name, email, and at least one event are required" });
        }
        const validation = await validateEventSelection(selectedEvents);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.error });
        }
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
        const password = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await storage.createUser({
          username: `DISABLED_${nanoid(16)}`,
          password: hashedPassword,
          email,
          fullName,
          phone: phone || null,
          role: "participant",
          createdBy: user.id
        });
        const eventCredentialsList = [];
        for (const eventId of selectedEvents) {
          await storage.createParticipant(newUser.id, eventId);
          const event = await storage.getEventById(eventId);
          if (!event) continue;
          const count = await storage.getEventCredentialCountForEvent(eventId);
          const counter = count + 1;
          const { username: eventUsername, password: eventPassword } = generateHumanReadableCredentials(
            fullName,
            event.name,
            counter
          );
          await storage.createEventCredential(newUser.id, eventId, eventUsername, eventPassword);
          eventCredentialsList.push({
            eventId,
            eventName: event.name,
            eventUsername,
            eventPassword
          });
        }
        for (const eventCred of eventCredentialsList) {
          await emailService.sendCredentials(
            email,
            fullName,
            eventCred.eventName,
            eventCred.eventUsername,
            eventCred.eventPassword
          );
        }
        for (const eventCred of eventCredentialsList) {
          WebSocketService.notifyRegistrationUpdate(eventCred.eventId, {
            participantId: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email,
            eventName: eventCred.eventName
          });
        }
        res.status(201).json({
          participant: {
            id: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email,
            phone: newUser.phone
          },
          mainCredentials: {
            username: newUser.username,
            password,
            email: newUser.email
          },
          eventCredentials: eventCredentialsList
        });
      } catch (error) {
        console.error("Create on-spot participant error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get(
    "/api/registration-committee/participants",
    requireAuth,
    requireRegistrationCommittee,
    async (req, res) => {
      try {
        const user = req.user;
        const participants2 = await storage.getOnSpotParticipantsByCreator(user.id);
        res.json(participants2);
      } catch (error) {
        console.error("Get on-spot participants error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.patch(
    "/api/registration-committee/participants/:id",
    requireAuth,
    requireRegistrationCommittee,
    async (req, res) => {
      try {
        const user = req.user;
        const { fullName, email, phone } = req.body;
        const participant = await storage.getUser(req.params.id);
        if (!participant) {
          return res.status(404).json({ message: "Participant not found" });
        }
        if (participant.createdBy !== user.id) {
          return res.status(403).json({ message: "You can only edit participants you created" });
        }
        const updates = {};
        if (fullName !== void 0) updates.fullName = fullName;
        if (email !== void 0) updates.email = email;
        if (phone !== void 0) updates.phone = phone;
        const updatedUser = await storage.updateUserDetails(req.params.id, updates);
        if (!updatedUser) {
          return res.status(404).json({ message: "Participant not found" });
        }
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Update on-spot participant error:", error);
        if (error.message === "Email already exists") {
          return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.delete(
    "/api/registration-committee/participants/:id",
    requireAuth,
    requireRegistrationCommittee,
    async (req, res) => {
      try {
        const user = req.user;
        const participant = await storage.getUser(req.params.id);
        if (!participant) {
          return res.status(404).json({ message: "Participant not found" });
        }
        if (participant.createdBy !== user.id) {
          return res.status(403).json({ message: "You can only delete participants you created" });
        }
        await storage.deleteUser(req.params.id);
        res.json({ message: "Participant deleted successfully" });
      } catch (error) {
        console.error("Delete on-spot participant error:", error);
        res.status(500).json({ message: "Failed to delete participant" });
      }
    }
  );
  app2.get(
    "/api/registration-committee/participants/export/csv",
    requireAuth,
    requireRegistrationCommittee,
    async (req, res) => {
      try {
        const user = req.user;
        const participants2 = await storage.getOnSpotParticipantsByCreator(user.id);
        const csvRows = [];
        csvRows.push("Participant Name,Email,Phone,Event Name,Username,Password");
        for (const participant of participants2) {
          const { fullName, email, phone, eventCredentials: eventCredentials2 } = participant;
          if (eventCredentials2 && eventCredentials2.length > 0) {
            for (const credential of eventCredentials2) {
              const phoneValue = phone || "";
              const eventName = credential.event.name;
              const username = credential.eventUsername;
              const password = credential.eventPassword;
              const escapedFullName = `"${fullName.replace(/"/g, '""')}"`;
              const escapedEmail = `"${email.replace(/"/g, '""')}"`;
              const escapedPhone = `"${phoneValue.replace(/"/g, '""')}"`;
              const escapedEventName = `"${eventName.replace(/"/g, '""')}"`;
              const escapedUsername = `"${username.replace(/"/g, '""')}"`;
              const escapedPassword = `"${password.replace(/"/g, '""')}"`;
              csvRows.push(
                `${escapedFullName},${escapedEmail},${escapedPhone},${escapedEventName},${escapedUsername},${escapedPassword}`
              );
            }
          }
        }
        const csvContent = csvRows.join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="participants-credentials.csv"');
        res.send(csvContent);
      } catch (error) {
        console.error("CSV export error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get(
    "/api/registration-committee/participants/export/pdf",
    requireAuth,
    requireRegistrationCommittee,
    async (req, res) => {
      try {
        const user = req.user;
        const participants2 = await storage.getOnSpotParticipantsByCreator(user.id);
        const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="participants-credentials.pdf"');
        doc.pipe(res);
        doc.fontSize(20).font("Helvetica-Bold").text("Participant Credentials - BootFeet 2K26", { align: "center" });
        doc.moveDown(0.5);
        const generatedDate = (/* @__PURE__ */ new Date()).toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short"
        });
        doc.fontSize(10).font("Helvetica").text(`Generated: ${generatedDate}`, { align: "center" });
        doc.moveDown(1.5);
        const tableTop = doc.y;
        const colWidths = [120, 150, 80, 120, 120, 100];
        const rowHeight = 25;
        let currentY = tableTop;
        const drawTableHeader = (y) => {
          doc.font("Helvetica-Bold").fontSize(9);
          doc.rect(50, y, colWidths[0], rowHeight).fillAndStroke("#4A5568", "#000");
          doc.fillColor("#FFF").text("Participant Name", 55, y + 8, { width: colWidths[0] - 10 });
          let xPos = 50 + colWidths[0];
          doc.rect(xPos, y, colWidths[1], rowHeight).fillAndStroke("#4A5568", "#000");
          doc.fillColor("#FFF").text("Email", xPos + 5, y + 8, { width: colWidths[1] - 10 });
          xPos += colWidths[1];
          doc.rect(xPos, y, colWidths[2], rowHeight).fillAndStroke("#4A5568", "#000");
          doc.fillColor("#FFF").text("Phone", xPos + 5, y + 8, { width: colWidths[2] - 10 });
          xPos += colWidths[2];
          doc.rect(xPos, y, colWidths[3], rowHeight).fillAndStroke("#4A5568", "#000");
          doc.fillColor("#FFF").text("Event", xPos + 5, y + 8, { width: colWidths[3] - 10 });
          xPos += colWidths[3];
          doc.rect(xPos, y, colWidths[4], rowHeight).fillAndStroke("#4A5568", "#000");
          doc.fillColor("#FFF").text("Username", xPos + 5, y + 8, { width: colWidths[4] - 10 });
          xPos += colWidths[4];
          doc.rect(xPos, y, colWidths[5], rowHeight).fillAndStroke("#4A5568", "#000");
          doc.fillColor("#FFF").text("Password", xPos + 5, y + 8, { width: colWidths[5] - 10 });
          return y + rowHeight;
        };
        currentY = drawTableHeader(currentY);
        doc.font("Helvetica").fontSize(8);
        let rowIndex = 0;
        for (const participant of participants2) {
          const { fullName, email, phone, eventCredentials: eventCredentials2 } = participant;
          if (eventCredentials2 && eventCredentials2.length > 0) {
            for (const credential of eventCredentials2) {
              if (currentY > 500) {
                doc.addPage({ margin: 50, size: "A4", layout: "landscape" });
                currentY = 50;
                currentY = drawTableHeader(currentY);
                rowIndex = 0;
              }
              const bgColor = rowIndex % 2 === 0 ? "#F7FAFC" : "#FFFFFF";
              doc.rect(50, currentY, colWidths[0], rowHeight).fillAndStroke(bgColor, "#000");
              doc.fillColor("#000").text(fullName, 55, currentY + 8, { width: colWidths[0] - 10, ellipsis: true });
              let xPos = 50 + colWidths[0];
              doc.rect(xPos, currentY, colWidths[1], rowHeight).fillAndStroke(bgColor, "#000");
              doc.fillColor("#000").text(email, xPos + 5, currentY + 8, { width: colWidths[1] - 10, ellipsis: true });
              xPos += colWidths[1];
              doc.rect(xPos, currentY, colWidths[2], rowHeight).fillAndStroke(bgColor, "#000");
              doc.fillColor("#000").text(phone || "", xPos + 5, currentY + 8, { width: colWidths[2] - 10, ellipsis: true });
              xPos += colWidths[2];
              doc.rect(xPos, currentY, colWidths[3], rowHeight).fillAndStroke(bgColor, "#000");
              doc.fillColor("#000").text(credential.event.name, xPos + 5, currentY + 8, { width: colWidths[3] - 10, ellipsis: true });
              xPos += colWidths[3];
              doc.rect(xPos, currentY, colWidths[4], rowHeight).fillAndStroke(bgColor, "#000");
              doc.fillColor("#000").text(credential.eventUsername, xPos + 5, currentY + 8, { width: colWidths[4] - 10, ellipsis: true });
              xPos += colWidths[4];
              doc.rect(xPos, currentY, colWidths[5], rowHeight).fillAndStroke(bgColor, "#000");
              doc.fillColor("#000").text(credential.eventPassword, xPos + 5, currentY + 8, { width: colWidths[5] - 10, ellipsis: true });
              currentY += rowHeight;
              rowIndex++;
            }
          }
        }
        doc.end();
      } catch (error) {
        console.error("PDF export error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/events/:eventId/event-credentials", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const { eventId } = req.params;
      if (user.role === "event_admin") {
        const isEventAdmin = await storage.isUserEventAdmin(user.id, eventId);
        if (!isEventAdmin) {
          return res.status(403).json({ message: "Not authorized for this event" });
        }
      } else if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const credentials = await storage.getEventCredentialsByEvent(eventId);
      res.json(credentials);
    } catch (error) {
      console.error("Get event credentials error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/event-credentials/:credentialId/id-pass", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const { credentialId } = req.params;
      const credential = await storage.getEventCredential(credentialId);
      if (!credential) {
        return res.status(404).json({ message: "Credential not found" });
      }
      const participant = await storage.getUserById(credential.participantUserId);
      const event = await storage.getEventById(credential.eventId);
      if (!participant || !event) {
        return res.status(404).json({ message: "Participant or event not found" });
      }
      if (user.role === "event_admin") {
        const isEventAdmin = await storage.isUserEventAdmin(user.id, event.id);
        if (!isEventAdmin) {
          return res.status(403).json({ message: "Not authorized for this event" });
        }
      } else if (user.role !== "super_admin" && user.role !== "registration_committee") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const registration = await storage.getRegistrationByUserId(participant.id);
      const paymentStatus = registration?.paymentStatus || "pending";
      const doc = new PDFDocument({
        size: [400, 600],
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="id-pass-${participant.fullName.replace(/\s+/g, "-")}-${event.name.replace(/\s+/g, "-")}.pdf"`);
      doc.pipe(res);
      doc.rect(0, 0, 400, 600).fillAndStroke("#f8f9fa");
      doc.rect(0, 0, 400, 120).fillAndStroke("#4A5568");
      doc.fontSize(24).fillColor("#FFF").font("Helvetica-Bold");
      doc.text("SYMPOSIUM", 0, 30, { align: "center", width: 400 });
      doc.fontSize(12).font("Helvetica");
      doc.text("ID PASS", 0, 60, { align: "center", width: 400 });
      doc.fillColor("#000").fontSize(14).font("Helvetica-Bold");
      doc.text("Participant Details", 40, 140);
      doc.fontSize(10).font("Helvetica");
      let yPos = 165;
      doc.fillColor("#4A5568").text("Name:", 40, yPos, { continued: true });
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${participant.fullName}`, { continued: false });
      yPos += 25;
      doc.fillColor("#4A5568").font("Helvetica").text("Email:", 40, yPos, { continued: true });
      doc.fillColor("#000").text(` ${participant.email}`, { continued: false });
      yPos += 25;
      doc.fillColor("#4A5568").text("Event:", 40, yPos, { continued: true });
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${event.name}`, { continued: false });
      yPos += 30;
      doc.strokeColor("#E2E8F0").moveTo(40, yPos).lineTo(360, yPos).stroke();
      yPos += 20;
      doc.fontSize(14).fillColor("#000").font("Helvetica-Bold");
      doc.text("Event Credentials", 40, yPos);
      yPos += 25;
      doc.fontSize(11).font("Helvetica");
      doc.fillColor("#4A5568").text("Username:", 40, yPos, { continued: true });
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${credential.eventUsername}`, { continued: false });
      yPos += 25;
      doc.fillColor("#4A5568").font("Helvetica").text("Password:", 40, yPos, { continued: true });
      doc.fillColor("#000").font("Helvetica-Bold").text(` ${credential.eventPassword}`, { continued: false });
      yPos += 30;
      doc.strokeColor("#E2E8F0").moveTo(40, yPos).lineTo(360, yPos).stroke();
      yPos += 20;
      doc.fontSize(14).fillColor("#000").font("Helvetica-Bold");
      doc.text("Status", 40, yPos);
      yPos += 25;
      const statusColor = paymentStatus === "paid" ? "#10B981" : paymentStatus === "pending" ? "#F59E0B" : "#EF4444";
      doc.fontSize(11).font("Helvetica");
      doc.fillColor("#4A5568").text("Payment:", 40, yPos, { continued: true });
      doc.fillColor(statusColor).font("Helvetica-Bold").text(` ${paymentStatus.toUpperCase()}`, { continued: false });
      yPos += 25;
      doc.fillColor("#4A5568").font("Helvetica").text("Participant ID:", 40, yPos, { continued: true });
      doc.fillColor("#000").text(` ${credential.id.substring(0, 8).toUpperCase()}`, { continued: false });
      yPos += 35;
      const qrData = JSON.stringify({
        participantId: participant.id,
        eventId: event.id,
        credentialId: credential.id,
        username: credential.eventUsername,
        status: paymentStatus
      });
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 120,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        });
        const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
        doc.image(qrBuffer, 140, yPos, { width: 120, height: 120 });
        yPos += 130;
        doc.fontSize(8).fillColor("#6B7280").font("Helvetica");
        doc.text("Scan for verification", 0, yPos, { align: "center", width: 400 });
      } catch (qrError) {
        console.error("QR code generation error:", qrError);
      }
      doc.fontSize(8).fillColor("#9CA3AF");
      doc.text(
        `Generated on ${(/* @__PURE__ */ new Date()).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
        0,
        560,
        { align: "center", width: 400 }
      );
      doc.end();
    } catch (error) {
      console.error("Generate ID Pass error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch(
    "/api/event-credentials/:credentialId/enable-test",
    requireAuth,
    async (req, res) => {
      try {
        const user = req.user;
        const { credentialId } = req.params;
        const credential = await storage.getEventCredential(credentialId);
        if (!credential) {
          return res.status(404).json({ message: "Event credential not found" });
        }
        if (user.role === "event_admin") {
          const isEventAdmin = await storage.isUserEventAdmin(user.id, credential.eventId);
          if (!isEventAdmin) {
            return res.status(403).json({ message: "Not authorized for this event" });
          }
        } else if (user.role !== "super_admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const updatedCredential = await storage.updateEventCredentialTestStatus(credentialId, true, user.id);
        res.json(updatedCredential);
      } catch (error) {
        console.error("Enable test access error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.patch(
    "/api/event-credentials/:credentialId/disable-test",
    requireAuth,
    async (req, res) => {
      try {
        const user = req.user;
        const { credentialId } = req.params;
        const credential = await storage.getEventCredential(credentialId);
        if (!credential) {
          return res.status(404).json({ message: "Event credential not found" });
        }
        if (user.role === "event_admin") {
          const isEventAdmin = await storage.isUserEventAdmin(user.id, credential.eventId);
          if (!isEventAdmin) {
            return res.status(403).json({ message: "Not authorized for this event" });
          }
        } else if (user.role !== "super_admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const updatedCredential = await storage.updateEventCredentialTestStatus(credentialId, false, user.id);
        res.json(updatedCredential);
      } catch (error) {
        console.error("Disable test access error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/events/:eventId/credentials-status", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const { eventId } = req.params;
      if (user.role === "event_admin") {
        const isEventAdmin = await storage.isUserEventAdmin(user.id, eventId);
        if (!isEventAdmin) {
          return res.status(403).json({ message: "Not authorized for this event" });
        }
      } else if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const credentialsWithParticipants = await storage.getEventCredentialsWithParticipants(eventId);
      const result = credentialsWithParticipants.map((cred) => ({
        id: cred.id,
        participantUserId: cred.participantUserId,
        eventUsername: cred.eventUsername,
        testEnabled: cred.testEnabled,
        enabledAt: cred.enabledAt,
        enabledBy: cred.enabledBy,
        participantFullName: cred.participant.fullName,
        participantEmail: cred.participant.email
      }));
      res.json(result);
    } catch (error) {
      console.error("Get credentials status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get(
    "/api/reports/export/event/:eventId/excel",
    requireAuth,
    requireEventAdminOrSuperAdmin,
    async (req, res) => {
      try {
        const { eventId } = req.params;
        const event = await storage.getEvent(eventId);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }
        const rounds2 = await storage.getRoundsByEvent(eventId);
        const participants2 = await storage.getParticipantsByEvent(eventId);
        const leaderboard = await storage.getEventLeaderboard(eventId);
        const workbook = new ExcelJS.Workbook();
        const sheet1 = workbook.addWorksheet("Event Overview");
        sheet1.columns = [
          { header: "Metric", key: "metric", width: 30 },
          { header: "Value", key: "value", width: 40 }
        ];
        const completedAttempts = leaderboard.length;
        const avgCompletionRate = participants2.length > 0 ? (completedAttempts / participants2.length * 100).toFixed(2) : "0";
        sheet1.addRows([
          { metric: "Event Name", value: event.name },
          { metric: "Event Type", value: event.type },
          { metric: "Event Status", value: event.status },
          { metric: "Total Participants", value: participants2.length },
          { metric: "Total Rounds", value: rounds2.length },
          { metric: "Average Completion Rate", value: `${avgCompletionRate}%` }
        ]);
        sheet1.getRow(1).font = { bold: true };
        sheet1.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        const sheet2 = workbook.addWorksheet("Round Details");
        sheet2.columns = [
          { header: "Round Name", key: "name", width: 20 },
          { header: "Duration (min)", key: "duration", width: 15 },
          { header: "Start Time", key: "startTime", width: 25 },
          { header: "End Time", key: "endTime", width: 25 },
          { header: "Participants Attempted", key: "attempted", width: 25 },
          { header: "Avg Score", key: "avgScore", width: 15 },
          { header: "Completion Rate", key: "completionRate", width: 20 }
        ];
        for (const round of rounds2) {
          const roundLeaderboard = await storage.getRoundLeaderboard(round.id);
          const avgScore = roundLeaderboard.length > 0 ? (roundLeaderboard.reduce((sum, r) => sum + (r.totalScore || 0), 0) / roundLeaderboard.length).toFixed(2) : "0";
          const completionRate = participants2.length > 0 ? (roundLeaderboard.length / participants2.length * 100).toFixed(2) : "0";
          sheet2.addRow({
            name: round.name,
            duration: round.duration,
            startTime: round.startTime ? new Date(round.startTime).toLocaleString() : "Not set",
            endTime: round.endTime ? new Date(round.endTime).toLocaleString() : "Not set",
            attempted: roundLeaderboard.length,
            avgScore,
            completionRate: `${completionRate}%`
          });
        }
        sheet2.getRow(1).font = { bold: true };
        sheet2.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        const sheet3 = workbook.addWorksheet("Participant Scores");
        const columns = [
          { header: "Rank", key: "rank", width: 10 },
          { header: "Participant Name", key: "name", width: 30 },
          { header: "Email", key: "email", width: 30 }
        ];
        rounds2.forEach((round, idx) => {
          columns.push({ header: `Round ${idx + 1} Score`, key: `round${idx + 1}`, width: 18 });
        });
        columns.push({ header: "Total Score", key: "totalScore", width: 15 });
        columns.push({ header: "Status", key: "status", width: 15 });
        sheet3.columns = columns;
        for (const entry of leaderboard) {
          const user = await storage.getUser(entry.userId);
          const participant = participants2.find((p) => p.userId === entry.userId);
          const rowData = {
            rank: entry.rank,
            name: entry.userName,
            email: user?.email || "N/A",
            totalScore: entry.totalScore || 0,
            status: participant?.status || "N/A"
          };
          for (let i = 0; i < rounds2.length; i++) {
            const roundAttempt = await storage.getTestAttemptByUserAndRound(entry.userId, rounds2[i].id);
            rowData[`round${i + 1}`] = roundAttempt?.totalScore || 0;
          }
          sheet3.addRow(rowData);
        }
        sheet3.getRow(1).font = { bold: true };
        sheet3.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        const sheet4 = workbook.addWorksheet("Leaderboard");
        sheet4.columns = [
          { header: "Rank", key: "rank", width: 10 },
          { header: "Name", key: "name", width: 30 },
          { header: "Total Score", key: "totalScore", width: 15 },
          { header: "Completion Time", key: "completionTime", width: 25 }
        ];
        leaderboard.forEach((entry) => {
          sheet4.addRow({
            rank: entry.rank,
            name: entry.userName,
            totalScore: entry.totalScore || 0,
            completionTime: entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : "N/A"
          });
        });
        sheet4.getRow(1).font = { bold: true };
        sheet4.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        const fileName = `Event_Report_${event.name.replace(/\s+/g, "_")}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        await workbook.xlsx.write(res);
        res.end();
      } catch (error) {
        console.error("Export event Excel error:", error);
        res.status(500).json({ message: "Failed to generate Excel report" });
      }
    }
  );
  app2.get(
    "/api/reports/export/event/:eventId/pdf",
    requireAuth,
    requireEventAdminOrSuperAdmin,
    async (req, res) => {
      try {
        const { eventId } = req.params;
        const event = await storage.getEvent(eventId);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }
        const rounds2 = await storage.getRoundsByEvent(eventId);
        const participants2 = await storage.getParticipantsByEvent(eventId);
        const leaderboard = await storage.getEventLeaderboard(eventId);
        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
        const fileName = `Event_Report_${event.name.replace(/\s+/g, "_")}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        doc.pipe(res);
        doc.fontSize(20).font("Helvetica-Bold").text(`Event Report: ${event.name}`, { align: "center" });
        doc.moveDown();
        doc.fontSize(14).font("Helvetica-Bold").text("Event Statistics", { underline: true });
        doc.moveDown(0.5);
        const completedAttempts = leaderboard.length;
        const avgCompletionRate = participants2.length > 0 ? (completedAttempts / participants2.length * 100).toFixed(2) : "0";
        doc.fontSize(10).font("Helvetica");
        let y = doc.y;
        const tableTop = y;
        const col1X = 50;
        const col2X = 300;
        doc.rect(col1X, y, 250, 20).stroke();
        doc.rect(col2X, y, 250, 20).stroke();
        doc.font("Helvetica-Bold").text("Metric", col1X + 5, y + 5, { width: 240 });
        doc.text("Value", col2X + 5, y + 5, { width: 240 });
        y += 20;
        const stats = [
          ["Event Type", event.type],
          ["Event Status", event.status],
          ["Total Participants", participants2.length.toString()],
          ["Total Rounds", rounds2.length.toString()],
          ["Completion Rate", `${avgCompletionRate}%`]
        ];
        doc.font("Helvetica");
        stats.forEach((stat, idx) => {
          const fillColor = idx % 2 === 0 ? "#f0f0f0" : "#ffffff";
          doc.rect(col1X, y, 250, 20).fillAndStroke(fillColor, "#000000");
          doc.rect(col2X, y, 250, 20).fillAndStroke(fillColor, "#000000");
          doc.fillColor("#000000").text(stat[0], col1X + 5, y + 5, { width: 240 });
          doc.text(stat[1], col2X + 5, y + 5, { width: 240 });
          y += 20;
        });
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Round Details", { underline: true });
        doc.moveDown(0.5);
        y = doc.y;
        const headers = ["Round", "Duration", "Participants", "Avg Score", "Completion"];
        const colWidths = [120, 80, 100, 80, 100];
        let x = 50;
        doc.fontSize(9).font("Helvetica-Bold");
        headers.forEach((header, i) => {
          doc.rect(x, y, colWidths[i], 20).stroke();
          doc.text(header, x + 5, y + 5, { width: colWidths[i] - 10 });
          x += colWidths[i];
        });
        y += 20;
        doc.font("Helvetica");
        for (const round of rounds2) {
          const roundLeaderboard = await storage.getRoundLeaderboard(round.id);
          const avgScore = roundLeaderboard.length > 0 ? (roundLeaderboard.reduce((sum, r) => sum + (r.totalScore || 0), 0) / roundLeaderboard.length).toFixed(2) : "0";
          const completionRate = participants2.length > 0 ? (roundLeaderboard.length / participants2.length * 100).toFixed(2) : "0";
          x = 50;
          const rowData = [
            round.name,
            `${round.duration} min`,
            roundLeaderboard.length.toString(),
            avgScore,
            `${completionRate}%`
          ];
          rowData.forEach((data, i) => {
            doc.rect(x, y, colWidths[i], 20).stroke();
            doc.text(data, x + 5, y + 5, { width: colWidths[i] - 10 });
            x += colWidths[i];
          });
          y += 20;
          if (y > 500) {
            doc.addPage();
            y = 50;
          }
        }
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Participant Scores", { underline: true });
        doc.moveDown(0.5);
        const participantScores = [];
        for (const participant of participants2) {
          const user = await storage.getUser(participant.userId);
          if (!user) continue;
          const roundScores = [];
          let totalScore = 0;
          for (const round of rounds2) {
            const attempt = await storage.getTestAttemptByUserAndRound(participant.userId, round.id);
            const score = attempt && attempt.status === "completed" ? attempt.totalScore || 0 : 0;
            roundScores.push(score);
            totalScore += score;
          }
          participantScores.push({
            name: user.fullName,
            email: user.email,
            roundScores,
            totalScore,
            status: participant.status
          });
        }
        participantScores.sort((a, b) => b.totalScore - a.totalScore);
        y = doc.y;
        const psHeaders = ["Rank", "Name", "Email"];
        rounds2.forEach((round, idx) => {
          psHeaders.push(`R${idx + 1}`);
        });
        psHeaders.push("Total");
        psHeaders.push("Status");
        const psColWidths = [60, 150, 150];
        rounds2.forEach(() => {
          psColWidths.push(80);
        });
        psColWidths.push(80);
        psColWidths.push(80);
        x = 50;
        doc.fontSize(9).font("Helvetica-Bold");
        psHeaders.forEach((header, i) => {
          doc.rect(x, y, psColWidths[i], 20).fillAndStroke("#f0f0f0", "#000000");
          doc.fillColor("#000000").text(header, x + 5, y + 5, { width: psColWidths[i] - 10 });
          x += psColWidths[i];
        });
        y += 20;
        doc.font("Helvetica");
        participantScores.slice(0, 50).forEach((entry, idx) => {
          x = 50;
          const rank = idx + 1;
          const rowData = [rank.toString(), entry.name, entry.email];
          entry.roundScores.forEach((score) => {
            rowData.push(score.toString());
          });
          rowData.push(entry.totalScore.toString());
          rowData.push(entry.status);
          const fillColor = idx % 2 === 0 ? "#ffffff" : "#f9f9f9";
          rowData.forEach((data, i) => {
            doc.rect(x, y, psColWidths[i], 20).fillAndStroke(fillColor, "#000000");
            doc.fillColor("#000000").text(data, x + 5, y + 5, { width: psColWidths[i] - 10 });
            x += psColWidths[i];
          });
          y += 20;
          if (y > 500) {
            doc.addPage();
            y = 50;
          }
        });
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Leaderboard", { underline: true });
        doc.moveDown(0.5);
        y = doc.y;
        const lbHeaders = ["Rank", "Name", "Total Score", "Completion Time"];
        const lbColWidths = [60, 200, 100, 150];
        x = 50;
        doc.fontSize(9).font("Helvetica-Bold");
        lbHeaders.forEach((header, i) => {
          doc.rect(x, y, lbColWidths[i], 20).stroke();
          doc.text(header, x + 5, y + 5, { width: lbColWidths[i] - 10 });
          x += lbColWidths[i];
        });
        y += 20;
        doc.font("Helvetica");
        leaderboard.slice(0, 20).forEach((entry) => {
          x = 50;
          const rowData = [
            entry.rank.toString(),
            entry.userName,
            (entry.totalScore || 0).toString(),
            entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : "N/A"
          ];
          rowData.forEach((data, i) => {
            doc.rect(x, y, lbColWidths[i], 20).stroke();
            doc.text(data, x + 5, y + 5, { width: lbColWidths[i] - 10 });
            x += lbColWidths[i];
          });
          y += 20;
          if (y > 500) {
            doc.addPage();
            y = 50;
          }
        });
        doc.end();
      } catch (error) {
        console.error("Export event PDF error:", error);
        res.status(500).json({ message: "Failed to generate PDF report" });
      }
    }
  );
  app2.get(
    "/api/reports/export/symposium/excel",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const events2 = await storage.getEvents();
        const allUsers = await storage.getUsers();
        const participants2 = allUsers.filter((u) => u.role === "participant");
        const workbook = new ExcelJS.Workbook();
        const sheet1 = workbook.addWorksheet("Symposium Overview");
        sheet1.columns = [
          { header: "Metric", key: "metric", width: 30 },
          { header: "Value", key: "value", width: 40 }
        ];
        let totalRounds = 0;
        let totalCompletedAttempts = 0;
        let totalParticipants = 0;
        for (const event of events2) {
          const rounds2 = await storage.getRoundsByEvent(event.id);
          const eventParticipants = await storage.getParticipantsByEvent(event.id);
          const leaderboard = await storage.getEventLeaderboard(event.id);
          totalRounds += rounds2.length;
          totalCompletedAttempts += leaderboard.length;
          totalParticipants += eventParticipants.length;
        }
        const overallCompletionRate = totalParticipants > 0 ? (totalCompletedAttempts / totalParticipants * 100).toFixed(2) : "0";
        sheet1.addRows([
          { metric: "Total Events", value: events2.length },
          { metric: "Total Participants", value: participants2.length },
          { metric: "Total Rounds", value: totalRounds },
          { metric: "Overall Completion Rate", value: `${overallCompletionRate}%` }
        ]);
        sheet1.getRow(1).font = { bold: true };
        sheet1.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        const sheet2 = workbook.addWorksheet("Event Summaries");
        sheet2.columns = [
          { header: "Event Name", key: "name", width: 30 },
          { header: "Type", key: "type", width: 15 },
          { header: "Participants", key: "participants", width: 15 },
          { header: "Rounds", key: "rounds", width: 15 },
          { header: "Avg Score", key: "avgScore", width: 15 },
          { header: "Completion Rate", key: "completionRate", width: 20 }
        ];
        for (const event of events2) {
          const rounds2 = await storage.getRoundsByEvent(event.id);
          const eventParticipants = await storage.getParticipantsByEvent(event.id);
          const leaderboard = await storage.getEventLeaderboard(event.id);
          const avgScore = leaderboard.length > 0 ? (leaderboard.reduce((sum, e) => sum + (e.totalScore || 0), 0) / leaderboard.length).toFixed(2) : "0";
          const completionRate = eventParticipants.length > 0 ? (leaderboard.length / eventParticipants.length * 100).toFixed(2) : "0";
          sheet2.addRow({
            name: event.name,
            type: event.type,
            participants: eventParticipants.length,
            rounds: rounds2.length,
            avgScore,
            completionRate: `${completionRate}%`
          });
        }
        sheet2.getRow(1).font = { bold: true };
        sheet2.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        const sheet3 = workbook.addWorksheet("Top Performers");
        sheet3.columns = [
          { header: "Rank", key: "rank", width: 10 },
          { header: "Name", key: "name", width: 30 },
          { header: "Total Score", key: "totalScore", width: 15 },
          { header: "Events Participated", key: "eventsCount", width: 20 }
        ];
        const userScores = /* @__PURE__ */ new Map();
        for (const event of events2) {
          const leaderboard = await storage.getEventLeaderboard(event.id);
          for (const entry of leaderboard) {
            const existing = userScores.get(entry.userId);
            if (existing) {
              existing.totalScore += entry.totalScore || 0;
              existing.eventsCount += 1;
            } else {
              userScores.set(entry.userId, {
                name: entry.userName,
                totalScore: entry.totalScore || 0,
                eventsCount: 1
              });
            }
          }
        }
        const topPerformers = Array.from(userScores.values()).sort((a, b) => b.totalScore - a.totalScore).slice(0, 20);
        topPerformers.forEach((performer, index) => {
          sheet3.addRow({
            rank: index + 1,
            name: performer.name,
            totalScore: performer.totalScore,
            eventsCount: performer.eventsCount
          });
        });
        sheet3.getRow(1).font = { bold: true };
        sheet3.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        const fileName = `Symposium_Report_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        await workbook.xlsx.write(res);
        res.end();
      } catch (error) {
        console.error("Export symposium Excel error:", error);
        res.status(500).json({ message: "Failed to generate Symposium Excel report" });
      }
    }
  );
  app2.get(
    "/api/reports/export/symposium/pdf",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const events2 = await storage.getEvents();
        const allUsers = await storage.getUsers();
        const participants2 = allUsers.filter((u) => u.role === "participant");
        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
        const fileName = `Symposium_Report_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        doc.pipe(res);
        doc.fontSize(20).font("Helvetica-Bold").text("Symposium-wide Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(14).font("Helvetica-Bold").text("Symposium Overview", { underline: true });
        doc.moveDown(0.5);
        let totalRounds = 0;
        let totalCompletedAttempts = 0;
        let totalParticipants = 0;
        for (const event of events2) {
          const rounds2 = await storage.getRoundsByEvent(event.id);
          const eventParticipants = await storage.getParticipantsByEvent(event.id);
          const leaderboard = await storage.getEventLeaderboard(event.id);
          totalRounds += rounds2.length;
          totalCompletedAttempts += leaderboard.length;
          totalParticipants += eventParticipants.length;
        }
        const overallCompletionRate = totalParticipants > 0 ? (totalCompletedAttempts / totalParticipants * 100).toFixed(2) : "0";
        doc.fontSize(10).font("Helvetica");
        let y = doc.y;
        const col1X = 50;
        const col2X = 300;
        doc.rect(col1X, y, 250, 20).stroke();
        doc.rect(col2X, y, 250, 20).stroke();
        doc.font("Helvetica-Bold").text("Metric", col1X + 5, y + 5, { width: 240 });
        doc.text("Value", col2X + 5, y + 5, { width: 240 });
        y += 20;
        const stats = [
          ["Total Events", events2.length.toString()],
          ["Total Participants", participants2.length.toString()],
          ["Total Rounds", totalRounds.toString()],
          ["Overall Completion Rate", `${overallCompletionRate}%`]
        ];
        doc.font("Helvetica");
        stats.forEach((stat, idx) => {
          const fillColor = idx % 2 === 0 ? "#f0f0f0" : "#ffffff";
          doc.rect(col1X, y, 250, 20).fillAndStroke(fillColor, "#000000");
          doc.rect(col2X, y, 250, 20).fillAndStroke(fillColor, "#000000");
          doc.fillColor("#000000").text(stat[0], col1X + 5, y + 5, { width: 240 });
          doc.text(stat[1], col2X + 5, y + 5, { width: 240 });
          y += 20;
        });
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Event Summaries", { underline: true });
        doc.moveDown(0.5);
        y = doc.y;
        const headers = ["Event", "Type", "Participants", "Rounds", "Completion"];
        const colWidths = [150, 80, 100, 70, 110];
        let x = 50;
        doc.fontSize(9).font("Helvetica-Bold");
        headers.forEach((header, i) => {
          doc.rect(x, y, colWidths[i], 20).stroke();
          doc.text(header, x + 5, y + 5, { width: colWidths[i] - 10 });
          x += colWidths[i];
        });
        y += 20;
        doc.font("Helvetica");
        for (const event of events2) {
          const rounds2 = await storage.getRoundsByEvent(event.id);
          const eventParticipants = await storage.getParticipantsByEvent(event.id);
          const leaderboard = await storage.getEventLeaderboard(event.id);
          const completionRate = eventParticipants.length > 0 ? (leaderboard.length / eventParticipants.length * 100).toFixed(2) : "0";
          x = 50;
          const rowData = [
            event.name,
            event.type,
            eventParticipants.length.toString(),
            rounds2.length.toString(),
            `${completionRate}%`
          ];
          rowData.forEach((data, i) => {
            doc.rect(x, y, colWidths[i], 20).stroke();
            doc.text(data, x + 5, y + 5, { width: colWidths[i] - 10 });
            x += colWidths[i];
          });
          y += 20;
          if (y > 500) {
            doc.addPage();
            y = 50;
          }
        }
        doc.addPage();
        doc.fontSize(14).font("Helvetica-Bold").text("Top Performers", { underline: true });
        doc.moveDown(0.5);
        const userScores = /* @__PURE__ */ new Map();
        for (const event of events2) {
          const leaderboard = await storage.getEventLeaderboard(event.id);
          for (const entry of leaderboard) {
            const existing = userScores.get(entry.userId);
            if (existing) {
              existing.totalScore += entry.totalScore || 0;
              existing.eventsCount += 1;
            } else {
              userScores.set(entry.userId, {
                name: entry.userName,
                totalScore: entry.totalScore || 0,
                eventsCount: 1
              });
            }
          }
        }
        const topPerformers = Array.from(userScores.values()).sort((a, b) => b.totalScore - a.totalScore).slice(0, 20);
        y = doc.y;
        const tpHeaders = ["Rank", "Name", "Total Score", "Events"];
        const tpColWidths = [60, 200, 120, 100];
        x = 50;
        doc.fontSize(9).font("Helvetica-Bold");
        tpHeaders.forEach((header, i) => {
          doc.rect(x, y, tpColWidths[i], 20).stroke();
          doc.text(header, x + 5, y + 5, { width: tpColWidths[i] - 10 });
          x += tpColWidths[i];
        });
        y += 20;
        doc.font("Helvetica");
        topPerformers.forEach((performer, index) => {
          x = 50;
          const rowData = [
            (index + 1).toString(),
            performer.name,
            performer.totalScore.toString(),
            performer.eventsCount.toString()
          ];
          rowData.forEach((data, i) => {
            doc.rect(x, y, tpColWidths[i], 20).stroke();
            doc.text(data, x + 5, y + 5, { width: tpColWidths[i] - 10 });
            x += tpColWidths[i];
          });
          y += 20;
          if (y > 500) {
            doc.addPage();
            y = 50;
          }
        });
        doc.end();
      } catch (error) {
        console.error("Export symposium PDF error:", error);
        res.status(500).json({ message: "Failed to generate Symposium PDF report" });
      }
    }
  );
  app2.put(
    "/api/super-admin/events/:eventId/override",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { eventId } = req.params;
        const { name, description, type, category, status, reason } = req.body;
        const user = req.user;
        const ipAddress = getClientIp(req);
        const existingEvent = await storage.getEvent(eventId);
        if (!existingEvent) {
          return res.status(404).json({ message: "Event not found" });
        }
        const updateData = {};
        if (name !== void 0) updateData.name = name;
        if (description !== void 0) updateData.description = description;
        if (type !== void 0) updateData.type = type;
        if (category !== void 0) updateData.category = category;
        if (status !== void 0) updateData.status = status;
        const before = {
          name: existingEvent.name,
          description: existingEvent.description,
          type: existingEvent.type,
          category: existingEvent.category,
          status: existingEvent.status
        };
        const updatedEvent = await storage.updateEvent(eventId, updateData);
        if (!updatedEvent) {
          return res.status(500).json({ message: "Failed to update event" });
        }
        const after = {
          name: updatedEvent.name,
          description: updatedEvent.description,
          type: updatedEvent.type,
          category: updatedEvent.category,
          status: updatedEvent.status
        };
        await logSuperAdminAction(
          user.id,
          user.username,
          "override_event",
          "event",
          eventId,
          updatedEvent.name,
          { before, after },
          reason || null,
          ipAddress
        );
        WebSocketService.notifyOverrideAction("override_event", "event", eventId, { before, after });
        res.json(updatedEvent);
      } catch (error) {
        console.error("Override event error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.delete(
    "/api/super-admin/events/:eventId/override",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { eventId } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const ipAddress = getClientIp(req);
        const existingEvent = await storage.getEvent(eventId);
        if (!existingEvent) {
          return res.status(404).json({ message: "Event not found" });
        }
        await storage.deleteEvent(eventId);
        await logSuperAdminAction(
          user.id,
          user.username,
          "delete_event",
          "event",
          eventId,
          existingEvent.name,
          null,
          reason || null,
          ipAddress
        );
        WebSocketService.notifyOverrideAction("delete_event", "event", eventId, { eventName: existingEvent.name });
        res.status(204).send();
      } catch (error) {
        console.error("Delete event override error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.put(
    "/api/super-admin/questions/:questionId/override",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { questionId } = req.params;
        const { questionText, points, correctAnswer, options, expectedOutput, testCases, reason, ...otherFields } = req.body;
        const user = req.user;
        const ipAddress = getClientIp(req);
        const existingQuestion = await storage.getQuestion(questionId);
        if (!existingQuestion) {
          return res.status(404).json({ message: "Question not found" });
        }
        const round = await storage.getRound(existingQuestion.roundId);
        const event = round ? await storage.getEvent(round.eventId) : null;
        const targetName = `${event?.name || "Unknown Event"} - ${round?.name || "Unknown Round"} - Q${existingQuestion.questionNumber}`;
        const updateData = { ...otherFields };
        if (questionText !== void 0) updateData.questionText = questionText;
        if (points !== void 0) updateData.points = points;
        if (correctAnswer !== void 0) updateData.correctAnswer = correctAnswer;
        if (options !== void 0) updateData.options = options;
        if (expectedOutput !== void 0) updateData.expectedOutput = expectedOutput;
        if (testCases !== void 0) updateData.testCases = testCases;
        const before = {
          questionText: existingQuestion.questionText,
          points: existingQuestion.points,
          correctAnswer: existingQuestion.correctAnswer,
          options: existingQuestion.options,
          expectedOutput: existingQuestion.expectedOutput,
          testCases: existingQuestion.testCases
        };
        const updatedQuestion = await storage.updateQuestion(questionId, updateData);
        if (!updatedQuestion) {
          return res.status(500).json({ message: "Failed to update question" });
        }
        const after = {
          questionText: updatedQuestion.questionText,
          points: updatedQuestion.points,
          correctAnswer: updatedQuestion.correctAnswer,
          options: updatedQuestion.options,
          expectedOutput: updatedQuestion.expectedOutput,
          testCases: updatedQuestion.testCases
        };
        await logSuperAdminAction(
          user.id,
          user.username,
          "override_question",
          "question",
          questionId,
          targetName,
          { before, after },
          reason || null,
          ipAddress
        );
        WebSocketService.notifyOverrideAction("override_question", "question", questionId, { before, after });
        res.json(updatedQuestion);
      } catch (error) {
        console.error("Override question error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.delete(
    "/api/super-admin/questions/:questionId/override",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { questionId } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const ipAddress = getClientIp(req);
        const existingQuestion = await storage.getQuestion(questionId);
        if (!existingQuestion) {
          return res.status(404).json({ message: "Question not found" });
        }
        await storage.deleteQuestion(questionId);
        await logSuperAdminAction(
          user.id,
          user.username,
          "delete_question",
          "question",
          questionId,
          existingQuestion.questionText,
          null,
          reason || null,
          ipAddress
        );
        WebSocketService.notifyOverrideAction("delete_question", "question", questionId, {
          questionText: existingQuestion.questionText
        });
        res.status(204).send();
      } catch (error) {
        console.error("Delete question override error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.put(
    "/api/super-admin/rounds/:roundId/override",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { roundId } = req.params;
        const { duration, startTime, endTime, status, reason } = req.body;
        const user = req.user;
        const ipAddress = getClientIp(req);
        const existingRound = await storage.getRound(roundId);
        if (!existingRound) {
          return res.status(404).json({ message: "Round not found" });
        }
        const event = await storage.getEvent(existingRound.eventId);
        const targetName = `${event?.name || "Unknown Event"} - ${existingRound.name}`;
        const updateData = {};
        if (duration !== void 0) updateData.duration = duration;
        if (startTime !== void 0) updateData.startTime = startTime;
        if (endTime !== void 0) updateData.endTime = endTime;
        if (status !== void 0) updateData.status = status;
        const before = {
          duration: existingRound.duration,
          startTime: existingRound.startTime,
          endTime: existingRound.endTime,
          status: existingRound.status
        };
        const updatedRound = await storage.updateRound(roundId, updateData);
        if (!updatedRound) {
          return res.status(500).json({ message: "Failed to update round" });
        }
        const after = {
          duration: updatedRound.duration,
          startTime: updatedRound.startTime,
          endTime: updatedRound.endTime,
          status: updatedRound.status
        };
        await logSuperAdminAction(
          user.id,
          user.username,
          "override_round",
          "round",
          roundId,
          targetName,
          { before, after },
          reason || null,
          ipAddress
        );
        WebSocketService.notifyOverrideAction("override_round", "round", roundId, { before, after });
        res.json(updatedRound);
      } catch (error) {
        console.error("Override round error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/super-admin/audit-logs", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { adminId, targetType, startDate, endDate } = req.query;
      const filters = {};
      if (adminId) filters.adminId = adminId;
      if (targetType) filters.targetType = targetType;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get(
    "/api/super-admin/audit-logs/target/:targetType/:targetId",
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const { targetType, targetId } = req.params;
        const logs = await storage.getAuditLogsByTarget(targetType, targetId);
        res.json(logs);
      } catch (error) {
        console.error("Get audit logs by target error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  app2.get("/api/email-logs", requireAuth, requireEventAdminOrSuperAdmin, async (req, res) => {
    try {
      const { status, templateType, startDate, endDate } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (templateType) filters.templateType = templateType;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      const logs = await storage.getEmailLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Get email logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get(
    "/api/email-logs/recipient/:email",
    requireAuth,
    requireEventAdminOrSuperAdmin,
    async (req, res) => {
      try {
        const { email } = req.params;
        const logs = await storage.getEmailLogsByRecipient(email);
        res.json(logs);
      } catch (error) {
        console.error("Get email logs by recipient error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  const ioServer = setupWebSocket(server);
  setIO(ioServer);
  log("WebSocket server initialized");
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
