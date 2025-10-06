import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { db } from './db';
import { users, events, eventAdmins, eventRules, rounds, roundRules, questions, participants, testAttempts, answers, reports, registrationForms, registrations, eventCredentials, auditLogs, emailLogs } from '@shared/schema';
import type { User, InsertUser, Event, InsertEvent, EventRules, InsertEventRules, Round, InsertRound, RoundRules, InsertRoundRules, Question, InsertQuestion, Participant, InsertParticipant, TestAttempt, InsertTestAttempt, Answer, InsertAnswer, Report, InsertReport, RegistrationForm, InsertRegistrationForm, Registration, InsertRegistration, EventCredential, InsertEventCredential, AuditLog, InsertAuditLog, EmailLog, InsertEmailLog } from '@shared/schema';

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredentials(userId: string, updates: { username?: string; email?: string; password?: string }): Promise<User | undefined>;
  deleteUser(userId: string): Promise<void>;
  getOrphanedEventAdmins(): Promise<User[]>;
  
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventByName(name: string): Promise<Event | undefined>;
  getEventsByCreator(creatorId: string): Promise<Event[]>;
  getEventsByAdmin(adminId: string): Promise<Event[]>;
  getEventsWithoutAdmins(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
  
  getEventAdminsByEvent(eventId: string): Promise<User[]>;
  assignEventAdmin(eventId: string, adminId: string): Promise<void>;
  removeEventAdmin(eventId: string, adminId: string): Promise<void>;
  
  getEventRules(eventId: string): Promise<EventRules | undefined>;
  createEventRules(rules: InsertEventRules): Promise<EventRules>;
  updateEventRules(eventId: string, rules: Partial<InsertEventRules>): Promise<EventRules | undefined>;
  
  getRoundsByEvent(eventId: string): Promise<Round[]>;
  getRound(id: string): Promise<Round | undefined>;
  createRound(round: InsertRound): Promise<Round>;
  updateRound(id: string, round: Partial<InsertRound>): Promise<Round | undefined>;
  updateRoundStatus(roundId: string, status: 'not_started' | 'in_progress' | 'completed', timestamp?: Date): Promise<Round | undefined>;
  updateRoundResultsPublished(roundId: string, published: boolean): Promise<Round | undefined>;
  deleteRound(id: string): Promise<void>;

  getRoundRules(roundId: string): Promise<RoundRules | undefined>;
  createRoundRules(rules: InsertRoundRules): Promise<RoundRules>;
  updateRoundRules(roundId: string, rules: Partial<InsertRoundRules>): Promise<RoundRules | undefined>;
  
  getQuestionsByRound(roundId: string): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, question: Partial<InsertQuestion>): Promise<Question | undefined>;
  deleteQuestion(id: string): Promise<void>;
  
  getParticipantsByEvent(eventId: string): Promise<Participant[]>;
  getParticipantsByUser(userId: string): Promise<Participant[]>;
  getParticipantsByAdmin(adminId: string): Promise<any[]>;
  registerParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantByUserAndEvent(userId: string, eventId: string): Promise<Participant | undefined>;
  updateParticipantStatus(participantId: string, status: 'registered' | 'completed' | 'disqualified'): Promise<Participant | undefined>;
  
  getTestAttempt(id: string): Promise<TestAttempt | undefined>;
  getTestAttemptByUserAndRound(userId: string, roundId: string): Promise<TestAttempt | undefined>;
  getTestAttemptsByUser(userId: string): Promise<TestAttempt[]>;
  createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt>;
  updateTestAttempt(id: string, attempt: Partial<InsertTestAttempt>): Promise<TestAttempt | undefined>;
  deleteTestAttemptsByRound(roundId: string): Promise<void>;
  
  getAnswersByAttempt(attemptId: string): Promise<Answer[]>;
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  updateAnswer(id: string, answer: Partial<InsertAnswer>): Promise<Answer | undefined>;
  
  getReports(): Promise<Report[]>;
  getReportsByEvent(eventId: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, report: Partial<InsertReport>): Promise<Report | undefined>;
  deleteReport(id: string): Promise<void>;
  
  generateEventReport(eventId: string, generatedBy: string): Promise<Report>;
  generateSymposiumReport(generatedBy: string): Promise<Report>;
  
  createRegistrationForm(title: string, description: string, formFields: any[], slug: string): Promise<RegistrationForm>;
  getRegistrationFormBySlug(slug: string): Promise<RegistrationForm | undefined>;
  getAllRegistrationForms(): Promise<RegistrationForm[]>;
  getActiveRegistrationForm(): Promise<RegistrationForm | undefined>;
  updateRegistrationForm(id: string, updates: Partial<RegistrationForm>): Promise<RegistrationForm | undefined>;
  
  createRegistration(formId: string, data: Record<string, string>, selectedEvents: string[]): Promise<Registration>;
  getRegistrations(): Promise<Registration[]>;
  getRegistration(id: string): Promise<Registration | undefined>;
  updateRegistrationStatus(id: string, status: 'pending' | 'paid' | 'declined', participantUserId: string | null, processedBy: string): Promise<Registration>;
  
  getEventsByIds(eventIds: string[]): Promise<Event[]>;
  createParticipant(userId: string, eventId: string): Promise<Participant>;
  
  createEventCredential(participantUserId: string, eventId: string, eventUsername: string, eventPassword: string): Promise<EventCredential>;
  getEventCredentialsByParticipant(participantUserId: string): Promise<EventCredential[]>;
  getEventCredentialsByEvent(eventId: string): Promise<Array<EventCredential & { participant: User, event: Event }>>;
  getEventCredential(credentialId: string): Promise<EventCredential | undefined>;
  getEventCredentialByUserAndEvent(userId: string, eventId: string): Promise<EventCredential | undefined>;
  updateEventCredentialTestStatus(credentialId: string, testEnabled: boolean, enabledBy: string): Promise<EventCredential>;
  getEventCredentialsWithParticipants(eventId: string): Promise<Array<EventCredential & { participant: User }>>;
  isUserEventAdmin(userId: string, eventId: string): Promise<boolean>;
  getEventById(eventId: string): Promise<Event | undefined>;
  getParticipantCredentialWithDetails(userId: string, eventId: string): Promise<any>;
  
  getOnSpotParticipantsByCreator(creatorId: string): Promise<Array<User & { eventCredentials: Array<EventCredential & { event: Event }> }>>;
  updateUserDetails(userId: string, updates: { fullName?: string; email?: string; phone?: string }): Promise<User | undefined>;
  getEventCredentialCountForEvent(eventId: string): Promise<number>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { adminId?: string; targetType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]>;
  getAuditLogsByTarget(targetType: string, targetId: string): Promise<AuditLog[]>;
  
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  getEmailLogs(filters?: { status?: string; templateType?: string; startDate?: Date; endDate?: Date }): Promise<EmailLog[]>;
  getEmailLogsByRecipient(email: string): Promise<EmailLog[]>;
  
  getParticipantsByEventId(eventId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    const [user] = result as User[];
    return user;
  }

  async updateUserCredentials(userId: string, updates: { username?: string; email?: string; password?: string }): Promise<User | undefined> {
    if (updates.username) {
      const existingUser = await this.getUserByUsername(updates.username);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Username already exists');
      }
    }

    if (updates.email) {
      const existingUser = await this.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already exists');
      }
    }

    const updateData: any = {};
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.password !== undefined) updateData.password = updates.password;

    const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async getOrphanedEventAdmins(): Promise<User[]> {
    const adminsWithAssignments = await db
      .select({ adminId: eventAdmins.adminId })
      .from(eventAdmins)
      .groupBy(eventAdmins.adminId);
    
    const assignedAdminIds = new Set(adminsWithAssignments.map(a => a.adminId));
    
    const allEventAdmins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'event_admin'));
    
    return allEventAdmins.filter(admin => !assignedAdminIds.has(admin.id));
  }

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventByName(name: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.name, name));
    return event;
  }

  async getEventsByCreator(creatorId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.createdBy, creatorId));
  }

  async getEventsByAdmin(adminId: string): Promise<Event[]> {
    const result = await db
      .select({ event: events })
      .from(eventAdmins)
      .innerJoin(events, eq(eventAdmins.eventId, events.id))
      .where(eq(eventAdmins.adminId, adminId));
    return result.map(r => r.event);
  }

  async getEventsWithoutAdmins(): Promise<Event[]> {
    const eventsWithAdmins = await db
      .select({ eventId: eventAdmins.eventId })
      .from(eventAdmins)
      .groupBy(eventAdmins.eventId);
    
    const assignedEventIds = new Set(eventsWithAdmins.map(e => e.eventId));
    
    const allEvents = await db.select().from(events);
    
    return allEvents.filter(event => !assignedEventIds.has(event.id));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: string, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set({ ...updateData, updatedAt: new Date() }).where(eq(events.id, id)).returning();
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getEventAdminsByEvent(eventId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(eventAdmins)
      .innerJoin(users, eq(eventAdmins.adminId, users.id))
      .where(eq(eventAdmins.eventId, eventId));
    return result.map(r => r.user);
  }

  async assignEventAdmin(eventId: string, adminId: string): Promise<void> {
    await db.insert(eventAdmins).values({ eventId, adminId });
  }

  async removeEventAdmin(eventId: string, adminId: string): Promise<void> {
    await db.delete(eventAdmins).where(and(eq(eventAdmins.eventId, eventId), eq(eventAdmins.adminId, adminId)));
  }

  async getEventRules(eventId: string): Promise<EventRules | undefined> {
    const [rules] = await db.select().from(eventRules).where(eq(eventRules.eventId, eventId));
    return rules;
  }

  async createEventRules(insertRules: InsertEventRules): Promise<EventRules> {
    const [rules] = await db.insert(eventRules).values(insertRules).returning();
    return rules;
  }

  async updateEventRules(eventId: string, updateData: Partial<InsertEventRules>): Promise<EventRules | undefined> {
    const [rules] = await db.update(eventRules).set({ ...updateData, updatedAt: new Date() }).where(eq(eventRules.eventId, eventId)).returning();
    return rules;
  }

  async getRoundsByEvent(eventId: string): Promise<Round[]> {
    return await db.select().from(rounds).where(eq(rounds.eventId, eventId));
  }

  async getRound(id: string): Promise<Round | undefined> {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
    return round;
  }

  async createRound(insertRound: InsertRound): Promise<Round> {
    const [round] = await db.insert(rounds).values(insertRound).returning();
    return round;
  }

  async updateRound(id: string, updateData: Partial<InsertRound>): Promise<Round | undefined> {
    const [round] = await db.update(rounds).set({ ...updateData, updatedAt: new Date() }).where(eq(rounds.id, id)).returning();
    return round;
  }

  async updateRoundStatus(roundId: string, status: 'not_started' | 'in_progress' | 'completed', timestamp?: Date | null): Promise<Round | undefined> {
    if (status === 'in_progress') {
      const [round] = await db.update(rounds)
        .set({ 
          status: 'in_progress',
          startedAt: timestamp || new Date(),
          updatedAt: new Date()
        })
        .where(eq(rounds.id, roundId))
        .returning();
      return round;
    } else if (status === 'completed') {
      const [round] = await db.update(rounds)
        .set({ 
          status: 'completed',
          endedAt: timestamp || new Date(),
          updatedAt: new Date()
        })
        .where(eq(rounds.id, roundId))
        .returning();
      return round;
    } else if (status === 'not_started') {
      const [round] = await db.update(rounds)
        .set({ 
          status: 'not_started',
          startedAt: null,
          endedAt: null,
          updatedAt: new Date()
        })
        .where(eq(rounds.id, roundId))
        .returning();
      return round;
    }
    return undefined;
  }

  async updateRoundResultsPublished(roundId: string, published: boolean): Promise<Round | undefined> {
    const [round] = await db.update(rounds)
      .set({ 
        resultsPublished: published,
        updatedAt: new Date()
      })
      .where(eq(rounds.id, roundId))
      .returning();
    return round;
  }

  async deleteRound(id: string): Promise<void> {
    await db.delete(rounds).where(eq(rounds.id, id));
  }

  async getRoundRules(roundId: string): Promise<RoundRules | undefined> {
    const [rules] = await db.select().from(roundRules).where(eq(roundRules.roundId, roundId));
    return rules;
  }

  async createRoundRules(insertRules: InsertRoundRules): Promise<RoundRules> {
    const [rules] = await db.insert(roundRules).values(insertRules).returning();
    return rules;
  }

  async updateRoundRules(roundId: string, updateData: Partial<InsertRoundRules>): Promise<RoundRules | undefined> {
    const [rules] = await db.update(roundRules).set({ ...updateData, updatedAt: new Date() }).where(eq(roundRules.roundId, roundId)).returning();
    return rules;
  }

  async getQuestionsByRound(roundId: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.roundId, roundId));
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(insertQuestion).returning();
    return question;
  }

  async updateQuestion(id: string, updateData: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [question] = await db.update(questions).set({ ...updateData, updatedAt: new Date() }).where(eq(questions.id, id)).returning();
    return question;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async getParticipantsByEvent(eventId: string): Promise<Participant[]> {
    return await db.select().from(participants).where(eq(participants.eventId, eventId));
  }

  async getParticipantsByUser(userId: string): Promise<Participant[]> {
    return await db.select().from(participants).where(eq(participants.userId, userId));
  }

  async registerParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const [participant] = await db.insert(participants).values(insertParticipant).returning();
    return participant;
  }

  async getParticipantByUserAndEvent(userId: string, eventId: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants)
      .where(and(eq(participants.userId, userId), eq(participants.eventId, eventId)));
    return participant;
  }

  async updateParticipantStatus(participantId: string, status: 'registered' | 'completed' | 'disqualified'): Promise<Participant | undefined> {
    const [participant] = await db.update(participants)
      .set({ status })
      .where(eq(participants.id, participantId))
      .returning();
    return participant;
  }

  async getParticipantsByAdmin(adminId: string) {
    const result = await db
      .select({
        participant: participants,
        user: users,
        event: events
      })
      .from(participants)
      .innerJoin(users, eq(participants.userId, users.id))
      .innerJoin(events, eq(participants.eventId, events.id))
      .innerJoin(eventAdmins, eq(events.id, eventAdmins.eventId))
      .where(eq(eventAdmins.adminId, adminId))
      .orderBy(desc(participants.registeredAt));

    return result.map(r => ({
      ...r.participant,
      user: r.user,
      event: r.event
    }));
  }

  async getTestAttempt(id: string): Promise<TestAttempt | undefined> {
    const [attempt] = await db.select().from(testAttempts).where(eq(testAttempts.id, id));
    return attempt;
  }

  async getTestAttemptByUserAndRound(userId: string, roundId: string): Promise<TestAttempt | undefined> {
    const [attempt] = await db.select().from(testAttempts)
      .where(and(eq(testAttempts.userId, userId), eq(testAttempts.roundId, roundId)));
    return attempt;
  }

  async getTestAttemptsByUser(userId: string): Promise<TestAttempt[]> {
    return await db.select().from(testAttempts).where(eq(testAttempts.userId, userId));
  }

  async createTestAttempt(insertAttempt: InsertTestAttempt): Promise<TestAttempt> {
    const [attempt] = await db.insert(testAttempts).values(insertAttempt).returning();
    return attempt;
  }

  async updateTestAttempt(id: string, updateData: Partial<TestAttempt>): Promise<TestAttempt | undefined> {
    const [attempt] = await db.update(testAttempts).set(updateData).where(eq(testAttempts.id, id)).returning();
    return attempt;
  }

  async deleteTestAttemptsByRound(roundId: string): Promise<void> {
    await db.delete(testAttempts).where(eq(testAttempts.roundId, roundId));
  }

  async getAnswersByAttempt(attemptId: string): Promise<Answer[]> {
    return await db.select().from(answers).where(eq(answers.attemptId, attemptId));
  }

  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const [answer] = await db.insert(answers).values(insertAnswer).returning();
    return answer;
  }

  async updateAnswer(id: string, updateData: Partial<Answer>): Promise<Answer | undefined> {
    const [answer] = await db.update(answers).set(updateData).where(eq(answers.id, id)).returning();
    return answer;
  }

  async getReports(): Promise<Report[]> {
    return await db.select().from(reports);
  }

  async getReportsByEvent(eventId: string): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.eventId, eventId));
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }

  async updateReport(id: string, updateData: Partial<InsertReport>): Promise<Report | undefined> {
    const [report] = await db.update(reports).set(updateData).where(eq(reports.id, id)).returning();
    return report;
  }

  async deleteReport(id: string): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  async generateEventReport(eventId: string, generatedBy: string): Promise<Report> {
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const eventRoundsData = await db.select().from(rounds).where(eq(rounds.eventId, eventId));
    const eventParticipants = await this.getParticipantsByEvent(eventId);
    const eventRulesData = await this.getEventRules(eventId);

    const roundsDetails = await Promise.all(
      eventRoundsData.map(async (round) => {
        const questionsData = await this.getQuestionsByRound(round.id);
        const attemptsData = await db
          .select({
            attempt: testAttempts,
            user: users
          })
          .from(testAttempts)
          .innerJoin(users, eq(testAttempts.userId, users.id))
          .where(eq(testAttempts.roundId, round.id));

        const questionAnalysis = await Promise.all(
          questionsData.map(async (question) => {
            const answersData = await db
              .select({
                answer: answers,
                attempt: testAttempts
              })
              .from(answers)
              .innerJoin(testAttempts, eq(answers.attemptId, testAttempts.id))
              .where(and(
                eq(answers.questionId, question.id),
                eq(testAttempts.roundId, round.id)
              ));

            const totalAnswers = answersData.length;
            const correctAnswers = answersData.filter(a => a.answer.isCorrect).length;
            const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

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

        const completedAttempts = attemptsData.filter(a => a.attempt.status === 'completed');
        const totalScore = completedAttempts.reduce((sum, a) => sum + (a.attempt.totalScore || 0), 0);
        const avgScore = completedAttempts.length > 0 ? totalScore / completedAttempts.length : 0;

        const violations = attemptsData.map(a => ({
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
        const attempts = await db
          .select()
          .from(testAttempts)
          .innerJoin(rounds, eq(testAttempts.roundId, rounds.id))
          .where(and(
            eq(rounds.eventId, eventId),
            eq(testAttempts.userId, participant.userId)
          ));

        const totalScore = attempts
          .filter(a => a.test_attempts.status === 'completed')
          .reduce((sum, a) => sum + (a.test_attempts.totalScore || 0), 0);

        return {
          userId: participant.userId,
          userName: user?.fullName,
          email: user?.email,
          registeredAt: participant.registeredAt,
          status: participant.status,
          attemptsCount: attempts.length,
          completedAttempts: attempts.filter(a => a.test_attempts.status === 'completed').length,
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
      generatedAt: new Date().toISOString()
    };

    const report = await this.createReport({
      eventId,
      reportType: 'event_wise',
      title: `${event.name} - Event Report`,
      generatedBy,
      reportData,
      fileUrl: null
    });

    return report;
  }

  async generateSymposiumReport(generatedBy: string): Promise<Report> {
    const allEvents = await this.getEvents();
    const allUsers = await this.getUsers();

    const eventSummaries = await Promise.all(
      allEvents.map(async (event) => {
        const eventRoundsData = await db.select().from(rounds).where(eq(rounds.eventId, event.id));
        const eventParticipants = await this.getParticipantsByEvent(event.id);
        
        const roundIds = eventRoundsData.map(r => r.id);
        let completedAttempts = 0;
        let totalAttempts = 0;
        let totalScore = 0;

        if (roundIds.length > 0) {
          const attemptsData = await db
            .select()
            .from(testAttempts)
            .where(sql`${testAttempts.roundId} IN (${sql.join(roundIds.map(id => sql`${id}`), sql`, `)})`);

          totalAttempts = attemptsData.length;
          completedAttempts = attemptsData.filter(a => a.status === 'completed').length;
          totalScore = attemptsData
            .filter(a => a.status === 'completed')
            .reduce((sum, a) => sum + (a.totalScore || 0), 0);
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
          completionRate: totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0,
          averageScore: completedAttempts > 0 ? Math.round((totalScore / completedAttempts) * 100) / 100 : 0
        };
      })
    );

    const allAttempts = await db
      .select({
        userId: testAttempts.userId,
        userName: users.fullName,
        totalScore: sql<number>`SUM(${testAttempts.totalScore})`.as('total_score'),
        attemptsCount: sql<number>`COUNT(*)`.as('attempts_count')
      })
      .from(testAttempts)
      .innerJoin(users, eq(testAttempts.userId, users.id))
      .where(eq(testAttempts.status, 'completed'))
      .groupBy(testAttempts.userId, users.fullName)
      .orderBy(desc(sql`SUM(${testAttempts.totalScore})`))
      .limit(50);

    const participantCount = await db
      .select({ userId: participants.userId })
      .from(participants)
      .groupBy(participants.userId);

    const totalCompletedAttempts = await db
      .select({ count: sql<number>`COUNT(*)`.as('count') })
      .from(testAttempts)
      .where(eq(testAttempts.status, 'completed'));

    const totalViolations = await db
      .select({
        totalTabSwitches: sql<number>`SUM(${testAttempts.tabSwitchCount})`.as('total_tab_switches'),
        totalRefreshes: sql<number>`SUM(${testAttempts.refreshAttemptCount})`.as('total_refreshes')
      })
      .from(testAttempts);

    const reportData = {
      overview: {
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter(e => e.status === 'active').length,
        completedEvents: allEvents.filter(e => e.status === 'completed').length,
        totalParticipants: participantCount.length,
        totalEventAdmins: allUsers.filter(u => u.role === 'event_admin').length,
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
      generatedAt: new Date().toISOString()
    };

    const report = await this.createReport({
      eventId: null,
      reportType: 'symposium_wide',
      title: 'Symposium-wide Report',
      generatedBy,
      reportData,
      fileUrl: null
    });

    return report;
  }

  async getRoundLeaderboard(roundId: string) {
    const attempts = await db
      .select({
        attemptId: testAttempts.id,
        userId: testAttempts.userId,
        userName: users.fullName,
        totalScore: testAttempts.totalScore,
        maxScore: testAttempts.maxScore,
        submittedAt: testAttempts.submittedAt,
        status: testAttempts.status
      })
      .from(testAttempts)
      .innerJoin(users, eq(testAttempts.userId, users.id))
      .where(and(
        eq(testAttempts.roundId, roundId),
        eq(testAttempts.status, 'completed')
      ))
      .orderBy(desc(testAttempts.totalScore), asc(testAttempts.submittedAt));

    return attempts.map((attempt, index) => ({
      ...attempt,
      rank: index + 1
    }));
  }

  async getEventLeaderboard(eventId: string) {
    const roundsData = await db.select().from(rounds).where(eq(rounds.eventId, eventId));
    const roundIds = roundsData.map(r => r.id);

    if (roundIds.length === 0) {
      return [];
    }

    const attempts = await db
      .select({
        userId: testAttempts.userId,
        userName: users.fullName,
        totalScore: sql<number>`SUM(${testAttempts.totalScore})`.as('total_score'),
        submittedAt: sql<Date>`MAX(${testAttempts.submittedAt})`.as('last_submitted')
      })
      .from(testAttempts)
      .innerJoin(users, eq(testAttempts.userId, users.id))
      .where(and(
        sql`${testAttempts.roundId} IN (${sql.join(roundIds.map(id => sql`${id}`), sql`, `)})`,
        eq(testAttempts.status, 'completed')
      ))
      .groupBy(testAttempts.userId, users.fullName)
      .orderBy(desc(sql`SUM(${testAttempts.totalScore})`), asc(sql`MAX(${testAttempts.submittedAt})`));

    return attempts.map((attempt, index) => ({
      ...attempt,
      rank: index + 1
    }));
  }

  async createRegistrationForm(title: string, description: string, formFields: any[], slug: string): Promise<RegistrationForm> {
    const [form] = await db.insert(registrationForms).values({ 
      title, 
      description, 
      formSlug: slug, 
      formFields,
      isActive: true 
    }).returning();
    return form;
  }

  async getRegistrationFormBySlug(slug: string): Promise<RegistrationForm | undefined> {
    const [form] = await db.select().from(registrationForms).where(eq(registrationForms.formSlug, slug));
    return form;
  }

  async getAllRegistrationForms(): Promise<RegistrationForm[]> {
    return await db.select().from(registrationForms).orderBy(desc(registrationForms.createdAt));
  }

  async getActiveRegistrationForm(): Promise<RegistrationForm | undefined> {
    const [form] = await db.select().from(registrationForms)
      .where(eq(registrationForms.isActive, true))
      .orderBy(desc(registrationForms.createdAt))
      .limit(1);
    return form;
  }

  async updateRegistrationForm(id: string, updates: Partial<RegistrationForm>): Promise<RegistrationForm | undefined> {
    const [form] = await db.update(registrationForms)
      .set(updates)
      .where(eq(registrationForms.id, id))
      .returning();
    return form;
  }

  async createRegistration(formId: string, data: Record<string, string>, selectedEvents: string[]): Promise<Registration> {
    const [registration] = await db.insert(registrations).values({
      formId,
      submittedData: data,
      selectedEvents,
      paymentStatus: 'pending',
      participantUserId: null,
      processedBy: null
    }).returning();
    return registration;
  }

  async getRegistrations(): Promise<any[]> {
    const result = await db.select({
      registration: registrations,
      form: registrationForms
    })
    .from(registrations)
    .leftJoin(registrationForms, eq(registrations.formId, registrationForms.id))
    .orderBy(desc(registrations.submittedAt));
    
    return result.map(r => {
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

  async getRegistration(id: string): Promise<any | undefined> {
    const result = await db.select({
      registration: registrations,
      form: registrationForms
    })
    .from(registrations)
    .leftJoin(registrationForms, eq(registrations.formId, registrationForms.id))
    .where(eq(registrations.id, id));
    
    if (result.length === 0) return undefined;
    
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

  async getRegistrationByUserId(userId: string): Promise<any | undefined> {
    const result = await db.select({
      registration: registrations,
      form: registrationForms
    })
    .from(registrations)
    .leftJoin(registrationForms, eq(registrations.formId, registrationForms.id))
    .where(eq(registrations.participantUserId, userId));
    
    if (result.length === 0) return undefined;
    
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
  
  private extractParticipantDetails(submittedData: Record<string, string>, formFields: Array<{id: string, label: string, type: string, required: boolean, placeholder?: string}>): { name: string; email: string; phone: string } {
    let name = 'N/A';
    let email = 'N/A';
    let phone = 'N/A';
    
    for (const field of formFields) {
      const value = submittedData[field.id];
      if (!value) continue;
      
      const lowerLabel = field.label.toLowerCase();
      
      if (field.type === 'email' || lowerLabel.includes('email')) {
        email = value;
      } else if (field.type === 'tel' || lowerLabel.includes('phone') || lowerLabel.includes('mobile') || lowerLabel.includes('contact')) {
        phone = value;
      } else if (lowerLabel.includes('name') && !lowerLabel.includes('college') && !lowerLabel.includes('school') && !lowerLabel.includes('institution')) {
        if (name === 'N/A' || lowerLabel.includes('full')) {
          name = value;
        }
      }
    }
    
    return { name, email, phone };
  }

  async updateRegistrationStatus(id: string, status: 'pending' | 'paid' | 'declined', participantUserId: string | null, processedBy: string): Promise<Registration> {
    const [registration] = await db.update(registrations).set({
      paymentStatus: status,
      participantUserId,
      processedBy,
      processedAt: new Date()
    }).where(eq(registrations.id, id)).returning();
    return registration;
  }

  async getEventsByIds(eventIds: string[]): Promise<Event[]> {
    if (eventIds.length === 0) return [];
    return await db.select().from(events).where(
      sql`${events.id} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`
    );
  }

  async createParticipant(userId: string, eventId: string): Promise<Participant> {
    const [participant] = await db.insert(participants).values({
      userId,
      eventId,
      status: 'registered'
    }).returning();
    return participant;
  }

  async createEventCredential(participantUserId: string, eventId: string, eventUsername: string, eventPassword: string): Promise<EventCredential> {
    const [credential] = await db.insert(eventCredentials).values({
      participantUserId,
      eventId,
      eventUsername,
      eventPassword,
    }).returning();
    return credential;
  }

  async getEventCredentialsByParticipant(participantUserId: string): Promise<EventCredential[]> {
    return await db.select()
      .from(eventCredentials)
      .where(eq(eventCredentials.participantUserId, participantUserId));
  }

  async getEventCredentialsByEvent(eventId: string): Promise<Array<EventCredential & { participant: User, event: Event, paymentStatus?: string }>> {
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
      paymentStatus: registrations.paymentStatus,
    })
    .from(eventCredentials)
    .innerJoin(users, eq(eventCredentials.participantUserId, users.id))
    .innerJoin(events, eq(eventCredentials.eventId, events.id))
    .leftJoin(registrations, eq(registrations.participantUserId, users.id))
    .where(eq(eventCredentials.eventId, eventId));
    
    return result as any;
  }

  async getEventCredential(credentialId: string): Promise<EventCredential | undefined> {
    const [credential] = await db.select()
      .from(eventCredentials)
      .where(eq(eventCredentials.id, credentialId));
    return credential;
  }

  async getEventCredentialByUserAndEvent(userId: string, eventId: string): Promise<EventCredential | undefined> {
    const [credential] = await db.select()
      .from(eventCredentials)
      .where(and(eq(eventCredentials.participantUserId, userId), eq(eventCredentials.eventId, eventId)));
    return credential;
  }

  async updateEventCredentialTestStatus(credentialId: string, testEnabled: boolean, enabledBy: string): Promise<EventCredential> {
    const updateData: any = {
      testEnabled,
    };
    
    if (testEnabled) {
      updateData.enabledAt = new Date();
      updateData.enabledBy = enabledBy;
    }
    
    const [credential] = await db.update(eventCredentials)
      .set(updateData)
      .where(eq(eventCredentials.id, credentialId))
      .returning();
    return credential;
  }

  async getEventCredentialsWithParticipants(eventId: string): Promise<Array<EventCredential & { participant: User }>> {
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
    })
    .from(eventCredentials)
    .innerJoin(users, eq(eventCredentials.participantUserId, users.id))
    .where(eq(eventCredentials.eventId, eventId))
    .orderBy(asc(users.fullName));
    
    return result as any;
  }

  async getEventCredentialByUsername(eventUsername: string): Promise<EventCredential | undefined> {
    const [credential] = await db.select()
      .from(eventCredentials)
      .where(eq(eventCredentials.eventUsername, eventUsername));
    return credential;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    return user;
  }

  async isUserEventAdmin(userId: string, eventId: string): Promise<boolean> {
    const [assignment] = await db.select()
      .from(eventAdmins)
      .where(and(eq(eventAdmins.adminId, userId), eq(eventAdmins.eventId, eventId)));
    return !!assignment;
  }

  async getEventById(eventId: string): Promise<Event | undefined> {
    return await this.getEvent(eventId);
  }

  async getParticipantCredentialWithDetails(userId: string, eventId: string): Promise<any> {
    const credential = await this.getEventCredentialByUserAndEvent(userId, eventId);
    if (!credential) {
      return null;
    }

    const event = await this.getEvent(eventId);
    if (!event) {
      return null;
    }

    const rounds = await this.getRoundsByEvent(eventId);
    const eventRules = await this.getEventRules(eventId);

    const activeRound = rounds.find(r => r.status === 'active');
    let activeRoundRules = null;
    if (activeRound) {
      activeRoundRules = await this.getRoundRules(activeRound.id);
    }

    return {
      credential,
      event,
      rounds,
      eventRules,
      activeRoundRules
    };
  }

  async getOnSpotParticipantsByCreator(creatorId: string): Promise<Array<User & { eventCredentials: Array<EventCredential & { event: Event }> }>> {
    const participantUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.createdBy, creatorId), eq(users.role, 'participant')))
      .orderBy(desc(users.createdAt));

    const result = await Promise.all(participantUsers.map(async (user) => {
      const credentials = await db
        .select({
          id: eventCredentials.id,
          participantUserId: eventCredentials.participantUserId,
          eventId: eventCredentials.eventId,
          eventUsername: eventCredentials.eventUsername,
          eventPassword: eventCredentials.eventPassword,
          testEnabled: eventCredentials.testEnabled,
          enabledAt: eventCredentials.enabledAt,
          enabledBy: eventCredentials.enabledBy,
          createdAt: eventCredentials.createdAt,
          event: events,
        })
        .from(eventCredentials)
        .innerJoin(events, eq(eventCredentials.eventId, events.id))
        .where(eq(eventCredentials.participantUserId, user.id));

      return {
        ...user,
        eventCredentials: credentials as any,
      };
    }));

    return result;
  }

  async updateUserDetails(userId: string, updates: { fullName?: string; email?: string; phone?: string }): Promise<User | undefined> {
    if (updates.email) {
      const existingUser = await this.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already exists');
      }
    }

    const updateData: any = {};
    if (updates.fullName !== undefined) updateData.fullName = updates.fullName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;

    const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
    return user;
  }

  async getEventCredentialCountForEvent(eventId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventCredentials)
      .where(eq(eventCredentials.eventId, eventId));
    
    return result[0]?.count || 0;
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogs(filters?: { adminId?: string; targetType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    const conditions = [];
    if (filters?.adminId) conditions.push(eq(auditLogs.adminId, filters.adminId));
    if (filters?.targetType) conditions.push(eq(auditLogs.targetType, filters.targetType));
    if (filters?.startDate) conditions.push(gte(auditLogs.timestamp, filters.startDate));
    if (filters?.endDate) conditions.push(lte(auditLogs.timestamp, filters.endDate));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLogsByTarget(targetType: string, targetId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(and(eq(auditLogs.targetType, targetType), eq(auditLogs.targetId, targetId)))
      .orderBy(desc(auditLogs.timestamp));
  }

  async createEmailLog(insertLog: InsertEmailLog): Promise<EmailLog> {
    const [log] = await db.insert(emailLogs).values(insertLog).returning();
    return log;
  }

  async getEmailLogs(filters?: { status?: string; templateType?: string; startDate?: Date; endDate?: Date }): Promise<EmailLog[]> {
    let query = db.select().from(emailLogs);
    
    const conditions = [];
    if (filters?.status) conditions.push(eq(emailLogs.status, filters.status));
    if (filters?.templateType) conditions.push(eq(emailLogs.templateType, filters.templateType));
    if (filters?.startDate) conditions.push(gte(emailLogs.sentAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(emailLogs.sentAt, filters.endDate));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(emailLogs.sentAt));
  }

  async getEmailLogsByRecipient(email: string): Promise<EmailLog[]> {
    return await db.select().from(emailLogs)
      .where(eq(emailLogs.recipientEmail, email))
      .orderBy(desc(emailLogs.sentAt));
  }

  async getParticipantsByEventId(eventId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(users)
      .innerJoin(participants, eq(participants.userId, users.id))
      .where(and(eq(participants.eventId, eventId), eq(users.role, 'participant')))
      .groupBy(users.id);
    
    return result.map(r => r.user);
  }
}

export const storage = new DatabaseStorage();
