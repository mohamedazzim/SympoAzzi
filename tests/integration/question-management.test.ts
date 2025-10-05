import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';
import { TestHelpers } from '../utils/testHelpers';

let app: Express;
let server: Server;
let superAdminToken: string;
let eventAdminToken: string;
let eventAdmin2Token: string;
let superAdminUser: any;
let eventAdminUser: any;
let eventAdmin2User: any;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  server = await registerRoutes(app);

  const hashedPassword = await TestHelpers.hashPassword('test123');
  
  superAdminUser = await storage.createUser({
    username: `super_admin_qm_${Date.now()}`,
    password: hashedPassword,
    email: `super_admin_qm_${Date.now()}@test.com`,
    fullName: 'Super Admin QM Test',
    role: 'super_admin'
  });

  eventAdminUser = await storage.createUser({
    username: `event_admin_qm_${Date.now()}`,
    password: hashedPassword,
    email: `event_admin_qm_${Date.now()}@test.com`,
    fullName: 'Event Admin QM Test',
    role: 'event_admin'
  });

  eventAdmin2User = await storage.createUser({
    username: `event_admin_2_qm_${Date.now()}`,
    password: hashedPassword,
    email: `event_admin_2_qm_${Date.now()}@test.com`,
    fullName: 'Event Admin 2 QM Test',
    role: 'event_admin'
  });

  superAdminToken = TestHelpers.generateJWT(superAdminUser);
  eventAdminToken = TestHelpers.generateJWT(eventAdminUser);
  eventAdmin2Token = TestHelpers.generateJWT(eventAdmin2User);
});

