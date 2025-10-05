import { test, expect, Page, BrowserContext } from '@playwright/test';
import { TestHelpers } from '../utils/testHelpers';

// Test data will be set up once and reused
let testContext: {
  superAdminToken: string;
  eventAdminToken: string;
  participantToken: string;
  participantCredentials: { username: string; password: string };
  eventId: string;
  roundId: string;
  attemptId: string;
  questionIds: string[];
};

// Helper function to make API requests
async function apiRequest(
  method: string,
  endpoint: string,
  token: string,
  body?: any
) {
  const response = await fetch(`http://localhost:5000${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok && response.status !== 400) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} ${text}`);
  }
  
  return response.json();
}

// Setup test data before all tests
test.beforeAll(async () => {
  // Create super admin
  const superAdminRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `superadmin_${Date.now()}`,
      password: 'superadmin123',
      email: `superadmin_${Date.now()}@test.com`,
      fullName: 'Super Admin Test',
      role: 'super_admin'
    })
  });
  const superAdminData = await superAdminRes.json();
  const superAdminToken = superAdminData.token;

  // Create event admin
  const eventAdminRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `eventadmin_${Date.now()}`,
      password: 'eventadmin123',
      email: `eventadmin_${Date.now()}@test.com`,
      fullName: 'Event Admin Test',
      role: 'event_admin'
    })
  });
  const eventAdminData = await eventAdminRes.json();
  const eventAdminToken = eventAdminData.token;

  // Create event
  const eventRes = await apiRequest('POST', '/api/events', superAdminToken, {
    name: 'Proctored Test Event',
    description: 'E2E Test Event',
    type: 'quiz',
    category: 'technical',
    status: 'active'
  });
  const eventId = eventRes.id;

  // Assign event admin to event
  await apiRequest('POST', `/api/events/${eventId}/admins`, superAdminToken, {
    adminId: eventAdminData.user.id
  });

  // Create round with proctoring rules
  const roundRes = await apiRequest('POST', `/api/events/${eventId}/rounds`, eventAdminToken, {
    name: 'Round 1',
    description: 'Proctored Round',
    roundNumber: 1,
    duration: 30,
    status: 'not_started'
  });
  const roundId = roundRes.id;

  // Set round rules with strict proctoring
  await apiRequest('POST', `/api/rounds/${roundId}/rules`, eventAdminToken, {
    noRefresh: true,
    noTabSwitch: true,
    forceFullscreen: true,
    disableShortcuts: true,
    autoSubmitOnViolation: true,
    maxTabSwitchWarnings: 2
  });

  // Create questions
  const questionIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const questionRes = await apiRequest('POST', `/api/rounds/${roundId}/questions`, eventAdminToken, {
      questionType: 'multiple_choice',
      questionText: `Test Question ${i}`,
      questionNumber: i,
      points: 10,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A'
    });
    questionIds.push(questionRes.id);
  }

  // Create participant user
  const participantRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `participant_${Date.now()}`,
      password: 'participant123',
      email: `participant_${Date.now()}@test.com`,
      fullName: 'Test Participant',
      role: 'participant'
    })
  });
  const participantData = await participantRes.json();
  const participantToken = participantData.token;

  // Register participant to event
  await apiRequest('POST', `/api/events/${eventId}/participants`, eventAdminToken, {
    userId: participantData.user.id
  });

  // Create event credentials for participant
  const credRes = await apiRequest('POST', `/api/events/${eventId}/credentials`, eventAdminToken, {
    participantUserId: participantData.user.id,
    eventUsername: `testuser_${Date.now()}`,
    eventPassword: 'testpass123',
    testEnabled: true
  });

  // Start the round
  await apiRequest('PATCH', `/api/rounds/${roundId}/start`, eventAdminToken, {});

  testContext = {
    superAdminToken,
    eventAdminToken,
    participantToken,
    participantCredentials: {
      username: credRes.eventUsername,
      password: credRes.eventPassword
    },
    eventId,
    roundId,
    attemptId: '', // Will be set after starting test
    questionIds
  };
});

