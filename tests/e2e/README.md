# Proctored Test Environment E2E Test Suite

## Overview
Comprehensive end-to-end test suite for the proctored test environment using Playwright. Tests all proctoring features including fullscreen enforcement, tab switch detection, page refresh prevention, browser controls, violation tracking, and auto-submission.

## Test Coverage

### 1. Fullscreen Enforcement Tests (3 tests)
- ✅ Verifies fullscreen mode activation on test start
- ✅ Detects fullscreen exit and logs violation
- ✅ Shows re-enter fullscreen modal on exit

### 2. Tab Switch Detection Tests (2 tests)
- ✅ Detects tab switch via visibility change
- ✅ Disqualifies participant on tab switch

### 3. Page Refresh Prevention Tests (2 tests)
- ✅ Intercepts page refresh and shows confirmation
- ✅ Tracks refresh attempts in violations

### 4. Browser Controls Disabled Tests (3 tests)
- ✅ Prevents browser back button navigation
- ✅ Disables right-click context menu
- ✅ Blocks keyboard shortcuts (Ctrl+C, Ctrl+V, F12, etc.)

### 5. Violation Tracking & Auto-Submit Tests (3 tests)
- ✅ Logs violations with timestamps
- ✅ Auto-submits test on violation threshold
- ✅ Saves answers correctly on auto-submit

### 6. Test Flow Integration (4 tests)
- ✅ Complete test flow with normal submission
- ✅ Maintains fullscreen throughout test duration
- ✅ Shows timer and time warnings
- ✅ Displays violation warnings to participant

### 7. Edge Cases and Error Handling (3 tests)
- ✅ Handles rapid violation attempts
- ✅ Prevents duplicate test attempts
- ✅ Handles window blur events

## Running the Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run specific test file:
```bash
npx playwright test tests/e2e/proctored-test.spec.ts
```

### Run in headed mode (visual validation):
```bash
npx playwright test tests/e2e/proctored-test.spec.ts --headed
```

### Run with UI mode:
```bash
npx playwright test tests/e2e/proctored-test.spec.ts --ui
```

### Debug mode:
```bash
npx playwright test tests/e2e/proctored-test.spec.ts --debug
```

## Test Configuration

The tests use the following configuration (from `playwright.config.ts`):
- **Base URL**: http://localhost:5000
- **Headed Mode**: Enabled (headless: false)
- **Screenshots**: Captured on violations and test completion
- **Video**: Retained on failure
- **Workers**: 1 (sequential execution)
- **Retries**: 0 in local, 2 in CI

## Test Data Setup

The test suite automatically creates:
- Super admin user
- Event admin user
- Test event with proctored round
- Round rules (fullscreen, no tab switch, no refresh, etc.)
- Multiple choice questions
- Participant user with event credentials

## Helper Functions

### Authentication
- `loginAsParticipant(page)` - Logs in as participant using event credentials

### Navigation
- `navigateToTest(page)` - Navigates to test and starts attempt
- `startTest(page)` - Begins test and enters fullscreen

### Test Interaction
- `answerQuestion(page, optionIndex)` - Selects an answer option
- `submitAnswer(page)` - Saves answer via API
- `getViolationCount(attemptId)` - Retrieves violation counts

### API Helper
- `apiRequest(method, endpoint, token, body)` - Makes authenticated API requests

## Screenshot Locations

Screenshots are saved to `tests/reports/screenshots/`:
- `fullscreen-activated.png` - Fullscreen mode activated
- `fullscreen-violation.png` - Fullscreen exit violation
- `reenter-fullscreen-modal.png` - Re-enter fullscreen modal
- `tab-switch-violation.png` - Tab switch violation
- `disqualified-tab-switch.png` - Disqualification status
- `auto-submit-violation.png` - Auto-submit on violation
- `test-completed.png` - Test completion
- `timer-display.png` - Timer display
- `violation-warning.png` - Violation warning

## Test Reports

Reports are generated in:
- **HTML Report**: `tests/reports/playwright-report/index.html`
- **JSON Report**: `tests/reports/playwright-results.json`
- **JUnit XML**: `tests/reports/playwright-junit.xml`

## Key Features Tested

### Proctoring Features
- ✅ Fullscreen enforcement
- ✅ Tab switch detection
- ✅ Page refresh prevention
- ✅ Browser back button blocking
- ✅ Keyboard shortcut disabling
- ✅ Right-click context menu disabling

### Violation System
- ✅ Violation logging with timestamps
- ✅ Violation type tracking (tab_switch, fullscreen_exit, refresh)
- ✅ Auto-disqualification on critical violations
- ✅ Auto-submission on violation threshold
- ✅ Answer preservation on auto-submit

### Test Flow
- ✅ Participant login with event credentials
- ✅ Test attempt creation
- ✅ Question answering and navigation
- ✅ Timer and warnings
- ✅ Normal test submission
- ✅ Results page navigation

## Notes

- Tests run in **headed mode** by default for visual validation
- Each test is independent and creates its own test data
- Tests use actual API endpoints, not mocks
- Screenshots are captured at key points for debugging
- Tests verify both UI behavior and database state

## Troubleshooting

### Test fails to login
- Ensure the development server is running on port 5000
- Check that the database is accessible
- Verify event credentials are created correctly

### Fullscreen tests fail
- Run tests in headed mode (not headless)
- Some browsers may block fullscreen in headless mode
- Check browser permissions

### Violation tests fail
- Verify round rules are configured correctly
- Check that violation logging API is working
- Ensure participant disqualification logic is active

## Future Enhancements

- Add tests for screenshot proctoring (if implemented)
- Add tests for webcam monitoring (if implemented)
- Add tests for audio monitoring (if implemented)
- Add performance tests for violation handling
- Add tests for concurrent violation attempts
