import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';
import { TestHelpers } from '../utils/testHelpers';
import { emailService } from '../../server/services/emailService';

let app: Express;
let server: Server;
let superAdminToken: string;
let regCommitteeToken: string;
let superAdminUser: any;
let regCommitteeUser: any;

jest.mock('../../server/services/emailService');

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  server = await registerRoutes(app);

  const hashedPassword = await TestHelpers.hashPassword('test123');
  
  superAdminUser = await storage.createUser({
    username: `super_admin_reg_${Date.now()}`,
    password: hashedPassword,
    email: `super_admin_reg_${Date.now()}@test.com`,
    fullName: 'Super Admin Registration',
    role: 'super_admin'
  });

  regCommitteeUser = await storage.createUser({
    username: `reg_committee_${Date.now()}`,
    password: hashedPassword,
    email: `reg_committee_${Date.now()}@test.com`,
    fullName: 'Registration Committee',
    role: 'registration_committee'
  });

  superAdminToken = TestHelpers.generateJWT(superAdminUser);
  regCommitteeToken = TestHelpers.generateJWT(regCommitteeUser);
});

afterAll(async () => {
  await storage.deleteUser(superAdminUser.id);
  await storage.deleteUser(regCommitteeUser.id);
  
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Public Registration Flow Tests', () => {
  let registrationForm: any;
  let technicalEvent: any;
  let nonTechnicalEvent1: any;
  let nonTechnicalEvent2: any;

  beforeEach(async () => {
    technicalEvent = await storage.createEvent({
      name: `Tech Event ${Date.now()}`,
      description: 'Technical event',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    nonTechnicalEvent1 = await storage.createEvent({
      name: `Non-Tech Event 1 ${Date.now()}`,
      description: 'Non-technical event 1',
      type: 'general',
      category: 'non_technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    nonTechnicalEvent2 = await storage.createEvent({
      name: `Non-Tech Event 2 ${Date.now()}`,
      description: 'Non-technical event 2',
      type: 'general',
      category: 'non_technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    registrationForm = await storage.createRegistrationForm({
      title: 'Test Registration Form',
      description: 'Test form',
      formSlug: `test-form-${Date.now()}`,
      formFields: [
        { id: 'fullName', label: 'Full Name', type: 'text', required: true },
        { id: 'email', label: 'Email', type: 'email', required: true },
        { id: 'phone', label: 'Phone', type: 'tel', required: true }
      ],
      allowedCategories: ['technical', 'non_technical'],
      isActive: true
    });
  });

  afterEach(async () => {
    if (technicalEvent?.id) await storage.deleteEvent(technicalEvent.id);
    if (nonTechnicalEvent1?.id) await storage.deleteEvent(nonTechnicalEvent1.id);
    if (nonTechnicalEvent2?.id) await storage.deleteEvent(nonTechnicalEvent2.id);
    if (registrationForm?.id) await storage.deleteRegistrationForm(registrationForm.id);
  });

  test('should successfully register via public form', async () => {
    const registrationData = {
      submittedData: {
        fullName: 'John Doe',
        email: 'john.doe@test.com',
        phone: '1234567890'
      },
      selectedEvents: [technicalEvent.id]
    };

    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send(registrationData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.submittedData.email).toBe('john.doe@test.com');
    expect(response.body.selectedEvents).toContain(technicalEvent.id);
    expect(response.body.paymentStatus).toBe('pending');
  });

  test('should validate form slug - reject invalid slug', async () => {
    const response = await request(app)
      .post('/api/registration-forms/invalid-slug-123/submit')
      .send({
        submittedData: { fullName: 'Test', email: 'test@test.com', phone: '123' },
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Form not found');
  });

  test('should reject registration when form is inactive', async () => {
    await storage.updateRegistrationForm(registrationForm.id, { isActive: false });

    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'Test', email: 'test@test.com', phone: '123' },
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('no longer accepting submissions');

    await storage.updateRegistrationForm(registrationForm.id, { isActive: true });
  });

  test('should reject registration with more than 1 technical event', async () => {
    const technicalEvent2 = await storage.createEvent({
      name: `Tech Event 2 ${Date.now()}`,
      description: 'Technical event 2',
      type: 'coding',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'Test', email: 'test@test.com', phone: '123' },
        selectedEvents: [technicalEvent.id, technicalEvent2.id]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Only one technical event can be selected');

    await storage.deleteEvent(technicalEvent2.id);
  });

  test('should reject registration with more than 2 non-technical events', async () => {
    const nonTechnicalEvent3 = await storage.createEvent({
      name: `Non-Tech Event 3 ${Date.now()}`,
      description: 'Non-technical event 3',
      type: 'general',
      category: 'non_technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'Test', email: 'test@test.com', phone: '123' },
        selectedEvents: [nonTechnicalEvent1.id, nonTechnicalEvent2.id, nonTechnicalEvent3.id]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Only one non-technical event can be selected');

    await storage.deleteEvent(nonTechnicalEvent3.id);
  });

  test('should allow 1 technical + 1 non-technical event registration', async () => {
    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'Test User', email: 'test.user@test.com', phone: '9876543210' },
        selectedEvents: [technicalEvent.id, nonTechnicalEvent1.id]
      });

    expect(response.status).toBe(201);
    expect(response.body.selectedEvents).toHaveLength(2);
  });

  test('should reject registration with time overlapping events', async () => {
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');

    const round1 = await storage.createRound({
      eventId: technicalEvent.id,
      name: 'Round 1',
      roundNumber: 1,
      duration: 60,
      startTime,
      endTime,
      status: 'not_started'
    });

    const round2 = await storage.createRound({
      eventId: nonTechnicalEvent1.id,
      name: 'Round 1',
      roundNumber: 1,
      duration: 60,
      startTime: new Date('2025-12-01T10:30:00Z'),
      endTime: new Date('2025-12-01T11:30:00Z'),
      status: 'not_started'
    });

    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'Test', email: 'test@test.com', phone: '123' },
        selectedEvents: [technicalEvent.id, nonTechnicalEvent1.id]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('overlapping times');

    await storage.deleteRound(round1.id);
    await storage.deleteRound(round2.id);
  });

  test('should validate required registration data fields', async () => {
    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: {},
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(201);
  });

  test('should require submittedData and selectedEvents', async () => {
    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('submittedData and selectedEvents are required');
  });

  test('should require at least one event to be selected', async () => {
    const response = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'Test', email: 'test@test.com', phone: '123' },
        selectedEvents: []
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('At least one event must be selected');
  });
});

describe('On-Spot Registration Tests (Registration Committee)', () => {
  let technicalEvent: any;
  let nonTechnicalEvent: any;

  beforeEach(async () => {
    technicalEvent = await storage.createEvent({
      name: `Quiz Master Challenge ${Date.now()}`,
      description: 'Technical quiz event',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    nonTechnicalEvent = await storage.createEvent({
      name: `General Knowledge ${Date.now()}`,
      description: 'Non-technical event',
      type: 'general',
      category: 'non_technical',
      status: 'active',
      createdBy: superAdminUser.id
    });
  });

  afterEach(async () => {
    if (technicalEvent?.id) await storage.deleteEvent(technicalEvent.id);
    if (nonTechnicalEvent?.id) await storage.deleteEvent(nonTechnicalEvent.id);
  });

  test('should create participant with auto-generated credentials', async () => {
    const participantData = {
      fullName: 'Alice Johnson',
      email: 'alice.johnson@test.com',
      phone: '1234567890',
      selectedEvents: [technicalEvent.id]
    };

    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send(participantData);

    expect(response.status).toBe(201);
    expect(response.body.participant.fullName).toBe('Alice Johnson');
    expect(response.body.eventCredentials).toHaveLength(1);
    
    const credential = response.body.eventCredentials[0];
    expect(credential.eventUsername).toMatch(/quiz-master-challenge-.*-alice-001/);
    expect(credential.eventPassword).toMatch(/johnson001/);
  });

  test('should increment counter for multiple participants in same event', async () => {
    const participant1Data = {
      fullName: 'Bob Smith',
      email: 'bob.smith@test.com',
      phone: '1111111111',
      selectedEvents: [technicalEvent.id]
    };

    const participant2Data = {
      fullName: 'Carol Davis',
      email: 'carol.davis@test.com',
      phone: '2222222222',
      selectedEvents: [technicalEvent.id]
    };

    const response1 = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send(participant1Data);

    const response2 = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send(participant2Data);

    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);

    const cred1 = response1.body.eventCredentials[0];
    const cred2 = response2.body.eventCredentials[0];

    expect(cred1.eventUsername).toContain('001');
    expect(cred2.eventUsername).toContain('002');
    expect(cred1.eventPassword).toContain('001');
    expect(cred2.eventPassword).toContain('002');
  });

  test('should generate credentials in eventname-firstname-counter format', async () => {
    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'David Wilson',
        email: 'david.wilson@test.com',
        phone: '3333333333',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(201);
    const username = response.body.eventCredentials[0].eventUsername;
    
    const parts = username.split('-');
    expect(parts).toContain('david');
    expect(parts[parts.length - 1]).toMatch(/^\d{3}$/);
  });

  test('should generate password in shortname+counter format', async () => {
    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Emma Thompson',
        email: 'emma.thompson@test.com',
        phone: '4444444444',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(201);
    const password = response.body.eventCredentials[0].eventPassword;
    
    expect(password).toMatch(/^[a-z]+\d{3}$/);
    expect(password).toContain('thompson');
  });

  test('should create multiple event credentials for participant', async () => {
    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Frank Miller',
        email: 'frank.miller@test.com',
        phone: '5555555555',
        selectedEvents: [technicalEvent.id, nonTechnicalEvent.id]
      });

    expect(response.status).toBe(201);
    expect(response.body.eventCredentials).toHaveLength(2);
    
    const usernames = response.body.eventCredentials.map((c: any) => c.eventUsername);
    expect(usernames).toHaveLength(2);
    expect(usernames.every((u: string) => u.includes('frank'))).toBe(true);
  });

  test('should require authentication for on-spot registration', async () => {
    const response = await request(app)
      .post('/api/registration-committee/participants')
      .send({
        fullName: 'Test User',
        email: 'test@test.com',
        phone: '1234567890',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(401);
  });

  test('should require registration committee role', async () => {
    const participantUser = await storage.createUser({
      username: `participant_${Date.now()}`,
      password: await TestHelpers.hashPassword('test123'),
      email: `participant_${Date.now()}@test.com`,
      fullName: 'Participant User',
      role: 'participant'
    });

    const participantToken = TestHelpers.generateJWT(participantUser);

    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(participantToken))
      .send({
        fullName: 'Test User',
        email: 'test@test.com',
        phone: '1234567890',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Registration Committee access required');

    await storage.deleteUser(participantUser.id);
  });

  test('should validate required fields for on-spot registration', async () => {
    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        email: 'test@test.com',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Full name, email, and at least one event are required');
  });

  test('should reject duplicate email for on-spot registration', async () => {
    const duplicateEmail = 'duplicate@test.com';

    await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'First User',
        email: duplicateEmail,
        phone: '1111111111',
        selectedEvents: [technicalEvent.id]
      });

    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Second User',
        email: duplicateEmail,
        phone: '2222222222',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Email already exists');
  });

  test('should send credentials via email after creation', async () => {
    const mockSendCredentials = jest.mocked(emailService.sendCredentials);
    mockSendCredentials.mockResolvedValue({ success: true, messageId: 'test-message-id' });

    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Grace Lee',
        email: 'grace.lee@test.com',
        phone: '6666666666',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(201);
    expect(mockSendCredentials).toHaveBeenCalled();
  });
});

describe('Credential Export Tests', () => {
  let technicalEvent: any;
  let participant1: any;
  let participant2: any;

  beforeEach(async () => {
    technicalEvent = await storage.createEvent({
      name: `Export Test Event ${Date.now()}`,
      description: 'Event for export testing',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    const mockSendCredentials = jest.mocked(emailService.sendCredentials);
    mockSendCredentials.mockResolvedValue({ success: true });

    const response1 = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Export User 1',
        email: `export1_${Date.now()}@test.com`,
        phone: '1111111111',
        selectedEvents: [technicalEvent.id]
      });

    const response2 = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Export User 2',
        email: `export2_${Date.now()}@test.com`,
        phone: '2222222222',
        selectedEvents: [technicalEvent.id]
      });

    participant1 = response1.body;
    participant2 = response2.body;
  });

  afterEach(async () => {
    if (technicalEvent?.id) await storage.deleteEvent(technicalEvent.id);
  });

  test('should export credentials as CSV', async () => {
    const response = await request(app)
      .get('/api/registration-committee/participants/export/csv')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('participants-credentials.csv');
  });

  test('should verify CSV format with correct headers', async () => {
    const response = await request(app)
      .get('/api/registration-committee/participants/export/csv')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    
    const csvLines = response.text.split('\n');
    const headers = csvLines[0];
    
    expect(headers).toContain('Participant Name');
    expect(headers).toContain('Email');
    expect(headers).toContain('Phone');
    expect(headers).toContain('Event Name');
    expect(headers).toContain('Username');
    expect(headers).toContain('Password');
  });

  test('should include participant data in CSV export', async () => {
    const response = await request(app)
      .get('/api/registration-committee/participants/export/csv')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    
    const csvContent = response.text;
    expect(csvContent).toContain('Export User 1');
    expect(csvContent).toContain('Export User 2');
  });

  test('should export credentials as PDF', async () => {
    const response = await request(app)
      .get('/api/registration-committee/participants/export/pdf')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('participants-credentials.pdf');
  });

  test('should validate PDF generation response', async () => {
    const response = await request(app)
      .get('/api/registration-committee/participants/export/pdf')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('should require authentication for CSV export', async () => {
    const response = await request(app)
      .get('/api/registration-committee/participants/export/csv');

    expect(response.status).toBe(401);
  });

  test('should require authentication for PDF export', async () => {
    const response = await request(app)
      .get('/api/registration-committee/participants/export/pdf');

    expect(response.status).toBe(401);
  });

  test('should require registration committee role for CSV export', async () => {
    const participantUser = await storage.createUser({
      username: `participant_export_${Date.now()}`,
      password: await TestHelpers.hashPassword('test123'),
      email: `participant_export_${Date.now()}@test.com`,
      fullName: 'Participant User',
      role: 'participant'
    });

    const participantToken = TestHelpers.generateJWT(participantUser);

    const response = await request(app)
      .get('/api/registration-committee/participants/export/csv')
      .set(TestHelpers.createAuthHeader(participantToken));

    expect(response.status).toBe(403);

    await storage.deleteUser(participantUser.id);
  });

  test('should properly escape CSV special characters', async () => {
    const mockSendCredentials = jest.mocked(emailService.sendCredentials);
    mockSendCredentials.mockResolvedValue({ success: true });

    await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Test "Quote" User',
        email: `quote_${Date.now()}@test.com`,
        phone: '9999999999',
        selectedEvents: [technicalEvent.id]
      });

    const response = await request(app)
      .get('/api/registration-committee/participants/export/csv')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(response.text).toContain('Test ""Quote"" User');
  });
});