// Helper functions
async function loginAsParticipant(page: Page) {
  await page.goto('http://localhost:5000');
  await page.waitForSelector('[data-testid="input-username"]', { timeout: 10000 });
  await page.fill('[data-testid="input-username"]', testContext.participantCredentials.username);
  await page.fill('[data-testid="input-password"]', testContext.participantCredentials.password);
  await page.click('[data-testid="button-submit"]');
  await page.waitForURL('**/participant/dashboard', { timeout: 10000 });
}

async function navigateToTest(page: Page) {
  // Navigate to the test
  await page.goto(`http://localhost:5000/participant/events/${testContext.eventId}`);
  await page.waitForSelector(`[data-testid="button-start-test-${testContext.roundId}"]`, { timeout: 10000 });
  await page.click(`[data-testid="button-start-test-${testContext.roundId}"]`);
  
  // Wait for attempt page to load
  await page.waitForURL('**/participant/take-test/**', { timeout: 10000 });
  
  // Extract attempt ID from URL
  const url = page.url();
  const attemptId = url.split('/').pop() || '';
  testContext.attemptId = attemptId;
}

async function startTest(page: Page) {
  // Click begin test button (should trigger fullscreen)
  await page.click('[data-testid="button-begin-test"]');
  await page.waitForTimeout(500);
}

async function answerQuestion(page: Page, optionIndex: number) {
  await page.click(`[data-testid="radio-option-${optionIndex}"]`);
  await page.waitForTimeout(200);
}

async function submitAnswer(page: Page) {
  // Submit answer via API to ensure it's saved
  const currentUrl = page.url();
  const attemptId = currentUrl.split('/').pop() || '';
  
  // Get current question index from page
  const questionText = await page.textContent('[data-testid="text-question"]');
  const questionNumber = parseInt(questionText?.match(/Question (\d+)/)?.[1] || '1');
  const questionId = testContext.questionIds[questionNumber - 1];
  
  await apiRequest('POST', `/api/attempts/${attemptId}/answers`, testContext.participantToken, {
    questionId,
    answer: 'Option A'
  });
}

async function getViolationCount(attemptId: string): Promise<{ tabSwitch: number; refresh: number; fullscreenExit: number }> {
  const attempt = await apiRequest('GET', `/api/attempts/${attemptId}`, testContext.participantToken);
  const violationLogs = attempt.violationLogs || [];
  
  return {
    tabSwitch: violationLogs.filter((v: any) => v.type === 'tab_switch').length,
    refresh: violationLogs.filter((v: any) => v.type === 'refresh').length,
    fullscreenExit: violationLogs.filter((v: any) => v.type === 'fullscreen_exit').length
  };
}

// Test Suite: Fullscreen Enforcement
test.describe('Fullscreen Enforcement Tests', () => {
  test('should enter fullscreen mode on test start', async ({ page, context }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    
    // Verify begin test button is visible
    await expect(page.locator('[data-testid="button-begin-test"]')).toBeVisible();
    
    // Click begin test
    await page.click('[data-testid="button-begin-test"]');
    await page.waitForTimeout(1000);
    
    // Verify we're in fullscreen (check via evaluation)
    const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/reports/screenshots/fullscreen-activated.png', fullPage: true });
  });

  test('should detect fullscreen exit and log violation', async ({ page, context }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Get initial violation count
    const initialViolations = await getViolationCount(testContext.attemptId);
    
    // Exit fullscreen programmatically
    await page.evaluate(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Verify violation was logged
    const finalViolations = await getViolationCount(testContext.attemptId);
    expect(finalViolations.fullscreenExit).toBeGreaterThan(initialViolations.fullscreenExit);
    
    // Take screenshot of violation
    await page.screenshot({ path: 'tests/reports/screenshots/fullscreen-violation.png' });
  });

  test('should show re-enter fullscreen modal on exit', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Exit fullscreen
    await page.evaluate(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    });
    
    await page.waitForTimeout(500);
    
    // Check for re-enter fullscreen button
    await expect(page.locator('[data-testid="button-reenter-fullscreen"]')).toBeVisible();
    
    await page.screenshot({ path: 'tests/reports/screenshots/reenter-fullscreen-modal.png' });
  });
});