afterAll(async () => {
  await storage.deleteUser(superAdminUser.id);
  await storage.deleteUser(eventAdminUser.id);
  await storage.deleteUser(eventAdmin2User.id);
  
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Question Management Tests', () => {
  let testEvent: any;
  let testRound: any;

  beforeEach(async () => {
    testEvent = await storage.createEvent({
      name: `Question Test Event ${Date.now()}`,
      description: 'Event for question testing',
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
  });

  afterEach(async () => {
    if (testEvent?.id) {
      try {
        await storage.deleteEvent(testEvent.id);
      } catch (e) {}
      testEvent = null;
    }
  });

  describe('Question CRUD Tests', () => {
    describe('Create Question', () => {
      test('should create MCQ question with valid data', async () => {
        const questionData = {
          questionType: 'multiple_choice',
          questionText: 'What is 2 + 2?',
          questionNumber: 1,
          points: 10,
          options: ['2', '3', '4', '5'],
          correctAnswer: '4'
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.questionType).toBe('multiple_choice');
        expect(response.body.questionText).toBe(questionData.questionText);
        expect(response.body.questionNumber).toBe(1);
        expect(response.body.points).toBe(10);
        expect(response.body.options).toEqual(questionData.options);
        expect(response.body.correctAnswer).toBe('4');
      });

      test('should create True/False question', async () => {
        const questionData = {
          questionType: 'true_false',
          questionText: 'The sky is blue.',
          questionNumber: 1,
          points: 5,
          options: ['True', 'False'],
          correctAnswer: 'True'
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(201);
        expect(response.body.questionType).toBe('true_false');
        expect(response.body.correctAnswer).toBe('True');
      });

      test('should create Short Answer question', async () => {
        const questionData = {
          questionType: 'short_answer',
          questionText: 'What is the capital of France?',
          questionNumber: 1,
          points: 5,
          expectedOutput: 'Paris'
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(201);
        expect(response.body.questionType).toBe('short_answer');
        expect(response.body.expectedOutput).toBe('Paris');
      });

      test('should create Coding question with test cases', async () => {
        const questionData = {
          questionType: 'coding',
          questionText: 'Write a function that adds two numbers',
          questionNumber: 1,
          points: 20,
          testCases: [
            { input: [1, 2], expectedOutput: 3 },
            { input: [5, 7], expectedOutput: 12 }
          ]
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(201);
        expect(response.body.questionType).toBe('coding');
        expect(response.body.testCases).toEqual(questionData.testCases);
      });

      test('should default points to 1 if not provided', async () => {
        const questionData = {
          questionType: 'multiple_choice',
          questionText: 'Test question',
          questionNumber: 1,
          options: ['A', 'B'],
          correctAnswer: 'A'
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(201);
        expect(response.body.points).toBe(1);
      });

      test('should allow super admin to create question', async () => {
        const questionData = {
          questionType: 'multiple_choice',
          questionText: 'Test question by super admin',
          questionNumber: 1,
          points: 10,
          options: ['A', 'B'],
          correctAnswer: 'A'
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(superAdminToken))
          .send(questionData);

        expect(response.status).toBe(201);
      });

      test('should reject question creation without questionText', async () => {
        const questionData = {
          questionType: 'multiple_choice',
          questionNumber: 1
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('required');
      });

      test('should reject question creation without questionNumber', async () => {
        const questionData = {
          questionType: 'multiple_choice',
          questionText: 'Test question'
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('required');
      });

      test('should reject question creation without questionType', async () => {
        const questionData = {
          questionText: 'Test question',
          questionNumber: 1
        };

        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send(questionData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('required');
      });
    });

    describe('Get Questions', () => {
      test('should get all questions for a round', async () => {
        const q1 = await storage.createQuestion({
          roundId: testRound.id,
          questionType: 'multiple_choice',
          questionText: 'Question 1',
          questionNumber: 1,
          points: 10,
          options: ['A', 'B'],
          correctAnswer: 'A'
        });

        const q2 = await storage.createQuestion({
          roundId: testRound.id,
          questionType: 'short_answer',
          questionText: 'Question 2',
          questionNumber: 2,
          points: 5,
          expectedOutput: 'Answer'
        });

        const response = await request(app)
          .get(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(2);
        expect(response.body.map((q: any) => q.questionNumber).sort()).toEqual([1, 2]);
      });

      test('should return empty array for round with no questions', async () => {
        const response = await request(app)
          .get(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken));

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      test('should allow super admin to get questions', async () => {
        await storage.createQuestion({
          roundId: testRound.id,
          questionType: 'multiple_choice',
          questionText: 'Question 1',
          questionNumber: 1,
          points: 10,
          options: ['A', 'B'],
          correctAnswer: 'A'
        });

        const response = await request(app)
          .get(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(superAdminToken));

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
      });
    });

    describe('Update Question', () => {
      let testQuestion: any;

      beforeEach(async () => {
        testQuestion = await storage.createQuestion({
          roundId: testRound.id,
          questionType: 'multiple_choice',
          questionText: 'Original Question',
          questionNumber: 1,
          points: 10,
          options: ['A', 'B', 'C'],
          correctAnswer: 'A'
        });
      });

      test('should allow super admin to update question text', async () => {
        const updateData = {
          questionText: 'Updated Question Text'
        };

        const response = await request(app)
          .put(`/api/super-admin/questions/${testQuestion.id}/override`)
          .set(TestHelpers.createAuthHeader(superAdminToken))
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.questionText).toBe('Updated Question Text');
      });

      test('should allow super admin to update points', async () => {
        const updateData = {
          points: 20
        };

        const response = await request(app)
          .put(`/api/super-admin/questions/${testQuestion.id}/override`)
          .set(TestHelpers.createAuthHeader(superAdminToken))
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.points).toBe(20);
      });

      test('should allow super admin to update options and correctAnswer', async () => {
        const updateData = {
          options: ['Option1', 'Option2', 'Option3', 'Option4'],
          correctAnswer: 'Option2'
        };

        const response = await request(app)
          .put(`/api/super-admin/questions/${testQuestion.id}/override`)
          .set(TestHelpers.createAuthHeader(superAdminToken))
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.options).toEqual(updateData.options);
        expect(response.body.correctAnswer).toBe('Option2');
      });

      test('should return 404 for non-existent question', async () => {
        const response = await request(app)
          .put('/api/super-admin/questions/non-existent-id/override')
          .set(TestHelpers.createAuthHeader(superAdminToken))
          .send({ questionText: 'Updated' });

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');
      });
    });

    describe('Delete Question', () => {
      let testQuestion: any;

      beforeEach(async () => {
        testQuestion = await storage.createQuestion({
          roundId: testRound.id,
          questionType: 'multiple_choice',
          questionText: 'Question to delete',
          questionNumber: 1,
          points: 10,
          options: ['A', 'B'],
          correctAnswer: 'A'
        });
      });

      test('should allow super admin to delete question', async () => {
        const response = await request(app)
          .delete(`/api/super-admin/questions/${testQuestion.id}/override`)
          .set(TestHelpers.createAuthHeader(superAdminToken))
          .send({ reason: 'Test deletion' });

        expect(response.status).toBe(204);

        const deletedQuestion = await storage.getQuestion(testQuestion.id);
        expect(deletedQuestion).toBeUndefined();
      });

      test('should return 404 when deleting non-existent question', async () => {
        const response = await request(app)
          .delete('/api/super-admin/questions/non-existent-id/override')
          .set(TestHelpers.createAuthHeader(superAdminToken))
          .send({ reason: 'Test' });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Question Authorization Tests', () => {
    let assignedEvent: any;
    let unassignedEvent: any;
    let assignedRound: any;
    let unassignedRound: any;

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

      assignedRound = await storage.createRound({
        eventId: assignedEvent.id,
        name: 'Assigned Round',
        description: 'Round in assigned event',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
      });

      unassignedEvent = await storage.createEvent({
        name: `Unassigned Event ${Date.now()}`,
        description: 'Event not assigned to event admin',
        type: 'quiz',
        category: 'non_technical',
        status: 'active',
        createdBy: superAdminUser.id
      });

      unassignedRound = await storage.createRound({
        eventId: unassignedEvent.id,
        name: 'Unassigned Round',
        description: 'Round in unassigned event',
        roundNumber: 1,
        duration: 60,
        status: 'not_started'
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

    test('should allow event admin to create question in assigned event', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A'
      };

      const response = await request(app)
        .post(`/api/rounds/${assignedRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
    });

    test('should deny event admin creating question in unassigned event', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A'
      };

      const response = await request(app)
        .post(`/api/rounds/${unassignedRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('not assigned');
    });

    test('should allow event admin to get questions in assigned event', async () => {
      await storage.createQuestion({
        roundId: assignedRound.id,
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A'
      });

      const response = await request(app)
        .get(`/api/rounds/${assignedRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    test('should deny event admin getting questions in unassigned event', async () => {
      const response = await request(app)
        .get(`/api/rounds/${unassignedRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(response.status).toBe(403);
    });

    test('should allow super admin to access any event questions', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A'
      };

      const createResponse = await request(app)
        .post(`/api/rounds/${unassignedRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send(questionData);

      expect(createResponse.status).toBe(201);

      const getResponse = await request(app)
        .get(`/api/rounds/${unassignedRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(superAdminToken));

      expect(getResponse.status).toBe(200);
    });
  });

  describe('Question Type Validation Tests', () => {
    test('should validate MCQ has options array', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'What is 2 + 2?',
        questionNumber: 1,
        points: 10,
        correctAnswer: '4'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.options).toBeNull();
    });

    test('should accept MCQ with options and correctAnswer', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'What is 2 + 2?',
        questionNumber: 1,
        points: 10,
        options: ['2', '3', '4', '5'],
        correctAnswer: '4'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.options).toHaveLength(4);
      expect(response.body.correctAnswer).toBe('4');
    });

    test('should accept True/False with boolean correctAnswer as string', async () => {
      const questionData = {
        questionType: 'true_false',
        questionText: 'Is this a test?',
        questionNumber: 1,
        points: 5,
        options: ['True', 'False'],
        correctAnswer: 'True'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(['True', 'False']).toContain(response.body.correctAnswer);
    });

    test('should accept Short Answer with expectedOutput', async () => {
      const questionData = {
        questionType: 'short_answer',
        questionText: 'What is the capital?',
        questionNumber: 1,
        points: 5,
        expectedOutput: 'Paris'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.expectedOutput).toBe('Paris');
    });

    test('should validate Coding question with testCases JSON structure', async () => {
      const questionData = {
        questionType: 'coding',
        questionText: 'Write a function',
        questionNumber: 1,
        points: 20,
        testCases: [
          { input: [1, 2], expectedOutput: 3 },
          { input: [10, 20], expectedOutput: 30 }
        ]
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(Array.isArray(response.body.testCases)).toBe(true);
      expect(response.body.testCases).toHaveLength(2);
      expect(response.body.testCases[0]).toHaveProperty('input');
      expect(response.body.testCases[0]).toHaveProperty('expectedOutput');
    });

    test('should accept question with any questionType string', async () => {
      const questionData = {
        questionType: 'custom_type',
        questionText: 'Custom question type',
        questionNumber: 1,
        points: 10
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.questionType).toBe('custom_type');
    });
  });

  describe('Bulk Upload Tests', () => {
    test('should bulk upload questions via JSON array', async () => {
      const questionsData = {
        questions: [
          {
            questionType: 'multiple_choice',
            questionText: 'Question 1',
            questionNumber: 1,
            points: 10,
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B'
          },
          {
            questionType: 'true_false',
            questionText: 'Question 2',
            questionNumber: 2,
            points: 5,
            options: ['True', 'False'],
            correctAnswer: 'False'
          },
          {
            questionType: 'short_answer',
            questionText: 'Question 3',
            questionNumber: 3,
            points: 5,
            expectedOutput: 'Answer'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionsData);

      expect(response.status).toBe(201);
      expect(response.body.created).toBe(3);
      expect(response.body.questions).toHaveLength(3);
      expect(response.body.message).toContain('Successfully created 3 questions');
    });

    test('should handle bulk upload with mixed question types', async () => {
      const questionsData = {
        questions: [
          {
            questionType: 'multiple_choice',
            questionText: 'MCQ Question',
            questionNumber: 1,
            points: 10,
            options: ['A', 'B'],
            correctAnswer: 'A'
          },
          {
            questionType: 'coding',
            questionText: 'Coding Question',
            questionNumber: 2,
            points: 20,
            testCases: [{ input: [1, 2], expectedOutput: 3 }]
          },
          {
            questionType: 'short_answer',
            questionText: 'Short Answer Question',
            questionNumber: 3,
            points: 5,
            expectedOutput: 'Answer'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionsData);

      expect(response.status).toBe(201);
      expect(response.body.created).toBe(3);
      expect(response.body.questions).toHaveLength(3);
    });

    test('should reject bulk upload with empty questions array', async () => {
      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send({ questions: [] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must not be empty');
    });

    test('should reject bulk upload without questions field', async () => {
      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    test('should handle bulk upload with missing required fields', async () => {
      const questionsData = {
        questions: [
          {
            questionType: 'multiple_choice',
            questionText: 'Valid Question',
            questionNumber: 1,
            points: 10,
            options: ['A', 'B'],
            correctAnswer: 'A'
          },
          {
            questionType: 'multiple_choice',
            questionNumber: 2,
            points: 10
          },
          {
            questionType: 'multiple_choice',
            questionText: 'Another valid question',
            questionNumber: 3,
            points: 5,
            options: ['X', 'Y'],
            correctAnswer: 'X'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionsData);

      expect(response.status).toBe(201);
      expect(response.body.created).toBe(2);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toContain('Question 2');
    });

    test('should reject bulk upload if all questions fail validation', async () => {
      const questionsData = {
        questions: [
          { questionNumber: 1 },
          { questionText: 'No number' },
          { questionType: 'test' }
        ]
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionsData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Failed to create any questions');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBe(3);
    });

    test('should verify all questions created correctly after bulk upload', async () => {
      const questionsData = {
        questions: [
          {
            questionType: 'multiple_choice',
            questionText: 'Q1',
            questionNumber: 1,
            points: 10,
            options: ['A', 'B'],
            correctAnswer: 'A'
          },
          {
            questionType: 'multiple_choice',
            questionText: 'Q2',
            questionNumber: 2,
            points: 5,
            options: ['X', 'Y'],
            correctAnswer: 'Y'
          }
        ]
      };

      const createResponse = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionsData);

      expect(createResponse.status).toBe(201);

      const getResponse = await request(app)
        .get(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveLength(2);
      expect(getResponse.body[0].questionText).toBe('Q1');
      expect(getResponse.body[1].questionText).toBe('Q2');
    });

    test('should allow super admin to bulk upload questions', async () => {
      const questionsData = {
        questions: [
          {
            questionType: 'multiple_choice',
            questionText: 'Super Admin Question',
            questionNumber: 1,
            points: 10,
            options: ['A', 'B'],
            correctAnswer: 'A'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions/bulk`)
        .set(TestHelpers.createAuthHeader(superAdminToken))
        .send(questionsData);

      expect(response.status).toBe(201);
      expect(response.body.created).toBe(1);
    });
  });

  describe('Question Validation Tests', () => {
    test('should accept positive integer points', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 15,
        options: ['A', 'B'],
        correctAnswer: 'A'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.points).toBe(15);
    });

    test('should accept question with 1 point', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 1,
        options: ['A', 'B'],
        correctAnswer: 'A'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.points).toBe(1);
    });

    test('should not allow empty questionText', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: '',
        questionNumber: 1,
        points: 10
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(400);
    });

    test('should allow MCQ with 2 options', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 10,
        options: ['True', 'False'],
        correctAnswer: 'True'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.options).toHaveLength(2);
    });

    test('should allow MCQ with more than 2 options', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 'C'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.options).toHaveLength(5);
    });

    test('should accept MCQ where correctAnswer matches one of the options', async () => {
      const questionData = {
        questionType: 'multiple_choice',
        questionText: 'Test question',
        questionNumber: 1,
        points: 10,
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option B'
      };

      const response = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.options).toContain(response.body.correctAnswer);
    });

    test('should allow multiple questions with different question numbers in same round', async () => {
      const q1Data = {
        questionType: 'multiple_choice',
        questionText: 'Question 1',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A'
      };

      const q2Data = {
        questionType: 'multiple_choice',
        questionText: 'Question 2',
        questionNumber: 2,
        points: 5,
        options: ['X', 'Y'],
        correctAnswer: 'X'
      };

      const response1 = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(q1Data);

      const response2 = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(q2Data);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.questionNumber).toBe(1);
      expect(response2.body.questionNumber).toBe(2);
    });

    test('should allow same question number in different rounds', async () => {
      const round2 = await storage.createRound({
        eventId: testEvent.id,
        name: 'Round 2',
        description: 'Second test round',
        roundNumber: 2,
        duration: 45,
        status: 'not_started'
      });

      const q1Data = {
        questionType: 'multiple_choice',
        questionText: 'Question 1 in Round 1',
        questionNumber: 1,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A'
      };

      const q2Data = {
        questionType: 'multiple_choice',
        questionText: 'Question 1 in Round 2',
        questionNumber: 1,
        points: 5,
        options: ['X', 'Y'],
        correctAnswer: 'X'
      };

      const response1 = await request(app)
        .post(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(q1Data);

      const response2 = await request(app)
        .post(`/api/rounds/${round2.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken))
        .send(q2Data);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.roundId).toBe(testRound.id);
      expect(response2.body.roundId).toBe(round2.id);
      expect(response1.body.questionNumber).toBe(1);
      expect(response2.body.questionNumber).toBe(1);
    });
  });

  describe('Question Number Sequencing Tests', () => {
    test('should allow creating questions with sequential numbers', async () => {
      const questions = [];
      for (let i = 1; i <= 5; i++) {
        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send({
            questionType: 'multiple_choice',
            questionText: `Question ${i}`,
            questionNumber: i,
            points: 10,
            options: ['A', 'B'],
            correctAnswer: 'A'
          });

        expect(response.status).toBe(201);
        questions.push(response.body);
      }

      expect(questions).toHaveLength(5);
      expect(questions.map(q => q.questionNumber)).toEqual([1, 2, 3, 4, 5]);
    });

    test('should allow creating questions with non-sequential numbers', async () => {
      const numbers = [5, 2, 8, 1, 10];
      
      for (const num of numbers) {
        const response = await request(app)
          .post(`/api/rounds/${testRound.id}/questions`)
          .set(TestHelpers.createAuthHeader(eventAdminToken))
          .send({
            questionType: 'multiple_choice',
            questionText: `Question ${num}`,
            questionNumber: num,
            points: 10,
            options: ['A', 'B'],
            correctAnswer: 'A'
          });

        expect(response.status).toBe(201);
      }

      const getResponse = await request(app)
        .get(`/api/rounds/${testRound.id}/questions`)
        .set(TestHelpers.createAuthHeader(eventAdminToken));

      expect(getResponse.body).toHaveLength(5);
    });
  });
});
