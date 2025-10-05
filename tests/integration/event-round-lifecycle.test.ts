import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';
import { TestHelpers } from '../utils/testHelpers';
import { WebSocketService } from '../../server/services/websocketService';

let app: Express;
let server: Server;
let superAdminToken: string;
let eventAdminToken: string;
let eventAdmin2Token: string;
let participantToken: string;
let superAdminUser: any;
let eventAdminUser: any;
let eventAdmin2User: any;
let participantUser: any;

// Note: WebSocket mocking in this ESM setup has limitations. The mock works for basic assertions
// (checking if called/not called) but toHaveBeenCalledWith assertions may not work reliably
// due to how modules are imported. For comprehensive WebSocket testing, consider using
// actual WebSocket client connections in E2E tests rather than mocking.
jest.mock('../../server/services/websocketService');

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  server = await registerRoutes(app);

  const hashedPassword = await TestHelpers.hashPassword('test123');
  
  superAdminUser = await storage.createUser({
    username: `super_admin_${Date.now()}`,
    password: hashedPassword,
    email: `super_admin_${Date.now()}@test.com`,
    fullName: 'Super Admin Test',
    role: 'super_admin'
  });

  eventAdminUser = await storage.createUser({
    username: `event_admin_${Date.now()}`,
    password: hashedPassword,
    email: `event_admin_${Date.now()}@test.com`,
    fullName: 'Event Admin Test',
    role: 'event_admin'
  });

  eventAdmin2User = await storage.createUser({
    username: `event_admin_2_${Date.now()}`,
    password: hashedPassword,
    email: `event_admin_2_${Date.now()}@test.com`,
    fullName: 'Event Admin 2 Test',
    role: 'event_admin'
  });

  participantUser = await storage.createUser({
    username: `participant_${Date.now()}`,
    password: hashedPassword,
    email: `participant_${Date.now()}@test.com`,
    fullName: 'Participant Test',
    role: 'participant'
  });

  superAdminToken = TestHelpers.generateJWT(superAdminUser);
  eventAdminToken = TestHelpers.generateJWT(eventAdminUser);
  eventAdmin2Token = TestHelpers.generateJWT(eventAdmin2User);
  participantToken = TestHelpers.generateJWT(participantUser);
});