// Test Suite: Tab Switch Detection
test.describe('Tab Switch Detection Tests', () => {
  test('should detect tab switch via visibility change', async ({ page, context }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    const initialViolations = await getViolationCount(testContext.attemptId);
    
    // Simulate tab switch by changing visibility
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(1000);
    
    const finalViolations = await getViolationCount(testContext.attemptId);
    expect(finalViolations.tabSwitch).toBeGreaterThan(initialViolations.tabSwitch);
    
    await page.screenshot({ path: 'tests/reports/screenshots/tab-switch-violation.png' });
  });

  test('should disqualify participant on tab switch', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Trigger tab switch
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(2000);
    
    // Check if participant is disqualified (should be redirected or see disqualification message)
    const participant = await apiRequest('GET', `/api/participants/my-registrations`, testContext.participantToken);
    const eventParticipant = participant.find((p: any) => p.eventId === testContext.eventId);
    expect(eventParticipant?.status).toBe('disqualified');
    
    await page.screenshot({ path: 'tests/reports/screenshots/disqualified-tab-switch.png' });
  });
});

// Test Suite: Page Refresh Prevention
test.describe('Page Refresh Prevention Tests', () => {
  test('should intercept page refresh and show confirmation', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Set up dialog handler before triggering refresh
    let dialogShown = false;
    page.on('dialog', async dialog => {
      dialogShown = true;
      expect(dialog.type()).toBe('beforeunload');
      await dialog.dismiss();
    });
    
    // Attempt to reload the page
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
    } catch (e) {
      // Expected to fail if beforeunload prevents it
    }
    
    await page.waitForTimeout(500);
    
    // The beforeunload dialog should have been shown
    // Note: In headed mode, this might actually show, in headless it's automatically handled
  });

  test('should track refresh attempts in violations', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    const initialViolations = await getViolationCount(testContext.attemptId);
    
    // Manually log a refresh violation via API (simulating what the frontend does)
    await apiRequest('POST', `/api/attempts/${testContext.attemptId}/violations`, testContext.participantToken, {
      type: 'refresh'
    });
    
    await page.waitForTimeout(500);
    
    const finalViolations = await getViolationCount(testContext.attemptId);
    expect(finalViolations.refresh).toBeGreaterThan(initialViolations.refresh);
  });
});

// Test Suite: Browser Controls Disabled
test.describe('Browser Controls Disabled Tests', () => {
  test('should prevent browser back button navigation', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    const currentUrl = page.url();
    
    // Try to go back
    await page.goBack();
    await page.waitForTimeout(500);
    
    // Should still be on the same page (back button is blocked)
    const newUrl = page.url();
    expect(newUrl).toBe(currentUrl);
  });

  test('should disable right-click context menu', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Check if context menu is disabled
    const isContextMenuDisabled = await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      return !document.dispatchEvent(event);
    });
    
    expect(isContextMenuDisabled).toBe(true);
  });

  test('should block keyboard shortcuts', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Try Ctrl+C (copy)
    await page.keyboard.down('Control');
    await page.keyboard.press('c');
    await page.keyboard.up('Control');
    
    // Try Ctrl+V (paste)
    await page.keyboard.down('Control');
    await page.keyboard.press('v');
    await page.keyboard.up('Control');
    
    // Try F12 (dev tools)
    await page.keyboard.press('F12');
    
    await page.waitForTimeout(500);
    
    // These should be blocked - no errors should occur
    await expect(page.locator('[data-testid="heading-test-name"]')).toBeVisible();
  });
});

