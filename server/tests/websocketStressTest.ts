import { io as ioClient, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "symposium-secret-key-change-in-production";
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

interface TestUser {
  id: string;
  username: string;
  role: 'super_admin' | 'event_admin' | 'participant' | 'registration_committee';
  eventId?: string;
}

interface TestClient {
  user: TestUser;
  socket: Socket;
  receivedMessages: Map<string, any[]>;
  connectionTime?: number;
  errors: string[];
}

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  metrics?: any;
}

class WebSocketStressTest {
  private clients: TestClient[] = [];
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  generateJWT(user: TestUser): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        eventId: user.eventId,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  async createClient(user: TestUser): Promise<TestClient> {
    return new Promise((resolve, reject) => {
      const token = this.generateJWT(user);
      const connectStart = Date.now();
      
      const socket = ioClient(SERVER_URL, {
        auth: { token },
        reconnection: false,
        timeout: 5000,
      });

      const client: TestClient = {
        user,
        socket,
        receivedMessages: new Map(),
        errors: [],
      };

      socket.on('connect', () => {
        client.connectionTime = Date.now() - connectStart;
        console.log(`✓ Client connected: ${user.username} (${user.role}) in ${client.connectionTime}ms`);
        resolve(client);
      });

      socket.on('connect_error', (error) => {
        console.error(`✗ Connection error for ${user.username}:`, error.message);
        client.errors.push(`Connection error: ${error.message}`);
        reject(error);
      });

      socket.on('registrationUpdate', (data) => {
        if (!client.receivedMessages.has('registrationUpdate')) {
          client.receivedMessages.set('registrationUpdate', []);
        }
        client.receivedMessages.get('registrationUpdate')!.push({
          timestamp: Date.now(),
          data,
        });
      });

      socket.on('roundStatus', (data) => {
        if (!client.receivedMessages.has('roundStatus')) {
          client.receivedMessages.set('roundStatus', []);
        }
        client.receivedMessages.get('roundStatus')!.push({
          timestamp: Date.now(),
          data,
        });
      });

      socket.on('overrideAction', (data) => {
        if (!client.receivedMessages.has('overrideAction')) {
          client.receivedMessages.set('overrideAction', []);
        }
        client.receivedMessages.get('overrideAction')!.push({
          timestamp: Date.now(),
          data,
        });
      });

      socket.on('resultPublished', (data) => {
        if (!client.receivedMessages.has('resultPublished')) {
          client.receivedMessages.set('resultPublished', []);
        }
        client.receivedMessages.get('resultPublished')!.push({
          timestamp: Date.now(),
          data,
        });
      });

      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${user.username} - Reason: ${reason}`);
      });

      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  async testAuthenticationLifecycle(): Promise<TestResult> {
    console.log('\n=== Testing Authentication Lifecycle ===\n');
    
    try {
      const testUser: TestUser = {
        id: 'test-auth-user-1',
        username: 'auth_test_user',
        role: 'participant',
      };

      console.log('1. Testing connection...');
      const client = await this.createClient(testUser);
      
      if (!client.socket.connected) {
        throw new Error('Failed to connect');
      }

      console.log('2. Testing disconnect...');
      await new Promise<void>((resolve) => {
        client.socket.on('disconnect', () => {
          console.log('✓ Disconnected successfully');
          resolve();
        });
        client.socket.disconnect();
      });

      console.log('3. Testing reconnect...');
      const reconnectClient = await this.createClient(testUser);
      
      if (!reconnectClient.socket.connected) {
        throw new Error('Failed to reconnect');
      }

      reconnectClient.socket.disconnect();
      
      return {
        testName: 'Authentication Lifecycle',
        passed: true,
        details: 'Successfully tested connect, disconnect, and reconnect',
      };
    } catch (error: any) {
      return {
        testName: 'Authentication Lifecycle',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  }

  async testRBACFiltering(): Promise<TestResult[]> {
    console.log('\n=== Testing RBAC Filtering ===\n');
    const results: TestResult[] = [];

    try {
      const event1Id = 'test-event-1';
      const event2Id = 'test-event-2';
      const round1Id = 'test-round-1';

      const superAdmin = await this.createClient({
        id: 'test-super-admin-1',
        username: 'super_admin_test',
        role: 'super_admin',
      });

      const eventAdmin1 = await this.createClient({
        id: 'test-event-admin-1',
        username: 'event_admin_1',
        role: 'event_admin',
        eventId: event1Id,
      });

      const eventAdmin2 = await this.createClient({
        id: 'test-event-admin-2',
        username: 'event_admin_2',
        role: 'event_admin',
        eventId: event2Id,
      });

      const participant1 = await this.createClient({
        id: 'test-participant-1',
        username: 'participant_1',
        role: 'participant',
        eventId: event1Id,
      });

      const participant2 = await this.createClient({
        id: 'test-participant-2',
        username: 'participant_2',
        role: 'participant',
        eventId: event2Id,
      });

      const regCommittee = await this.createClient({
        id: 'test-reg-committee-1',
        username: 'reg_committee_1',
        role: 'registration_committee',
      });

      this.clients.push(superAdmin, eventAdmin1, eventAdmin2, participant1, participant2, regCommittee);

      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('\n1. Testing registrationUpdate (should reach Event Admins, Super Admin, Reg Committee)...');
      superAdmin.socket.emit('testEvent', {
        type: 'registrationUpdate',
        eventId: event1Id,
        registration: { name: 'Test Registration' },
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const registrationUpdateTest: TestResult = {
        testName: 'RBAC - registrationUpdate',
        passed: true,
        details: '',
      };

      const shouldReceiveReg = [superAdmin, eventAdmin1, regCommittee];
      const shouldNotReceiveReg = [eventAdmin2, participant1, participant2];

      const receivedReg = shouldReceiveReg.filter(c => c.receivedMessages.has('registrationUpdate') && c.receivedMessages.get('registrationUpdate')!.length > 0);
      const notReceivedReg = shouldNotReceiveReg.filter(c => c.receivedMessages.has('registrationUpdate') && c.receivedMessages.get('registrationUpdate')!.length > 0);

      if (receivedReg.length < shouldReceiveReg.length) {
        registrationUpdateTest.passed = false;
        registrationUpdateTest.details += `Expected ${shouldReceiveReg.length} to receive, got ${receivedReg.length}. `;
      }

      if (notReceivedReg.length > 0) {
        registrationUpdateTest.passed = false;
        registrationUpdateTest.details += `${notReceivedReg.length} unauthorized clients received message. `;
      }

      if (registrationUpdateTest.passed) {
        registrationUpdateTest.details = `✓ Correctly filtered: ${receivedReg.length} authorized, 0 unauthorized`;
        console.log('✓ registrationUpdate RBAC passed');
      } else {
        console.log('✗ registrationUpdate RBAC failed:', registrationUpdateTest.details);
      }

      results.push(registrationUpdateTest);

      console.log('\n2. Testing roundStatus (should reach Participants of event and Admins)...');
      
      this.clients.forEach(c => c.receivedMessages.clear());
      
      superAdmin.socket.emit('testEvent', {
        type: 'roundStatus',
        eventId: event1Id,
        roundId: round1Id,
        status: 'in_progress',
        round: { name: 'Round 1' },
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const roundStatusTest: TestResult = {
        testName: 'RBAC - roundStatus',
        passed: true,
        details: '',
      };

      const shouldReceiveRound = [superAdmin, eventAdmin1, participant1];
      const shouldNotReceiveRound = [eventAdmin2, participant2, regCommittee];

      const receivedRound = shouldReceiveRound.filter(c => c.receivedMessages.has('roundStatus') && c.receivedMessages.get('roundStatus')!.length > 0);
      const notReceivedRound = shouldNotReceiveRound.filter(c => c.receivedMessages.has('roundStatus') && c.receivedMessages.get('roundStatus')!.length > 0);

      if (receivedRound.length < shouldReceiveRound.length) {
        roundStatusTest.passed = false;
        roundStatusTest.details += `Expected ${shouldReceiveRound.length} to receive, got ${receivedRound.length}. `;
      }

      if (notReceivedRound.length > 0) {
        roundStatusTest.passed = false;
        roundStatusTest.details += `${notReceivedRound.length} unauthorized clients received message. `;
      }

      if (roundStatusTest.passed) {
        roundStatusTest.details = `✓ Correctly filtered: ${receivedRound.length} authorized, 0 unauthorized`;
        console.log('✓ roundStatus RBAC passed');
      } else {
        console.log('✗ roundStatus RBAC failed:', roundStatusTest.details);
      }

      results.push(roundStatusTest);

      console.log('\n3. Testing overrideAction (should reach Super Admin only)...');
      
      this.clients.forEach(c => c.receivedMessages.clear());
      
      superAdmin.socket.emit('testEvent', {
        type: 'overrideAction',
        action: 'force_complete',
        targetType: 'event',
        targetId: event1Id,
        changes: { status: 'completed' },
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const overrideActionTest: TestResult = {
        testName: 'RBAC - overrideAction',
        passed: true,
        details: '',
      };

      const shouldReceiveOverride = [superAdmin];
      const shouldNotReceiveOverride = [eventAdmin1, eventAdmin2, participant1, participant2, regCommittee];

      const receivedOverride = shouldReceiveOverride.filter(c => c.receivedMessages.has('overrideAction') && c.receivedMessages.get('overrideAction')!.length > 0);
      const notReceivedOverride = shouldNotReceiveOverride.filter(c => c.receivedMessages.has('overrideAction') && c.receivedMessages.get('overrideAction')!.length > 0);

      if (receivedOverride.length < shouldReceiveOverride.length) {
        overrideActionTest.passed = false;
        overrideActionTest.details += `Expected ${shouldReceiveOverride.length} to receive, got ${receivedOverride.length}. `;
      }

      if (notReceivedOverride.length > 0) {
        overrideActionTest.passed = false;
        overrideActionTest.details += `${notReceivedOverride.length} unauthorized clients received message. `;
      }

      if (overrideActionTest.passed) {
        overrideActionTest.details = `✓ Correctly filtered: Only Super Admin received`;
        console.log('✓ overrideAction RBAC passed');
      } else {
        console.log('✗ overrideAction RBAC failed:', overrideActionTest.details);
      }

      results.push(overrideActionTest);

      console.log('\n4. Testing resultPublished (should reach specific Participant only)...');
      
      this.clients.forEach(c => c.receivedMessages.clear());
      
      superAdmin.socket.emit('testEvent', {
        type: 'resultPublished',
        participantId: participant1.user.id,
        eventId: event1Id,
        result: { score: 95 },
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const resultPublishedTest: TestResult = {
        testName: 'RBAC - resultPublished',
        passed: true,
        details: '',
      };

      const shouldReceiveResult = [participant1];
      const shouldNotReceiveResult = [superAdmin, eventAdmin1, eventAdmin2, participant2, regCommittee];

      const receivedResult = shouldReceiveResult.filter(c => c.receivedMessages.has('resultPublished') && c.receivedMessages.get('resultPublished')!.length > 0);
      const notReceivedResult = shouldNotReceiveResult.filter(c => c.receivedMessages.has('resultPublished') && c.receivedMessages.get('resultPublished')!.length > 0);

      if (receivedResult.length < shouldReceiveResult.length) {
        resultPublishedTest.passed = false;
        resultPublishedTest.details += `Expected ${shouldReceiveResult.length} to receive, got ${receivedResult.length}. `;
      }

      if (notReceivedResult.length > 0) {
        resultPublishedTest.passed = false;
        resultPublishedTest.details += `${notReceivedResult.length} unauthorized clients received message. `;
      }

      if (resultPublishedTest.passed) {
        resultPublishedTest.details = `✓ Correctly filtered: Only target participant received`;
        console.log('✓ resultPublished RBAC passed');
      } else {
        console.log('✗ resultPublished RBAC failed:', resultPublishedTest.details);
      }

      results.push(resultPublishedTest);

      this.clients.forEach(c => c.socket.disconnect());
      this.clients = [];

      return results;
    } catch (error: any) {
      return [{
        testName: 'RBAC Filtering',
        passed: false,
        details: `Failed: ${error.message}`,
      }];
    }
  }

  async testStressWithConcurrency(): Promise<TestResult> {
    console.log('\n=== Testing Stress with 200+ Concurrent Participants ===\n');
    
    try {
      const numClients = 200;
      const event1Id = 'stress-test-event-1';
      const event2Id = 'stress-test-event-2';
      
      console.log(`Creating ${numClients} concurrent connections...`);
      const connectionStart = Date.now();
      
      const clientPromises: Promise<TestClient>[] = [];
      
      for (let i = 0; i < numClients; i++) {
        const eventId = i % 2 === 0 ? event1Id : event2Id;
        const user: TestUser = {
          id: `stress-participant-${i}`,
          username: `participant_${i}`,
          role: 'participant',
          eventId,
        };
        clientPromises.push(this.createClient(user));
      }

      const connectedClients = await Promise.allSettled(clientPromises);
      const successfulConnections = connectedClients.filter(r => r.status === 'fulfilled').length;
      const failedConnections = connectedClients.filter(r => r.status === 'rejected').length;
      
      const connectionDuration = Date.now() - connectionStart;
      
      console.log(`\nConnection Results:`);
      console.log(`✓ Successful: ${successfulConnections}/${numClients}`);
      console.log(`✗ Failed: ${failedConnections}/${numClients}`);
      console.log(`⏱ Total time: ${connectionDuration}ms`);
      console.log(`⏱ Average per client: ${(connectionDuration / successfulConnections).toFixed(2)}ms`);

      const clients = connectedClients
        .filter((r): r is PromiseFulfilledResult<TestClient> => r.status === 'fulfilled')
        .map(r => r.value);
      
      this.clients.push(...clients);

      const connectionTimes = clients
        .map(c => c.connectionTime!)
        .filter(t => t !== undefined);
      
      const avgLatency = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const maxLatency = Math.max(...connectionTimes);
      const minLatency = Math.min(...connectionTimes);

      console.log(`\nLatency Metrics:`);
      console.log(`⏱ Average: ${avgLatency.toFixed(2)}ms`);
      console.log(`⏱ Min: ${minLatency}ms`);
      console.log(`⏱ Max: ${maxLatency}ms`);

      console.log('\nBroadcasting test message to all participants...');
      const broadcastStart = Date.now();
      
      if (clients.length > 0) {
        clients[0].socket.emit('testEvent', {
          type: 'roundStatus',
          eventId: event1Id,
          roundId: 'stress-round-1',
          status: 'in_progress',
          round: { name: 'Stress Test Round' },
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const broadcastDuration = Date.now() - broadcastStart;
      const receivedCount = clients.filter(c => 
        c.receivedMessages.has('roundStatus') && 
        c.receivedMessages.get('roundStatus')!.length > 0
      ).length;

      console.log(`\nBroadcast Results:`);
      console.log(`✓ Messages received: ${receivedCount}`);
      console.log(`⏱ Broadcast latency: ${broadcastDuration}ms`);

      const duplicateCount = clients.filter(c => {
        const messages = c.receivedMessages.get('roundStatus');
        return messages && messages.length > 1;
      }).length;

      console.log(`\nDuplicate/Zombie Check:`);
      console.log(`✓ Clients with duplicates: ${duplicateCount}`);

      clients.forEach(c => c.socket.disconnect());
      this.clients = [];

      const passed = 
        successfulConnections >= numClients * 0.95 &&
        avgLatency < 2000 &&
        duplicateCount === 0 &&
        receivedCount >= (numClients / 2) * 0.95;

      return {
        testName: 'Stress Test (200+ Concurrent)',
        passed,
        details: passed 
          ? `✓ All stress tests passed: ${successfulConnections} connections, ${avgLatency.toFixed(2)}ms avg latency, 0 duplicates`
          : `Some issues detected - Check detailed metrics above`,
        metrics: {
          totalClients: numClients,
          successfulConnections,
          failedConnections,
          connectionDuration,
          avgLatency: avgLatency.toFixed(2),
          minLatency,
          maxLatency,
          broadcastLatency: broadcastDuration,
          receivedCount,
          duplicateCount,
        },
      };
    } catch (error: any) {
      return {
        testName: 'Stress Test (200+ Concurrent)',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  }

  printFinalReport() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('          WEBSOCKET STRESS TEST - FINAL REPORT         ');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status} - ${result.testName}`);
      console.log(`   ${result.details}`);
      if (result.metrics) {
        console.log(`   Metrics:`, JSON.stringify(result.metrics, null, 2));
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! 🎉');
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed`);
    }
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n');

    process.exit(failedTests > 0 ? 1 : 0);
  }

  async runAllTests() {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║      WEBSOCKET STRESS TEST AND VALIDATION SUITE       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log(`\nServer: ${SERVER_URL}`);
    console.log(`Start Time: ${new Date().toISOString()}\n`);
    
    this.startTime = Date.now();

    try {
      const authResult = await this.testAuthenticationLifecycle();
      this.testResults.push(authResult);

      const rbacResults = await this.testRBACFiltering();
      this.testResults.push(...rbacResults);

      const stressResult = await this.testStressWithConcurrency();
      this.testResults.push(stressResult);

      const totalDuration = Date.now() - this.startTime;
      console.log(`\n⏱ Total Test Duration: ${(totalDuration / 1000).toFixed(2)}s\n`);

      this.printFinalReport();
    } catch (error: any) {
      console.error('Fatal error during testing:', error);
      process.exit(1);
    }
  }
}

const test = new WebSocketStressTest();
test.runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