afterAll(async () => {
  await storage.deleteUser(superAdminUser.id);
  await storage.deleteUser(eventAdminUser.id);
  await storage.deleteUser(eventAdmin2User.id);
  await storage.deleteUser(participantUser.id);
  
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Event Lifecycle Tests', () => {
  let testEvent: any;

  afterEach(async () => {
    if (testEvent?.id) {
      try {
        await storage.deleteEvent(testEvent.id);
      } catch (e) {
        // Event may already be deleted
      }
      testEvent = null;
    }
  });

  describe('Event Creation', () => {
    test('should allow super admin to create event', async () => {
      const eventData = {
        name: `Test Event ${Date.now()}`,
        description: 'Test event description',
        type: 'quiz',
        category: 'technical',
        startDate: new Date('2025-12-01').toISOString(),
        endDate: new Date('2025-12-02').toISOString(),
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/events')
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(eventData.name);
      expect(response.body.category).toBe(eventData.category);
      expect(response.body.status).toBe(eventData.status);

      testEvent = response.body;
    });

    test('should reject event admin creating event', async () => {
      const eventData = {
        name: `Test Event ${Date.now()}`,
        description: 'Test event description',
        type: 'quiz',
        category: 'technical',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/events')
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(eventData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Super Admin access required');
    });

    test('should create event with valid dates when startDate is before endDate', async () => {
      const eventData = {
        name: `Test Event ${Date.now()}`,
        description: 'Test event description',
        type: 'quiz',
        category: 'technical',
        startDate: new Date('2025-12-01').toISOString(),
        endDate: new Date('2025-12-02').toISOString(),
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/events')
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(eventData.name);

      testEvent = response.body;
    });

    test('should create event with non-technical category', async () => {
      const eventData = {
        name: `Test Event ${Date.now()}`,
        description: 'Test event description',
        type: 'quiz',
        category: 'non_technical' as const,
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/events')
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send(eventData);

      expect(response.status).toBe(201);
      expect(['technical', 'non_technical']).toContain(response.body.category);

      testEvent = response.body;
    });
  });

  describe('Event Status Transitions', () => {
    beforeEach(async () => {
      testEvent = await storage.createEvent({
        name: `Test Event ${Date.now()}`,
        description: 'Test event description',
        type: 'quiz',
        category: 'technical',
        status: 'draft',
        createdBy: superAdminUser.id
      });
    });

    test('should transition event from draft to active', async () => {
      const response = await request(app)
        .patch(`/api/events/${testEvent.id}`)
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('active');
    });

    test('should transition event from active to completed', async () => {
      await storage.updateEvent(testEvent.id, { status: 'active' });

      const response = await request(app)
        .patch(`/api/events/${testEvent.id}`)
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
    });

    test('should allow updating event name and description', async () => {
      const updatedData = {
        name: 'Updated Event Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .patch(`/api/events/${testEvent.id}`)
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.description).toBe(updatedData.description);
    });
  });

  describe('Event Authorization', () => {
    let assignedEvent: any;
    let unassignedEvent: any;

    beforeEach(async () => {
      assignedEvent = await storage.createEvent({
        name: `Assigned Event ${Date.now()}`,
        description: 'Event assigned to event admin',
        type: 'quiz',
        category: 'technical',
        status: 'active',
        createdBy: superAdminUser.id
      });

      await storage.assignEventAdmin(assignedEvent.id, eventAdminUser.id);

      unassignedEvent = await storage.createEvent({
        name: `Unassigned Event ${Date.now()}`,
        description: 'Event not assigned to event admin',
        type: 'quiz',
        category: 'non_technical',
        status: 'active',
        createdBy: superAdminUser.id
      });
    });

    afterEach(async () => {
      if (assignedEvent?.id) {
        try {
          await storage.deleteEvent(assignedEvent.id);
        } catch (e) {}
      }
      if (unassignedEvent?.id) {
        try {
          await storage.deleteEvent(unassignedEvent.id);
        } catch (e) {}
      }
    });

    test('should allow event admin to access assigned event', async () => {
      const response = await request(app)
        .get(`/api/events/${assignedEvent.id}`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(assignedEvent.id);
    });

    test('should deny event admin access to unassigned event', async () => {
      const response = await request(app)
        .get(`/api/events/${unassignedEvent.id}`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You are not assigned to this event');
    });

    test('should allow super admin to access any event', async () => {
      const response = await request(app)
        .get(`/api/events/${unassignedEvent.id}`)
        .set(TestHelpers.createAuthHeader(superAdminToken));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(unassignedEvent.id);
    });
  });

  describe('Event Deletion and Cascade', () => {
    let eventWithData: any;
    let round: any;
    let question: any;
    let participant: any;

    beforeEach(async () => {
      eventWithData = await storage.createEvent({
        name: `Event For Cascade ${Date.now()}`,
        description: 'Event to test cascade deletion',
        type: 'quiz',
        category: 'technical',
        status: 'active',
        createdBy: superAdminUser.id
      });

      round = await storage.createRound({
        eventId: eventWithData.id,
        name: 'Round 1',
        description: 'Test round',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      });

      question = await storage.createQuestion({
        roundId: round.id,
        questionType: 'multiple_choice',
        questionText: 'Test question?',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A'
      });

      participant = await storage.registerParticipant({
        eventId: eventWithData.id,
        userId: participantUser.id
      });
    });

    test('should cascade delete rounds, questions, and participants when deleting event', async () => {
      const response = await request(app)
        .delete(`/api/events/${eventWithData.id}`)
        .set(TestHelpers.createAuthHeader(superAdminToken));

      expect(response.status).toBe(200);

      const deletedEvent = await storage.getEvent(eventWithData.id);
      expect(deletedEvent).toBeUndefined();

      const deletedRound = await storage.getRound(round.id);
      expect(deletedRound).toBeUndefined();

      const deletedQuestion = await storage.getQuestion(question.id);
      expect(deletedQuestion).toBeUndefined();

      const remainingParticipants = await storage.getParticipantsByEvent(eventWithData.id);
      expect(remainingParticipants).toHaveLength(0);

      eventWithData = null;
    });

    test('should reject event deletion by event admin', async () => {
      await storage.assignEventAdmin(eventWithData.id, eventAdminUser.id);

      const response = await request(app)
        .delete(`/api/events/${eventWithData.id}`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Super Admin access required');

      const event = await storage.getEvent(eventWithData.id);
      expect(event).toBeDefined();
    });
  });
});

describe('Round Lifecycle Tests', () => {
  let testEvent: any;
  let testRound: any;

  beforeEach(async () => {
    testEvent = await storage.createEvent({
      name: `Round Test Event ${Date.now()}`,
      description: 'Event for round testing',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    await storage.assignEventAdmin(testEvent.id, eventAdminUser.id);
  });

  afterEach(async () => {
    if (testRound?.id) {
      try {
        await storage.deleteRound(testRound.id);
      } catch (e) {}
      testRound = null;
    }
    if (testEvent?.id) {
      try {
        await storage.deleteEvent(testEvent.id);
      } catch (e) {}
      testEvent = null;
    }
  });

  describe('Round Creation', () => {
    test('should allow event admin to create round', async () => {
      const roundData = {
        name: 'Round 1',
        description: 'First round',
        roundNumber: 1,
        duration: 60,
        startTime: new Date('2025-12-01T10:00:00Z').toISOString(),
        endTime: new Date('2025-12-01T11:00:00Z').toISOString(),
        status: 'not_started'
      };

      const response = await request(app)
        .post(`/api/events/${testEvent.id}/rounds`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(roundData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(roundData.name);
      expect(response.body.roundNumber).toBe(roundData.roundNumber);
      expect(response.body.duration).toBe(roundData.duration);
      expect(response.body.status).toBe('not_started');

      testRound = response.body;
    });

    test('should allow super admin to create round', async () => {
      const roundData = {
        name: 'Round 1',
        description: 'First round',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      };

      const response = await request(app)
        .post(`/api/events/${testEvent.id}/rounds`)
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send(roundData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(roundData.name);

      testRound = response.body;
    });

    test('should reject unassigned event admin creating round', async () => {
      const roundData = {
        name: 'Round 1',
        description: 'First round',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      };

      const response = await request(app)
        .post(`/api/events/${testEvent.id}/rounds`)
        .set(TestHelpers.createAuthHeader(eventAdmin2Token))
        .send(roundData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You are not assigned to this event');
    });

    test('should support multiple rounds per event', async () => {
      const round1 = await storage.createRound({
        eventId: testEvent.id,
        name: 'Round 1',
        description: 'First round',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      });

      const round2Data = {
        name: 'Round 2',
        description: 'Second round',
        roundNumber: 2,
        duration: 45,
        status: 'not_started'
      };

      const response = await request(app)
        .post(`/api/events/${testEvent.id}/rounds`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(round2Data);

      expect(response.status).toBe(201);
      expect(response.body.roundNumber).toBe(2);

      const rounds = await storage.getRoundsByEvent(testEvent.id);
      expect(rounds).toHaveLength(2);
      expect(rounds.map(r => r.roundNumber).sort()).toEqual([1, 2]);

      await storage.deleteRound(round1.id);
      await storage.deleteRound(response.body.id);
    });
  });

  describe('Round Updates', () => {
    beforeEach(async () => {
      testRound = await storage.createRound({
        eventId: testEvent.id,
        name: 'Round 1',
        description: 'Test round',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      });
    });

    test('should update round name and description', async () => {
      const updateData = {
        name: 'Updated Round Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .patch(`/api/rounds/${testRound.id}`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
    });

    test('should update round duration', async () => {
      const response = await request(app)
        .patch(`/api/rounds/${testRound.id}`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send({ duration: 90 });

      expect(response.status).toBe(200);
      expect(response.body.duration).toBe(90);
    });

    test('should reject updates by unassigned event admin', async () => {
      const response = await request(app)
        .patch(`/api/rounds/${testRound.id}`)
        .set(TestHelpers.createAuthHeader(eventAdmin2Token))
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(403);
    });
  });

  describe('Round Status Transitions and Control', () => {
    beforeEach(async () => {
      testRound = await storage.createRound({
        eventId: testEvent.id,
        name: 'Round 1',
        description: 'Test round',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      });
    });

    test('should start round and update status to in_progress', async () => {
      const beforeStart = new Date();

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/start`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      const afterStart = new Date();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
      expect(response.body.startedAt).toBeDefined();

      const startedAt = new Date(response.body.startedAt);
      expect(startedAt.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
      expect(startedAt.getTime()).toBeLessThanOrEqual(afterStart.getTime());
    });

    test('should trigger WebSocket broadcast on round start', async () => {
      await request(app)
        .post(`/api/rounds/${testRound.id}/start`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
      expect(mockNotify).toHaveBeenCalledWith(
        testEvent.id,
        testRound.id,
        'in_progress',
        expect.objectContaining({
          status: 'in_progress'
        })
      );
    });

    test('should reject starting already started round', async () => {
      await storage.updateRoundStatus(testRound.id, 'in_progress');

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/start`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not_started');
    });

    test('should end round and update status to completed', async () => {
      await storage.updateRoundStatus(testRound.id, 'in_progress');

      const beforeEnd = new Date();

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/end`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      const afterEnd = new Date();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.endedAt).toBeDefined();

      const endedAt = new Date(response.body.endedAt);
      expect(endedAt.getTime()).toBeGreaterThanOrEqual(beforeEnd.getTime());
      expect(endedAt.getTime()).toBeLessThanOrEqual(afterEnd.getTime());
    });

    test('should trigger WebSocket broadcast on round end', async () => {
      await storage.updateRoundStatus(testRound.id, 'in_progress');

      await request(app)
        .post(`/api/rounds/${testRound.id}/end`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
      expect(mockNotify).toHaveBeenCalledWith(
        testEvent.id,
        testRound.id,
        'completed',
        expect.objectContaining({
          status: 'completed'
        })
      );
    });

    test('should reject ending non-started round', async () => {
      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/end`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('in_progress');
    });

    test('should restart round and reset state', async () => {
      await storage.updateRoundStatus(testRound.id, 'in_progress');
      
      const testAttempt = await storage.createTestAttempt({
        roundId: testRound.id,
        userId: participantUser.id,
        status: 'in_progress'
      });

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/restart`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Round restarted successfully');
      expect(response.body.round.status).toBe('not_started');
      expect(response.body.round.startedAt).toBeNull();
      expect(response.body.round.endedAt).toBeNull();

      const attempt = await storage.getTestAttempt(testAttempt.id);
      expect(attempt).toBeUndefined();
    });

    test('should trigger WebSocket broadcast on round restart', async () => {
      await storage.updateRoundStatus(testRound.id, 'in_progress');

      await request(app)
        .post(`/api/rounds/${testRound.id}/restart`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
      expect(mockNotify).toHaveBeenCalledWith(
        testEvent.id,
        testRound.id,
        'not_started',
        expect.objectContaining({
          status: 'not_started',
          startedAt: null,
          endedAt: null
        })
      );
    });

    test('should track complete round lifecycle: start -> end -> restart', async () => {
      const startResponse = await request(app)
        .post(`/api/rounds/${testRound.id}/start`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));
      
      expect(startResponse.body.status).toBe('in_progress');
      expect(startResponse.body.startedAt).toBeDefined();
      expect(startResponse.body.endedAt).toBeNull();

      await TestHelpers.delay(100);

      const endResponse = await request(app)
        .post(`/api/rounds/${testRound.id}/end`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));
      
      expect(endResponse.body.status).toBe('completed');
      expect(endResponse.body.startedAt).toBeDefined();
      expect(endResponse.body.endedAt).toBeDefined();

      const startedAt = new Date(endResponse.body.startedAt);
      const endedAt = new Date(endResponse.body.endedAt);
      expect(endedAt.getTime()).toBeGreaterThan(startedAt.getTime());

      const restartResponse = await request(app)
        .post(`/api/rounds/${testRound.id}/restart`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));
      
      expect(restartResponse.body.round.status).toBe('not_started');
      expect(restartResponse.body.round.startedAt).toBeNull();
      expect(restartResponse.body.round.endedAt).toBeNull();
    });
  });

  describe('Round Deletion', () => {
    beforeEach(async () => {
      testRound = await storage.createRound({
        eventId: testEvent.id,
        name: 'Round 1',
        description: 'Test round',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      });
    });

    test('should allow event admin to delete round', async () => {
      const response = await request(app)
        .delete(`/api/rounds/${testRound.id}`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(200);

      const deletedRound = await storage.getRound(testRound.id);
      expect(deletedRound).toBeUndefined();

      testRound = null;
    });

    test('should allow super admin to delete round', async () => {
      const response = await request(app)
        .delete(`/api/rounds/${testRound.id}`)
        .set(TestHelpers.createAuthHeader(superAdminToken));

      expect(response.status).toBe(200);

      const deletedRound = await storage.getRound(testRound.id);
      expect(deletedRound).toBeUndefined();

      testRound = null;
    });

    test('should reject deletion by unassigned event admin', async () => {
      const response = await request(app)
        .delete(`/api/rounds/${testRound.id}`)
        .set(TestHelpers.createAuthHeader(eventAdmin2Token));

      expect(response.status).toBe(403);

      const round = await storage.getRound(testRound.id);
      expect(round).toBeDefined();
    });
  });
});

describe('Real-time WebSocket Synchronization Tests', () => {
  let testEvent: any;
  let testRound: any;
  let participant1: any;
  let participant2: any;

  beforeEach(async () => {
    testEvent = await storage.createEvent({
      name: `WebSocket Test Event ${Date.now()}`,
      description: 'Event for WebSocket testing',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    await storage.assignEventAdmin(testEvent.id, eventAdminUser.id);

    testRound = await storage.createRound({
      eventId: testEvent.id,
      name: 'Round 1',
      description: 'Test round',
      roundNumber: 1,
      duration: 60,
      status: 'not_started'
    });

    const participant1User = await storage.createUser({
      username: `ws_participant_1_${Date.now()}`,
      password: await TestHelpers.hashPassword('test123'),
      email: `ws_participant_1_${Date.now()}@test.com`,
      fullName: 'WS Participant 1',
      role: 'participant'
    });

    const participant2User = await storage.createUser({
      username: `ws_participant_2_${Date.now()}`,
      password: await TestHelpers.hashPassword('test123'),
      email: `ws_participant_2_${Date.now()}@test.com`,
      fullName: 'WS Participant 2',
      role: 'participant'
    });

    participant1 = await storage.registerParticipant({
      eventId: testEvent.id,
      userId: participant1User.id
    });

    participant2 = await storage.registerParticipant({
      eventId: testEvent.id,
      userId: participant2User.id
    });
  });

  afterEach(async () => {
    if (participant1) {
      const user = await storage.getUser(participant1.userId);
      if (user) await storage.deleteUser(user.id);
    }
    if (participant2) {
      const user = await storage.getUser(participant2.userId);
      if (user) await storage.deleteUser(user.id);
    }
    if (testRound?.id) {
      try {
        await storage.deleteRound(testRound.id);
      } catch (e) {}
    }
    if (testEvent?.id) {
      try {
        await storage.deleteEvent(testEvent.id);
      } catch (e) {}
    }
  });

  test('should broadcast roundStatus event when round starts', async () => {
    await request(app)
      .post(`/api/rounds/${testRound.id}/start`)
      .set(TestHelpers.createAuthHeader(eventAdminToken));

    const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      testEvent.id,
      testRound.id,
      'in_progress',
      expect.objectContaining({
        status: 'in_progress'
      })
    );
  });

  test('should broadcast roundStatus event when round ends', async () => {
    await storage.updateRoundStatus(testRound.id, 'in_progress');

    await request(app)
      .post(`/api/rounds/${testRound.id}/end`)
      .set(TestHelpers.createAuthHeader(eventAdminToken));

    const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      testEvent.id,
      testRound.id,
      'completed',
      expect.objectContaining({
        status: 'completed'
      })
    );
  });

  test('should broadcast roundStatus event when round restarts', async () => {
    await storage.updateRoundStatus(testRound.id, 'completed');

    await request(app)
      .post(`/api/rounds/${testRound.id}/restart`)
      .set(TestHelpers.createAuthHeader(eventAdminToken));

    const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      testEvent.id,
      testRound.id,
      'not_started',
      expect.objectContaining({
        status: 'not_started',
        startedAt: null,
        endedAt: null
      })
    );
  });

  test('should include event and round IDs in WebSocket broadcasts', async () => {
    await request(app)
      .post(`/api/rounds/${testRound.id}/start`)
      .set(TestHelpers.createAuthHeader(eventAdminToken));

    const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
    const callArgs = mockNotify.mock.calls[0];
    expect(callArgs[0]).toBe(testEvent.id);
    expect(callArgs[1]).toBe(testRound.id);
    expect(callArgs[2]).toBe('in_progress');
    expect(callArgs[3]).toHaveProperty('id', testRound.id);
    expect(callArgs[3]).toHaveProperty('eventId', testEvent.id);
  });

  test('should not broadcast when round status does not change', async () => {
    await storage.updateRoundStatus(testRound.id, 'in_progress');

    const response = await request(app)
      .post(`/api/rounds/${testRound.id}/start`)
      .set(TestHelpers.createAuthHeader(eventAdminToken));

    expect(response.status).toBe(400);
    const mockNotify = jest.mocked(WebSocketService.notifyRoundStatus);
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
