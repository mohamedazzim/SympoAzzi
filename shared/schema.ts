import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - supports super_admin, event_admin, participant, and registration_committee roles
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: varchar("role", { enum: ['super_admin', 'event_admin', 'participant', 'registration_committee'] }).notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Events table - created by super admin
// Note: createdBy uses onDelete: 'set null' to preserve event history even if creator is deleted
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // quiz, coding, general, etc.
  category: varchar("category", { enum: ['technical', 'non_technical'] }).notNull().default('technical'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default('draft'), // draft, active, completed
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Event Admins - assignment of admins to events
export const eventAdmins = pgTable("event_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'cascade' }).notNull(),
  adminId: varchar("admin_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Event Rules - proctoring and test rules per event
export const eventRules = pgTable("event_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'cascade' }).notNull().unique(),
  noRefresh: boolean("no_refresh").notNull().default(true),
  noTabSwitch: boolean("no_tab_switch").notNull().default(true),
  forceFullscreen: boolean("force_fullscreen").notNull().default(true),
  disableShortcuts: boolean("disable_shortcuts").notNull().default(true),
  autoSubmitOnViolation: boolean("auto_submit_on_violation").notNull().default(true),
  maxTabSwitchWarnings: integer("max_tab_switch_warnings").notNull().default(2),
  additionalRules: text("additional_rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rounds - multiple rounds per event
export const rounds = pgTable("rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(), // Round 1, Round 2, etc.
  description: text("description"),
  roundNumber: integer("round_number").notNull(),
  duration: integer("duration").notNull(), // in minutes
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default('not_started'), // not_started, in_progress, completed
  startedAt: timestamp("started_at"), // When admin starts the round
  endedAt: timestamp("ended_at"), // When admin ends the round
  resultsPublished: boolean("results_published").notNull().default(false), // Admin can publish results
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Round Rules - proctoring and test rules per round
export const roundRules = pgTable("round_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id, { onDelete: 'cascade' }).notNull().unique(),
  noRefresh: boolean("no_refresh").notNull().default(true),
  noTabSwitch: boolean("no_tab_switch").notNull().default(true),
  forceFullscreen: boolean("force_fullscreen").notNull().default(true),
  disableShortcuts: boolean("disable_shortcuts").notNull().default(true),
  autoSubmitOnViolation: boolean("auto_submit_on_violation").notNull().default(true),
  maxTabSwitchWarnings: integer("max_tab_switch_warnings").notNull().default(2),
  additionalRules: text("additional_rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Questions - per round
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id, { onDelete: 'cascade' }).notNull(),
  questionType: text("question_type").notNull(), // multiple_choice, coding, descriptive
  questionText: text("question_text").notNull(),
  questionNumber: integer("question_number").notNull(),
  points: integer("points").notNull().default(1),
  
  // For multiple choice questions
  options: jsonb("options"), // Array of options
  correctAnswer: text("correct_answer"), // For multiple choice
  
  // For coding/descriptive questions
  expectedOutput: text("expected_output"),
  testCases: jsonb("test_cases"), // For coding questions
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Participants - users registered for events
export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
  status: text("status").notNull().default('registered'), // registered, completed, disqualified
});

// Test Attempts - tracking participant test sessions
export const testAttempts = pgTable("test_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").references(() => rounds.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  status: text("status").notNull().default('in_progress'), // in_progress, completed, auto_submitted
  
  // Proctoring violations
  tabSwitchCount: integer("tab_switch_count").notNull().default(0),
  refreshAttemptCount: integer("refresh_attempt_count").notNull().default(0),
  violationLogs: jsonb("violation_logs"), // Array of violation timestamps and types
  
  // Scoring
  totalScore: integer("total_score").default(0),
  maxScore: integer("max_score"),
  
  completedAt: timestamp("completed_at"),
});

// Answers - participant answers to questions
export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").references(() => testAttempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: varchar("question_id").references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct"),
  pointsAwarded: integer("points_awarded").default(0),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

// Reports - event-wise and symposium-wide reports
// Note: generatedBy uses onDelete: 'set null' to preserve report history even if generator is deleted
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'cascade' }),
  reportType: text("report_type").notNull(), // event_wise, symposium_wide
  title: text("title").notNull(),
  generatedBy: varchar("generated_by").references(() => users.id, { onDelete: 'set null' }),
  reportData: jsonb("report_data").notNull(), // JSON data for the report
  fileUrl: text("file_url"), // URL to the generated PDF/Excel file
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Registration Forms - public registration forms for events (general, not tied to specific event)
export const registrationForms = pgTable("registration_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  formSlug: varchar("form_slug").unique().notNull(),
  formFields: jsonb("form_fields").notNull().$type<Array<{id: string, label: string, type: 'text' | 'email' | 'tel' | 'number', required: boolean, placeholder?: string}>>(),
  allowedCategories: jsonb("allowed_categories").notNull().default(sql`'["technical", "non_technical"]'::jsonb`).$type<Array<'technical' | 'non_technical'>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Registrations - submissions from public registration forms
export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").references(() => registrationForms.id, { onDelete: 'cascade' }).notNull(),
  submittedData: jsonb("submitted_data").notNull().$type<Record<string, string>>(),
  selectedEvents: jsonb("selected_events").notNull().$type<Array<string>>(),
  paymentStatus: varchar("payment_status", { enum: ['pending', 'paid', 'declined'] }).default('pending').notNull(),
  participantUserId: varchar("participant_user_id").references(() => users.id, { onDelete: 'set null' }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => users.id, { onDelete: 'set null' }),
});

// Event Credentials - event-specific credentials for participants
export const eventCredentials = pgTable("event_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantUserId: varchar("participant_user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: 'cascade' }).notNull(),
  eventUsername: varchar("event_username").unique().notNull(),
  eventPassword: varchar("event_password").notNull(),
  testEnabled: boolean("test_enabled").notNull().default(false),
  enabledAt: timestamp("enabled_at"),
  enabledBy: varchar("enabled_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Logs - track super admin override actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id, { onDelete: 'set null' }).notNull(),
  adminUsername: text("admin_username").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  targetName: text("target_name"),
  changes: jsonb("changes"),
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

// Email Logs - track all email notifications sent by the system
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  templateType: text("template_type").notNull(),
  status: text("status").notNull().default('sent'),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

// Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [auditLogs.adminId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventRulesSchema = createInsertSchema(eventRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoundRulesSchema = createInsertSchema(roundRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  registeredAt: true,
});

export const insertTestAttemptSchema = createInsertSchema(testAttempts).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  answeredAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertRegistrationFormSchema = createInsertSchema(registrationForms).omit({
  id: true,
  createdAt: true,
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  submittedAt: true,
  processedAt: true,
});

export const insertEventCredentialSchema = createInsertSchema(eventCredentials).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type EventAdmin = typeof eventAdmins.$inferSelect;

export type EventRules = typeof eventRules.$inferSelect;
export type InsertEventRules = z.infer<typeof insertEventRulesSchema>;

export type Round = typeof rounds.$inferSelect;
export type InsertRound = z.infer<typeof insertRoundSchema>;

export type RoundRules = typeof roundRules.$inferSelect;
export type InsertRoundRules = z.infer<typeof insertRoundRulesSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;

export type TestAttempt = typeof testAttempts.$inferSelect;
export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type RegistrationForm = typeof registrationForms.$inferSelect;
export type InsertRegistrationForm = z.infer<typeof insertRegistrationFormSchema>;

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export type EventCredential = typeof eventCredentials.$inferSelect;
export type InsertEventCredential = z.infer<typeof insertEventCredentialSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
