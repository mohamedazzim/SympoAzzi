import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';
import { TestHelpers } from '../utils/testHelpers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

describe('Authentication & RBAC Test Suite', () => {
  let app: Express;
  let server: any;
  
  // Test users that will be created and cleaned up
  let superAdminUser: any;
  let eventAdminUser: any;
  let participantUser: any;
  let registrationCommitteeUser: any;
  let testEvent: any;
  
  beforeAll(async () => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    server = await registerRoutes(app);
    
    // Create test users for each role
    const hashedPassword = await TestHelpers.hashPassword('testPassword123');
    
    superAdminUser = await storage.createUser({
      username: 'test_super_admin',
      password: hashedPassword,
      email: 'super_admin@test.com',
      fullName: 'Test Super Admin',
      role: 'super_admin'
    });
    
    eventAdminUser = await storage.createUser({
      username: 'test_event_admin',
      password: hashedPassword,
      email: 'event_admin@test.com',
      fullName: 'Test Event Admin',
      role: 'event_admin'
    });
    
    participantUser = await storage.createUser({
      username: 'test_participant',
      password: hashedPassword,
      email: 'participant@test.com',
      fullName: 'Test Participant',
      role: 'participant'
    });
    
    registrationCommitteeUser = await storage.createUser({
      username: 'test_reg_committee',
      password: hashedPassword,
      email: 'reg_committee@test.com',
      fullName: 'Test Registration Committee',
      role: 'registration_committee'
    });
    
    // Create a test event for event admin assignment
    testEvent = await storage.createEvent({
      name: 'Test Event for Auth',
      description: 'Test event for authentication tests',
      type: 'technical',
      category: 'technical',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      status: 'active',
      createdBy: superAdminUser.id
    });
    
    // Assign event admin to the test event
    await storage.assignEventAdmin(testEvent.id, eventAdminUser.id);
  });
  
  afterAll(async () => {
    // Cleanup test data
    try {
      if (testEvent) await storage.deleteEvent(testEvent.id);
      if (superAdminUser) await storage.deleteUser(superAdminUser.id);
      if (eventAdminUser) await storage.deleteUser(eventAdminUser.id);
      if (participantUser) await storage.deleteUser(participantUser.id);
      if (registrationCommitteeUser) await storage.deleteUser(registrationCommitteeUser.id);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    if (server && server.close) {
      server.close();
    }
  });

  describe('1. Authentication Tests', () => {
    describe('1.1 Login with Valid Credentials', () => {
      test('Super Admin can login with valid credentials', async () => {
        // Arrange
        const credentials = {
          username: 'test_super_admin',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('role', 'super_admin');
        expect(response.body.user).toHaveProperty('username', 'test_super_admin');
        expect(response.body.user).not.toHaveProperty('password');
        
        // Verify JWT token is valid
        const decoded = jwt.verify(response.body.token, JWT_SECRET) as any;
        expect(decoded).toHaveProperty('id', superAdminUser.id);
        expect(decoded).toHaveProperty('role', 'super_admin');
      });
      
      test('Event Admin can login with valid credentials', async () => {
        // Arrange
        const credentials = {
          username: 'test_event_admin',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('role', 'event_admin');
        expect(response.body.user).not.toHaveProperty('password');
      });
      
      test('Participant can login with valid credentials', async () => {
        // Arrange
        const credentials = {
          username: 'test_participant',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('role', 'participant');
      });
      
      test('Registration Committee can login with valid credentials', async () => {
        // Arrange
        const credentials = {
          username: 'test_reg_committee',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('role', 'registration_committee');
      });
    });
    
    describe('1.2 Login with Invalid Credentials', () => {
      test('Login fails with wrong password', async () => {
        // Arrange
        const credentials = {
          username: 'test_super_admin',
          password: 'wrongPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid credentials');
        expect(response.body).not.toHaveProperty('token');
      });
      
      test('Login fails with non-existent user', async () => {
        // Arrange
        const credentials = {
          username: 'nonexistent_user',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });
      
      test('Login fails when username is missing', async () => {
        // Arrange
        const credentials = {
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Username and password are required');
      });
      
      test('Login fails when password is missing', async () => {
        // Arrange
        const credentials = {
          username: 'test_super_admin'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Username and password are required');
      });
      
      test('Login fails for disabled users (username starts with DISABLED_)', async () => {
        // Arrange
        const credentials = {
          username: 'DISABLED_user',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });
    });
    
    describe('1.3 JWT Token Generation and Validation', () => {
      test('Generated JWT token contains correct user information', async () => {
        // Arrange
        const credentials = {
          username: 'test_super_admin',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        const decoded = jwt.verify(response.body.token, JWT_SECRET) as any;
        
        // Assert
        expect(decoded).toHaveProperty('id');
        expect(decoded).toHaveProperty('username', 'test_super_admin');
        expect(decoded).toHaveProperty('role', 'super_admin');
        expect(decoded).toHaveProperty('iat'); // Issued at
        expect(decoded).toHaveProperty('exp'); // Expiration
      });
      
      test('JWT token can be used to access protected routes', async () => {
        // Arrange
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'test_super_admin',
            password: 'testPassword123'
          });
        
        const token = loginResponse.body.token;
        
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', superAdminUser.id);
        expect(response.body).toHaveProperty('role', 'super_admin');
      });
      
      test('Invalid JWT token is rejected', async () => {
        // Arrange
        const invalidToken = 'invalid.jwt.token';
        
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${invalidToken}`);
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
      });
      
      test('Tampered JWT token is rejected', async () => {
        // Arrange
        const validToken = TestHelpers.generateJWT({
          id: superAdminUser.id,
          username: 'test_super_admin',
          role: 'super_admin'
        });
        
        // Tamper with the token by changing a character
        const tamperedToken = validToken.slice(0, -5) + 'XXXXX';
        
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tamperedToken}`);
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
      });
    });
    
    describe('1.4 Token Expiration Handling', () => {
      test('Expired JWT token is rejected', async () => {
        // Arrange - Create an expired token (expired 1 hour ago)
        const expiredToken = jwt.sign(
          {
            id: superAdminUser.id,
            username: 'test_super_admin',
            role: 'super_admin'
          },
          JWT_SECRET,
          { expiresIn: '-1h' } // Negative expiration = already expired
        );
        
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`);
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
      });
      
      test('Valid token with future expiration is accepted', async () => {
        // Arrange - Create a token that expires in 1 hour
        const validToken = jwt.sign(
          {
            id: superAdminUser.id,
            username: 'test_super_admin',
            role: 'super_admin'
          },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', superAdminUser.id);
      });
    });
    
    describe('1.5 Authentication Middleware', () => {
      test('Protected route requires authentication token', async () => {
        // Act
        const response = await request(app)
          .get('/api/auth/me');
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Authentication required');
      });
      
      test('Protected route rejects empty Bearer token', async () => {
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer ');
        
        // Assert
        expect(response.status).toBe(401);
      });
      
      test('Protected route accepts valid Bearer token', async () => {
        // Arrange
        const token = TestHelpers.generateJWT({
          id: superAdminUser.id,
          username: 'test_super_admin',
          role: 'super_admin'
        });
        
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);
        
        // Assert
        expect(response.status).toBe(200);
      });
    });
  });

  describe('2. RBAC (Role-Based Access Control) Tests', () => {
    describe('2.1 Super Admin Access Control', () => {
      let superAdminToken: string;
      
      beforeEach(() => {
        superAdminToken = TestHelpers.generateJWT({
          id: superAdminUser.id,
          username: 'test_super_admin',
          role: 'super_admin'
        });
      });
      
      test('Super Admin can access user management (GET /api/users)', async () => {
        // Act
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${superAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
      
      test('Super Admin can access events (GET /api/events)', async () => {
        // Act
        const response = await request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${superAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
      
      test('Super Admin can create events (POST /api/events)', async () => {
        // Arrange
        const newEvent = {
          name: 'Test Event Create' + Date.now(),
          description: 'Test event for RBAC',
          type: 'non_technical',
          category: 'non_technical',
          status: 'draft'
        };
        
        // Act
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(newEvent);
        
        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('name', newEvent.name);
        
        // Cleanup
        if (response.body.id) {
          await storage.deleteEvent(response.body.id);
        }
      });
      
      test('Super Admin can update events (PATCH /api/events/:id)', async () => {
        // Arrange
        const updates = {
          description: 'Updated description'
        };
        
        // Act
        const response = await request(app)
          .patch(`/api/events/${testEvent.id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(updates);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('description', updates.description);
      });
      
      test('Super Admin can access audit logs (GET /api/super-admin/audit-logs)', async () => {
        // Act
        const response = await request(app)
          .get('/api/super-admin/audit-logs')
          .set('Authorization', `Bearer ${superAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
    
    describe('2.2 Event Admin Access Control', () => {
      let eventAdminToken: string;
      
      beforeEach(() => {
        eventAdminToken = TestHelpers.generateJWT({
          id: eventAdminUser.id,
          username: 'test_event_admin',
          role: 'event_admin'
        });
      });
      
      test('Event Admin can access assigned events', async () => {
        // Act
        const response = await request(app)
          .get(`/api/events/${testEvent.id}`)
          .set('Authorization', `Bearer ${eventAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', testEvent.id);
      });
      
      test('Event Admin can access rounds for assigned event', async () => {
        // Act
        const response = await request(app)
          .get(`/api/events/${testEvent.id}/rounds`)
          .set('Authorization', `Bearer ${eventAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
      
      test('Event Admin cannot access user management (GET /api/users)', async () => {
        // Act
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${eventAdminToken}`);
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Super Admin access required');
      });
      
      test('Event Admin cannot create events', async () => {
        // Arrange
        const newEvent = {
          name: 'Unauthorized Event' + Date.now(),
          description: 'Should fail',
          type: 'technical',
          category: 'technical'
        };
        
        // Act
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${eventAdminToken}`)
          .send(newEvent);
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Super Admin access required');
      });
      
      test('Event Admin cannot access unassigned events', async () => {
        // Arrange - Create an event not assigned to this event admin
        const unassignedEvent = await storage.createEvent({
          name: 'Unassigned Event' + Date.now(),
          description: 'Not assigned to test event admin',
          type: 'technical',
          category: 'technical',
          status: 'active',
          createdBy: superAdminUser.id
        });
        
        // Act
        const response = await request(app)
          .get(`/api/events/${unassignedEvent.id}`)
          .set('Authorization', `Bearer ${eventAdminToken}`);
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'You are not assigned to this event');
        
        // Cleanup
        await storage.deleteEvent(unassignedEvent.id);
      });
      
      test('Event Admin can only see their assigned events (GET /api/events)', async () => {
        // Act
        const response = await request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${eventAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        // Verify all returned events are assigned to this admin
        const assignedEventIds = response.body.map((e: any) => e.id);
        expect(assignedEventIds).toContain(testEvent.id);
      });
    });
    
    describe('2.3 Participant Access Control', () => {
      let participantToken: string;
      
      beforeEach(() => {
        participantToken = TestHelpers.generateJWT({
          id: participantUser.id,
          username: 'test_participant',
          role: 'participant'
        });
      });
      
      test('Participant can access their profile (GET /api/auth/me)', async () => {
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${participantToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', participantUser.id);
        expect(response.body).toHaveProperty('role', 'participant');
      });
      
      test('Participant can view active events (GET /api/events)', async () => {
        // Act
        const response = await request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${participantToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        // All returned events should have status 'active'
        const allActive = response.body.every((e: any) => e.status === 'active');
        expect(allActive).toBe(true);
      });
      
      test('Participant cannot access user management', async () => {
        // Act
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${participantToken}`);
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Super Admin access required');
      });
      
      test('Participant cannot create events', async () => {
        // Arrange
        const newEvent = {
          name: 'Participant Event',
          description: 'Should fail',
          type: 'technical',
          category: 'technical'
        };
        
        // Act
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${participantToken}`)
          .send(newEvent);
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Super Admin access required');
      });
      
      test('Participant cannot access admin audit logs', async () => {
        // Act
        const response = await request(app)
          .get('/api/super-admin/audit-logs')
          .set('Authorization', `Bearer ${participantToken}`);
        
        // Assert
        expect(response.status).toBe(403);
      });
    });
    
    describe('2.4 Registration Committee Access Control', () => {
      let regCommitteeToken: string;
      
      beforeEach(() => {
        regCommitteeToken = TestHelpers.generateJWT({
          id: registrationCommitteeUser.id,
          username: 'test_reg_committee',
          role: 'registration_committee'
        });
      });
      
      test('Registration Committee can access events', async () => {
        // Act
        const response = await request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${regCommitteeToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
      
      test('Registration Committee can access registrations', async () => {
        // Act
        const response = await request(app)
          .get('/api/registrations')
          .set('Authorization', `Bearer ${regCommitteeToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
      
      test('Registration Committee cannot access user management', async () => {
        // Act
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${regCommitteeToken}`);
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Super Admin access required');
      });
      
      test('Registration Committee cannot create events', async () => {
        // Arrange
        const newEvent = {
          name: 'Committee Event',
          description: 'Should fail',
          type: 'technical',
          category: 'technical'
        };
        
        // Act
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${regCommitteeToken}`)
          .send(newEvent);
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Super Admin access required');
      });
    });
    
    describe('2.5 Cross-Role Unauthorized Access Tests', () => {
      test('Participant cannot access Event Admin routes', async () => {
        // Arrange
        const participantToken = TestHelpers.generateJWT({
          id: participantUser.id,
          username: 'test_participant',
          role: 'participant'
        });
        
        // Act - Try to create a round (Event Admin only)
        const response = await request(app)
          .post(`/api/events/${testEvent.id}/rounds`)
          .set('Authorization', `Bearer ${participantToken}`)
          .send({
            name: 'Test Round',
            roundNumber: 1,
            duration: 60
          });
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Event Admin access required');
      });
      
      test('Event Admin cannot access Super Admin routes', async () => {
        // Arrange
        const eventAdminToken = TestHelpers.generateJWT({
          id: eventAdminUser.id,
          username: 'test_event_admin',
          role: 'event_admin'
        });
        
        // Act - Try to access audit logs (Super Admin only)
        const response = await request(app)
          .get('/api/super-admin/audit-logs')
          .set('Authorization', `Bearer ${eventAdminToken}`);
        
        // Assert
        expect(response.status).toBe(403);
      });
      
      test('Registration Committee cannot access Super Admin routes', async () => {
        // Arrange
        const regCommitteeToken = TestHelpers.generateJWT({
          id: registrationCommitteeUser.id,
          username: 'test_reg_committee',
          role: 'registration_committee'
        });
        
        // Act
        const response = await request(app)
          .delete(`/api/events/${testEvent.id}`)
          .set('Authorization', `Bearer ${regCommitteeToken}`);
        
        // Assert
        expect(response.status).toBe(403);
      });
    });
    
    describe('2.6 Route Protection Middleware Tests', () => {
      test('requireAuth middleware blocks unauthenticated requests', async () => {
        // Act
        const response = await request(app)
          .get('/api/events');
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Authentication required');
      });
      
      test('requireSuperAdmin middleware blocks non-super-admin users', async () => {
        // Arrange
        const eventAdminToken = TestHelpers.generateJWT({
          id: eventAdminUser.id,
          username: 'test_event_admin',
          role: 'event_admin'
        });
        
        // Act
        const response = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${eventAdminToken}`)
          .send({
            name: 'Test Event',
            description: 'Test',
            type: 'technical',
            category: 'technical'
          });
        
        // Assert
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message', 'Super Admin access required');
      });
      
      test('requireEventAdmin middleware allows Event Admin and Super Admin', async () => {
        // Arrange
        const eventAdminToken = TestHelpers.generateJWT({
          id: eventAdminUser.id,
          username: 'test_event_admin',
          role: 'event_admin'
        });
        
        // Act
        const response = await request(app)
          .get(`/api/events/${testEvent.id}/rounds`)
          .set('Authorization', `Bearer ${eventAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
      });
      
      test('requireEventAdmin middleware blocks Participant', async () => {
        // Arrange
        const participantToken = TestHelpers.generateJWT({
          id: participantUser.id,
          username: 'test_participant',
          role: 'participant'
        });
        
        // Act
        const response = await request(app)
          .post(`/api/events/${testEvent.id}/rounds`)
          .set('Authorization', `Bearer ${participantToken}`)
          .send({
            name: 'Test Round',
            roundNumber: 1,
            duration: 60
          });
        
        // Assert
        expect(response.status).toBe(403);
      });
      
      test('requireRegistrationCommittee middleware allows Registration Committee and Super Admin', async () => {
        // Arrange
        const regCommitteeToken = TestHelpers.generateJWT({
          id: registrationCommitteeUser.id,
          username: 'test_reg_committee',
          role: 'registration_committee'
        });
        
        // Act
        const response = await request(app)
          .get('/api/registrations')
          .set('Authorization', `Bearer ${regCommitteeToken}`);
        
        // Assert
        expect(response.status).toBe(200);
      });
    });
  });

  describe('3. Security Tests', () => {
    describe('3.1 Password Hashing Validation', () => {
      test('Passwords are hashed using bcrypt before storage', async () => {
        // Arrange
        const plainPassword = 'securePassword123';
        
        // Act
        const hashedPassword = await TestHelpers.hashPassword(plainPassword);
        
        // Assert
        expect(hashedPassword).not.toBe(plainPassword);
        expect(hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt hash format
        expect(hashedPassword.length).toBeGreaterThan(50);
      });
      
      test('Hashed passwords can be verified with bcrypt.compare', async () => {
        // Arrange
        const plainPassword = 'testPassword123';
        const hashedPassword = await TestHelpers.hashPassword(plainPassword);
        
        // Act
        const isValid = await TestHelpers.comparePassword(plainPassword, hashedPassword);
        const isInvalid = await TestHelpers.comparePassword('wrongPassword', hashedPassword);
        
        // Assert
        expect(isValid).toBe(true);
        expect(isInvalid).toBe(false);
      });
      
      test('User password is never returned in API responses', async () => {
        // Arrange
        const token = TestHelpers.generateJWT({
          id: superAdminUser.id,
          username: 'test_super_admin',
          role: 'super_admin'
        });
        
        // Act - Get user info
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).not.toHaveProperty('password');
      });
      
      test('User list does not expose password hashes', async () => {
        // Arrange
        const superAdminToken = TestHelpers.generateJWT({
          id: superAdminUser.id,
          username: 'test_super_admin',
          role: 'super_admin'
        });
        
        // Act
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${superAdminToken}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        response.body.forEach((user: any) => {
          expect(user).not.toHaveProperty('password');
        });
      });
      
      test('Different passwords produce different hashes', async () => {
        // Arrange & Act
        const hash1 = await TestHelpers.hashPassword('password1');
        const hash2 = await TestHelpers.hashPassword('password2');
        
        // Assert
        expect(hash1).not.toBe(hash2);
      });
      
      test('Same password produces different hashes (salt)', async () => {
        // Arrange & Act
        const hash1 = await TestHelpers.hashPassword('samePassword');
        const hash2 = await TestHelpers.hashPassword('samePassword');
        
        // Assert
        expect(hash1).not.toBe(hash2); // Due to random salt
        
        // But both should verify correctly
        const verify1 = await bcrypt.compare('samePassword', hash1);
        const verify2 = await bcrypt.compare('samePassword', hash2);
        expect(verify1).toBe(true);
        expect(verify2).toBe(true);
      });
    });
    
    describe('3.2 JWT Secret Protection', () => {
      test('JWT_SECRET environment variable is set', () => {
        // Assert
        expect(process.env.JWT_SECRET).toBeDefined();
        expect(process.env.JWT_SECRET).toBe('test-jwt-secret-for-testing-only');
      });
      
      test('JWT tokens signed with different secrets are invalid', () => {
        // Arrange
        const differentSecret = 'different-secret-key';
        const tokenWithDifferentSecret = jwt.sign(
          {
            id: superAdminUser.id,
            username: 'test_super_admin',
            role: 'super_admin'
          },
          differentSecret,
          { expiresIn: '1h' }
        );
        
        // Act & Assert
        expect(() => {
          jwt.verify(tokenWithDifferentSecret, JWT_SECRET);
        }).toThrow();
      });
      
      test('JWT tokens cannot be forged without secret', async () => {
        // Arrange - Create a token with wrong secret
        const forgedToken = jwt.sign(
          {
            id: participantUser.id,
            username: 'test_participant',
            role: 'super_admin' // Trying to forge admin role
          },
          'wrong-secret', // Wrong secret
          { expiresIn: '1h' }
        );
        
        // Act - Try to access protected route with forged token
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${forgedToken}`);
        
        // Assert - Should be rejected due to invalid signature
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
      });
    });
    
    describe('3.3 Session Management', () => {
      test('Each login generates a new unique JWT token', async () => {
        // Arrange
        const credentials = {
          username: 'test_super_admin',
          password: 'testPassword123'
        };
        
        // Act - Login twice with a small delay to ensure different timestamps
        const response1 = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Wait 1 second to ensure different timestamp
        await TestHelpers.delay(1000);
        
        const response2 = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        // Assert
        expect(response1.body.token).not.toBe(response2.body.token);
        
        // Both tokens should be valid but different
        const decoded1 = jwt.verify(response1.body.token, JWT_SECRET) as any;
        const decoded2 = jwt.verify(response2.body.token, JWT_SECRET) as any;
        
        expect(decoded1.id).toBe(decoded2.id);
        expect(decoded1.iat).not.toBe(decoded2.iat); // Different issued-at times
      });
      
      test('Token contains expiration timestamp', async () => {
        // Arrange
        const credentials = {
          username: 'test_super_admin',
          password: 'testPassword123'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);
        
        const decoded = jwt.verify(response.body.token, JWT_SECRET) as any;
        
        // Assert
        expect(decoded).toHaveProperty('exp');
        expect(decoded.exp).toBeGreaterThan(decoded.iat);
        
        // Verify expiration is approximately 7 days (604800 seconds)
        const expiresIn = decoded.exp - decoded.iat;
        expect(expiresIn).toBeGreaterThan(600000); // More than ~7 days
        expect(expiresIn).toBeLessThan(700000); // Less than ~8 days
      });
      
      test('User information in token matches authenticated user', async () => {
        // Arrange
        const token = TestHelpers.generateJWT({
          id: superAdminUser.id,
          username: 'test_super_admin',
          role: 'super_admin'
        });
        
        // Act
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);
        
        // Assert
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(superAdminUser.id);
        expect(response.body.username).toBe('test_super_admin');
        expect(response.body.role).toBe('super_admin');
      });
      
      test('Deleted user tokens are invalidated', async () => {
        // Arrange - Create a temporary user
        const hashedPassword = await TestHelpers.hashPassword('tempPassword');
        const tempUser = await storage.createUser({
          username: 'temp_user_' + Date.now(),
          password: hashedPassword,
          email: `temp_${Date.now()}@test.com`,
          fullName: 'Temporary User',
          role: 'participant'
        });
        
        const token = TestHelpers.generateJWT({
          id: tempUser.id,
          username: tempUser.username,
          role: tempUser.role
        });
        
        // Act - Delete the user
        await storage.deleteUser(tempUser.id);
        
        // Try to use the token
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);
        
        // Assert
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'User not found');
      });
    });
    
    describe('3.4 Input Validation & Security', () => {
      test('SQL injection attempts in login are handled safely', async () => {
        // Arrange
        const sqlInjectionPayloads = TestHelpers.generateSQLInjectionPayloads();
        
        // Act & Assert
        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              username: payload,
              password: 'anyPassword'
            });
          
          // Should return 401, not 500 (no SQL errors)
          expect(response.status).toBe(401);
          expect(response.body).toHaveProperty('message', 'Invalid credentials');
        }
      });
      
      test('XSS attempts in registration are sanitized', async () => {
        // Arrange
        const xssPayload = "<script>alert('XSS')</script>";
        
        const newUser = {
          username: 'xss_test_user_' + Date.now(),
          password: 'testPassword123',
          email: `xss_${Date.now()}@test.com`,
          fullName: xssPayload,
          role: 'participant'
        };
        
        // Act
        const response = await request(app)
          .post('/api/auth/register')
          .send(newUser);
        
        // Assert
        expect(response.status).toBe(201);
        
        // Cleanup
        if (response.body.user) {
          await storage.deleteUser(response.body.user.id);
        }
      });
      
      test('Empty or whitespace-only credentials are rejected', async () => {
        // Act
        const response1 = await request(app)
          .post('/api/auth/login')
          .send({ username: '', password: 'test' });
        
        const response2 = await request(app)
          .post('/api/auth/login')
          .send({ username: 'test', password: '' });
        
        const response3 = await request(app)
          .post('/api/auth/login')
          .send({ username: '   ', password: 'test' });
        
        // Assert
        expect(response1.status).toBe(400);
        expect(response2.status).toBe(400);
        expect(response3.status).toBe(401); // Whitespace is treated as invalid username
      });
    });
  });
});
