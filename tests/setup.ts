import { beforeAll, afterAll, jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  
  // Mock SMTP for email tests (never use production credentials)
  process.env.SMTP_HOST = 'smtp.ethereal.email';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@ethereal.email';
  process.env.SMTP_PASS = 'test-password';
  process.env.SMTP_FROM = 'Test <test@symposium.local>';
  
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  console.log('🏁 Test suite completed');
});

// Global test timeout
jest.setTimeout(30000);