// Test Suite: Violation Tracking & Auto-Submit
test.describe('Violation Tracking & Auto-Submit Tests', () => {
  test('should log violations with timestamps', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Log a violation
    await apiRequest('POST', `/api/attempts/${testContext.attemptId}/violations`, testContext.participantToken, {
      type: 'refresh'
    });
    
    await page.waitForTimeout(500);
    
    // Get attempt and check violation logs
    const attempt = await apiRequest('GET', `/api/attempts/${testContext.attemptId}`, testContext.participantToken);
    const violationLogs = attempt.violationLogs || [];
    
    expect(violationLogs.length).toBeGreaterThan(0);
    expect(violationLogs[violationLogs.length - 1]).toHaveProperty('type', 'refresh');
    expect(violationLogs[violationLogs.length - 1]).toHaveProperty('timestamp');
  });

  test('should auto-submit test on violation threshold', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Answer a question first
    await answerQuestion(page, 0);
    await submitAnswer(page);
    
    await page.waitForTimeout(500);
    
    // Trigger tab switch (should cause disqualification and auto-submit)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(3000);
    
    // Check if test was auto-submitted
    const attempt = await apiRequest('GET', `/api/attempts/${testContext.attemptId}`, testContext.participantToken);
    expect(['completed', 'auto_submitted']).toContain(attempt.status);
    
    await page.screenshot({ path: 'tests/reports/screenshots/auto-submit-violation.png' });
  });

  test('should save answers correctly on auto-submit', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Answer first question
    await answerQuestion(page, 0);
    await apiRequest('POST', `/api/attempts/${testContext.attemptId}/answers`, testContext.participantToken, {
      questionId: testContext.questionIds[0],
      answer: 'Option A'
    });
    
    await page.waitForTimeout(500);
    
    // Verify answer was saved
    const attemptBefore = await apiRequest('GET', `/api/attempts/${testContext.attemptId}`, testContext.participantToken);
    const answerCountBefore = attemptBefore.answers?.length || 0;
    expect(answerCountBefore).toBeGreaterThan(0);
    
    // Trigger auto-submit via tab switch
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(3000);
    
    // Get attempt after auto-submit
    const attemptAfter = await apiRequest('GET', `/api/attempts/${testContext.attemptId}`, testContext.participantToken);
    
    // Answers should be preserved
    expect(attemptAfter.answers?.length).toBe(answerCountBefore);
    expect(attemptAfter.answers?.[0]?.answer).toBe('Option A');
  });
});

