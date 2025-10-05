import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'event_admin' | 'participant' | 'registration_committee';
  password?: string;
  eventId?: string;
}

export class TestHelpers {
  static generateJWT(user: Partial<TestUser>): string {
    return jwt.sign(
      {
        id: user.id || 'test-user-id',
        username: user.username || 'testuser',
        email: user.email || 'test@example.com',
        role: user.role || 'participant',
        eventId: user.eventId
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static generateTestUser(role: TestUser['role'], eventId?: string): TestUser {
    const id = `test-${role}-${Date.now()}`;
    return {
      id,
      username: `test_${role}_${Date.now()}`,
      email: `test_${role}_${Date.now()}@test.com`,
      fullName: `Test ${role.replace('_', ' ').toUpperCase()}`,
      role,
      password: 'test123',
      eventId
    };
  }

  static createAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateEventSlug(eventName: string): string {
    return eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
  }

  static generateCredentials(fullName: string, eventName: string, counter: number) {
    const firstName = fullName.split(' ')[0].toLowerCase();
    const shortName = fullName.split(' ').pop()?.toLowerCase() || fullName.substring(0, 5).toLowerCase();
    const cleanEventName = eventName.toLowerCase().replace(/\s+/g, '-');
    const formattedCounter = String(counter).padStart(3, '0');
    
    return {
      username: `${cleanEventName}-${firstName}-${formattedCounter}`,
      password: `${shortName}${formattedCounter}`
    };
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static sanitizeInput(input: string): string {
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
  }

  static generateSQLInjectionPayloads(): string[] {
    return [
      "' OR '1'='1",
      "1' OR '1' = '1",
      "'; DROP TABLE users; --",
      "admin'--",
      "' OR 1=1--",
      "1' UNION SELECT NULL, NULL, NULL--"
    ];
  }

  static generateXSSPayloads(): string[] {
    return [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "<svg onload=alert('XSS')>",
      "javascript:alert('XSS')",
      "<iframe src='javascript:alert(\"XSS\")'></iframe>"
    ];
  }
}

export default TestHelpers;