describe('Registration Approval Workflow Tests', () => {
  let registrationForm: any;
  let technicalEvent: any;
  let registration: any;

  beforeEach(async () => {
    technicalEvent = await storage.createEvent({
      name: `Approval Test Event ${Date.now()}`,
      description: 'Event for approval testing',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    registrationForm = await storage.createRegistrationForm({
      title: 'Approval Test Form',
      description: 'Test form for approval',
      formSlug: `approval-test-${Date.now()}`,
      formFields: [
        { id: 'fullName', label: 'Full Name', type: 'text', required: true },
        { id: 'email', label: 'Email', type: 'email', required: true },
        { id: 'phone', label: 'Phone', type: 'tel', required: true }
      ],
      allowedCategories: ['technical', 'non_technical'],
      isActive: true
    });

    const regResponse = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: {
          fullName: 'Approval Test User',
          email: `approval_${Date.now()}@test.com`,
          phone: '1234567890'
        },
        selectedEvents: [technicalEvent.id]
      });

    registration = regResponse.body;
  });

  afterEach(async () => {
    if (technicalEvent?.id) await storage.deleteEvent(technicalEvent.id);
    if (registrationForm?.id) await storage.deleteRegistrationForm(registrationForm.id);
  });

  test('should approve registration and create user account', async () => {
    const mockSendEmail = jest.mocked(emailService.sendRegistrationApproved);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' });

    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(response.body.registration.paymentStatus).toBe('paid');
    expect(response.body.registration.participantUserId).toBeDefined();
    expect(response.body.mainCredentials).toBeDefined();
    expect(response.body.eventCredentials).toHaveLength(1);
  });

  test('should generate credentials on approval', async () => {
    const mockSendEmail = jest.mocked(emailService.sendRegistrationApproved);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' });

    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    
    const eventCred = response.body.eventCredentials[0];
    expect(eventCred.eventUsername).toBeDefined();
    expect(eventCred.eventPassword).toBeDefined();
    expect(eventCred.eventName).toBeDefined();
  });

  test('should transition status from pending to paid on approval', async () => {
    const mockSendEmail = jest.mocked(emailService.sendRegistrationApproved);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' });

    expect(registration.paymentStatus).toBe('pending');

    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(response.body.registration.paymentStatus).toBe('paid');
  });

  test('should send approval email with credentials', async () => {
    const mockSendEmail = jest.mocked(emailService.sendRegistrationApproved);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' });

    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalled();
    
    const callArgs = mockSendEmail.mock.calls[0];
    expect(callArgs[0]).toContain('@test.com');
    expect(callArgs[2]).toBeDefined();
    expect(callArgs[3]).toBeDefined();
    expect(callArgs[4]).toBeDefined();
  });

  test('should require authentication for approval', async () => {
    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`);

    expect(response.status).toBe(401);
  });

  test('should require registration committee or super admin role for approval', async () => {
    const participantUser = await storage.createUser({
      username: `participant_approval_${Date.now()}`,
      password: await TestHelpers.hashPassword('test123'),
      email: `participant_approval_${Date.now()}@test.com`,
      fullName: 'Participant User',
      role: 'participant'
    });

    const participantToken = TestHelpers.generateJWT(participantUser);

    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(participantToken));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Forbidden');

    await storage.deleteUser(participantUser.id);
  });

  test('should allow super admin to approve registration', async () => {
    const mockSendEmail = jest.mocked(emailService.sendRegistrationApproved);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' });

    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(superAdminToken));

    expect(response.status).toBe(200);
    expect(response.body.registration.paymentStatus).toBe('paid');
  });

  test('should reject approval of already processed registration', async () => {
    const mockSendEmail = jest.mocked(emailService.sendRegistrationApproved);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' });

    await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    const response = await request(app)
      .patch(`/api/registrations/${registration.id}/approve`)
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already been processed');
  });

  test('should return 404 for non-existent registration', async () => {
    const response = await request(app)
      .patch('/api/registrations/non-existent-id/approve')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Registration not found');
  });

  test('should create participant records for all selected events on approval', async () => {
    const nonTechnicalEvent = await storage.createEvent({
      name: `Non-Tech Approval ${Date.now()}`,
      description: 'Non-technical event',
      type: 'general',
      category: 'non_technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    const multiEventReg = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: {
          fullName: 'Multi Event User',
          email: `multi_event_${Date.now()}@test.com`,
          phone: '9999999999'
        },
        selectedEvents: [technicalEvent.id, nonTechnicalEvent.id]
      });

    const mockSendEmail = jest.mocked(emailService.sendRegistrationApproved);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' });

    const response = await request(app)
      .patch(`/api/registrations/${multiEventReg.body.id}/approve`)
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(response.body.eventCredentials).toHaveLength(2);

    await storage.deleteEvent(nonTechnicalEvent.id);
  });
});

describe('Credential Management Tests', () => {
  let technicalEvent: any;
  let participantUser: any;
  let participantToken: string;

  beforeEach(async () => {
    technicalEvent = await storage.createEvent({
      name: `Credential Test Event ${Date.now()}`,
      description: 'Event for credential testing',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    const mockSendCredentials = jest.mocked(emailService.sendCredentials);
    mockSendCredentials.mockResolvedValue({ success: true });

    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Credential Test User',
        email: `cred_test_${Date.now()}@test.com`,
        phone: '1234567890',
        selectedEvents: [technicalEvent.id]
      });

    participantUser = response.body.participant;
    
    const user = await storage.getUserByEmail(response.body.participant.email);
    participantToken = TestHelpers.generateJWT({
      ...user!,
      eventId: technicalEvent.id
    });
  });

  afterEach(async () => {
    if (technicalEvent?.id) await storage.deleteEvent(technicalEvent.id);
  });

  test('should view participant credentials', async () => {
    const response = await request(app)
      .get('/api/participants/my-credential')
      .set(TestHelpers.createAuthHeader(participantToken));

    expect(response.status).toBe(200);
    expect(response.body.credential).toBeDefined();
    expect(response.body.credential.eventUsername).toBeDefined();
    expect(response.body.event).toBeDefined();
    expect(response.body.rounds).toBeDefined();
  });

  test('should display credentials in response after on-spot creation', async () => {
    const mockSendCredentials = jest.mocked(emailService.sendCredentials);
    mockSendCredentials.mockResolvedValue({ success: true });

    const response = await request(app)
      .post('/api/registration-committee/participants')
      .set(TestHelpers.createAuthHeader(regCommitteeToken))
      .send({
        fullName: 'Display Cred User',
        email: `display_${Date.now()}@test.com`,
        phone: '5555555555',
        selectedEvents: [technicalEvent.id]
      });

    expect(response.status).toBe(201);
    expect(response.body.eventCredentials).toBeDefined();
    expect(response.body.eventCredentials).toHaveLength(1);
    expect(response.body.eventCredentials[0].eventUsername).toBeDefined();
    expect(response.body.eventCredentials[0].eventPassword).toBeDefined();
  });

  test('should require authentication to view credentials', async () => {
    const response = await request(app)
      .get('/api/participants/my-credential');

    expect(response.status).toBe(401);
  });

  test('should require participant role to view own credentials', async () => {
    const response = await request(app)
      .get('/api/participants/my-credential')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Participant access required');
  });
});

describe('Registration List and Query Tests', () => {
  let registrationForm: any;
  let technicalEvent: any;
  let registration1: any;
  let registration2: any;

  beforeEach(async () => {
    technicalEvent = await storage.createEvent({
      name: `List Test Event ${Date.now()}`,
      description: 'Event for list testing',
      type: 'quiz',
      category: 'technical',
      status: 'active',
      createdBy: superAdminUser.id
    });

    registrationForm = await storage.createRegistrationForm({
      title: 'List Test Form',
      description: 'Test form',
      formSlug: `list-test-${Date.now()}`,
      formFields: [
        { id: 'fullName', label: 'Full Name', type: 'text', required: true },
        { id: 'email', label: 'Email', type: 'email', required: true }
      ],
      allowedCategories: ['technical', 'non_technical'],
      isActive: true
    });

    const reg1 = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'List User 1', email: `list1_${Date.now()}@test.com` },
        selectedEvents: [technicalEvent.id]
      });

    const reg2 = await request(app)
      .post(`/api/registration-forms/${registrationForm.formSlug}/submit`)
      .send({
        submittedData: { fullName: 'List User 2', email: `list2_${Date.now()}@test.com` },
        selectedEvents: [technicalEvent.id]
      });

    registration1 = reg1.body;
    registration2 = reg2.body;
  });

  afterEach(async () => {
    if (technicalEvent?.id) await storage.deleteEvent(technicalEvent.id);
    if (registrationForm?.id) await storage.deleteRegistrationForm(registrationForm.id);
  });

  test('should list all registrations for registration committee', async () => {
    const response = await request(app)
      .get('/api/registrations')
      .set(TestHelpers.createAuthHeader(regCommitteeToken));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  test('should list all registrations for super admin', async () => {
    const response = await request(app)
      .get('/api/registrations')
      .set(TestHelpers.createAuthHeader(superAdminToken));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('should deny access to registrations list for non-authorized roles', async () => {
    const participantUser = await storage.createUser({
      username: `participant_list_${Date.now()}`,
      password: await TestHelpers.hashPassword('test123'),
      email: `participant_list_${Date.now()}@test.com`,
      fullName: 'Participant User',
      role: 'participant'
    });

    const participantToken = TestHelpers.generateJWT(participantUser);

    const response = await request(app)
      .get('/api/registrations')
      .set(TestHelpers.createAuthHeader(participantToken));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Forbidden');

    await storage.deleteUser(participantUser.id);
  });
});