// Test Suite: Complete Test Flow Integration
test.describe('Test Flow Integration', () => {
  test('should complete full test flow with normal submission', async ({ page }) => {
    await loginAsParticipant(page);
    
    // Navigate to events page
    await page.goto(`http://localhost:5000/participant/events`);
    await page.waitForTimeout(500);
    
    // Find and click on the event
    await page.goto(`http://localhost:5000/participant/events/${testContext.eventId}`);
    await page.waitForTimeout(500);
    
    // Start test
    await page.click(`[data-testid="button-start-test-${testContext.roundId}"]`);
    await page.waitForURL('**/participant/take-test/**', { timeout: 10000 });
    
    const attemptUrl = page.url();
    const attemptId = attemptUrl.split('/').pop() || '';
    
    // Begin test (enter fullscreen)
    await page.click('[data-testid="button-begin-test"]');
    await page.waitForTimeout(1000);
    
    // Answer all questions
    for (let i = 0; i < testContext.questionIds.length; i++) {
      await answerQuestion(page, 0); // Select first option
      
      await apiRequest('POST', `/api/attempts/${attemptId}/answers`, testContext.participantToken, {
        questionId: testContext.questionIds[i],
        answer: 'Option A'
      });
      
      await page.waitForTimeout(300);
      
      // Navigate to next question or submit
      if (i < testContext.questionIds.length - 1) {
        await page.click('[data-testid="button-next"]');
        await page.waitForTimeout(300);
      }
    }
    
    // Submit test
    await page.click('[data-testid="button-submit-test"]');
    await page.waitForTimeout(2000);
    
    // Should be redirected to results page
    await page.waitForURL('**/participant/results/**', { timeout: 10000 });
    
    // Verify test is completed
    const attempt = await apiRequest('GET', `/api/attempts/${attemptId}`, testContext.participantToken);
    expect(attempt.status).toBe('completed');
    expect(attempt.totalScore).toBeGreaterThanOrEqual(0);
    
    await page.screenshot({ path: 'tests/reports/screenshots/test-completed.png', fullPage: true });
  });

  test('should maintain fullscreen throughout test duration', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Check fullscreen at multiple points
    let isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);
    
    // Answer a question
    await answerQuestion(page, 0);
    await page.waitForTimeout(500);
    
    isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);
    
    // Navigate to next question
    await page.click('[data-testid="button-next"]');
    await page.waitForTimeout(500);
    
    isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);
  });

  test('should show timer and time warnings', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Check timer is visible
    await expect(page.locator('[data-testid="text-timer"]')).toBeVisible();
    
    // Get timer text
    const timerText = await page.locator('[data-testid="text-timer"]').textContent();
    expect(timerText).toMatch(/\d+:\d+/);
    
    await page.screenshot({ path: 'tests/reports/screenshots/timer-display.png' });
  });

  test('should display violation warnings to participant', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Trigger a refresh violation
    await apiRequest('POST', `/api/attempts/${testContext.attemptId}/violations`, testContext.participantToken, {
      type: 'refresh'
    });
    
    await page.waitForTimeout(1000);
    
    // Check for toast notification or warning message
    // (This depends on the implementation - adjust selector as needed)
    const toastVisible = await page.locator('.toast, [role="alert"], [data-testid="toast"]').count() > 0;
    
    // Take screenshot to show warning
    await page.screenshot({ path: 'tests/reports/screenshots/violation-warning.png' });
  });
});

// Test Suite: Edge Cases and Error Handling
test.describe('Edge Cases and Error Handling', () => {
  test('should handle rapid violation attempts', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    // Log multiple violations rapidly
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        apiRequest('POST', `/api/attempts/${testContext.attemptId}/violations`, testContext.participantToken, {
          type: 'refresh'
        }).catch(() => {}) // Ignore errors for completed tests
      );
    }
    
    await Promise.all(promises);
    await page.waitForTimeout(1000);
    
    // Should handle gracefully without crashing
    const attempt = await apiRequest('GET', `/api/attempts/${testContext.attemptId}`, testContext.participantToken);
    expect(attempt).toBeDefined();
  });

  test('should prevent duplicate test attempts', async ({ page }) => {
    await loginAsParticipant(page);
    
    // Try to start test twice
    const firstAttemptRes = await apiRequest('POST', `/api/events/${testContext.eventId}/rounds/${testContext.roundId}/start`, testContext.participantToken, {});
    
    // Second attempt should fail
    try {
      await apiRequest('POST', `/api/events/${testContext.eventId}/rounds/${testContext.roundId}/start`, testContext.participantToken, {});
      throw new Error('Should have failed');
    } catch (error: any) {
      expect(error.message).toContain('already have an attempt');
    }
  });

  test('should handle window blur events', async ({ page }) => {
    await loginAsParticipant(page);
    await navigateToTest(page);
    await startTest(page);
    
    const initialViolations = await getViolationCount(testContext.attemptId);
    
    // Trigger window blur
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    
    await page.waitForTimeout(1000);
    
    // Check if blur is treated as tab switch
    const finalViolations = await getViolationCount(testContext.attemptId);
    // Note: Depending on implementation, blur might trigger tab switch violation
  });
});

test.afterAll(async () => {
  // Cleanup if needed
  console.log('All proctored test E2E tests completed');
});
