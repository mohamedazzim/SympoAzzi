# Database Structure Documentation

## Overview
This document provides a comprehensive reference for the BootFeet 2K26 Symposium Management System database structure. The database uses PostgreSQL with Drizzle ORM.

## Entity Relationship Diagram (ERD)

```
users (1) ─── (N) eventAdmins ─── (1) events
  │                                    │
  │                                    ├─── (1) eventRules
  │                                    │
  ├─── (N) participants                ├─── (N) rounds
  │         │                          │         │
  │         └─── (1) events            │         ├─── (1) roundRules
  │                                    │         │
  │                                    │         ├─── (N) questions
  │                                    │         │
  │                                    │         └─── (N) testAttempts
  │                                    │
  │                                    ├─── (N) registrationForms
  │                                              │
  ├─── (N) auditLogs                            └─── (N) registrations
  │
  └─── (N) eventCredentials
```

---

## Tables

### 1. users
**Purpose**: Stores all user accounts with role-based access control

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| username | TEXT | NOT NULL, UNIQUE | Login username |
| password | TEXT | NOT NULL | bcrypt hashed password |
| email | TEXT | NOT NULL, UNIQUE | User email address |
| fullName | TEXT | NOT NULL | Full name of user |
| phone | TEXT | NULLABLE | Contact phone number |
| role | VARCHAR(ENUM) | NOT NULL | User role: super_admin, event_admin, participant, registration_committee |
| createdBy | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE SET NULL | User who created this account |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE on `username`
- UNIQUE on `email`
- FOREIGN KEY on `createdBy`

**Role Types**:
- `super_admin`: Full system control, can manage all events and users
- `event_admin`: Manages assigned events only
- `participant`: Takes tests and views results
- `registration_committee`: Manages participant registrations

---

### 2. events
**Purpose**: Stores symposium event information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique event identifier |
| name | TEXT | NOT NULL | Event name |
| description | TEXT | NOT NULL | Event description |
| type | TEXT | NOT NULL | Event type (quiz, coding, general, etc.) |
| category | VARCHAR(ENUM) | NOT NULL, DEFAULT 'technical' | Event category: technical, non_technical |
| startDate | TIMESTAMP | NULLABLE | Event start date and time |
| endDate | TIMESTAMP | NULLABLE | Event end date and time |
| status | TEXT | NOT NULL, DEFAULT 'draft' | Event status: draft, active, completed |
| createdBy | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE SET NULL | User who created the event |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Event creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Status Lifecycle**:
- `draft`: Event is being prepared
- `active`: Event is ongoing
- `completed`: Event has ended

**Category Rules**:
- Participants can register for max 1 technical event
- Participants can register for max 2 non-technical events

---

### 3. eventAdmins
**Purpose**: Maps event admins to their assigned events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique assignment identifier |
| eventId | VARCHAR (UUID) | FOREIGN KEY → events(id), ON DELETE CASCADE | Event being assigned |
| adminId | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE CASCADE | Admin being assigned |
| assignedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Assignment timestamp |

**Business Rules**:
- One event admin can manage multiple events
- One event can have multiple event admins
- Super admins can access all events without assignment

---

### 4. eventRules
**Purpose**: Defines proctoring and testing rules for events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique rule set identifier |
| eventId | VARCHAR (UUID) | FOREIGN KEY → events(id), ON DELETE CASCADE, UNIQUE | Associated event |
| noRefresh | BOOLEAN | NOT NULL, DEFAULT TRUE | Prevent page refresh during test |
| noTabSwitch | BOOLEAN | NOT NULL, DEFAULT TRUE | Prevent tab switching |
| forceFullscreen | BOOLEAN | NOT NULL, DEFAULT TRUE | Enforce fullscreen mode |
| disableShortcuts | BOOLEAN | NOT NULL, DEFAULT TRUE | Disable keyboard shortcuts |
| autoSubmitOnViolation | BOOLEAN | NOT NULL, DEFAULT TRUE | Auto-submit test on rule violation |
| maxTabSwitchWarnings | INTEGER | NOT NULL, DEFAULT 2 | Maximum tab switch warnings before action |
| additionalRules | TEXT | NULLABLE | Additional custom rules (text) |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Rule creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Rule Inheritance**:
- Event rules apply to all rounds by default
- Round-specific rules override event rules

---

### 5. rounds
**Purpose**: Test rounds within events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique round identifier |
| eventId | VARCHAR (UUID) | FOREIGN KEY → events(id), ON DELETE CASCADE | Parent event |
| name | TEXT | NOT NULL | Round name (e.g., "Round 1", "Finals") |
| description | TEXT | NULLABLE | Round description |
| roundNumber | INTEGER | NOT NULL | Sequential round number |
| duration | INTEGER | NOT NULL | Duration in minutes |
| startTime | TIMESTAMP | NULLABLE | Scheduled start time |
| endTime | TIMESTAMP | NULLABLE | Scheduled end time |
| status | TEXT | NOT NULL, DEFAULT 'not_started' | Round status |
| startedAt | TIMESTAMP | NULLABLE | Actual start timestamp (admin action) |
| endedAt | TIMESTAMP | NULLABLE | Actual end timestamp (admin action) |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Round creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Status Lifecycle**:
- `not_started`: Round hasn't begun
- `in_progress`: Round is currently active
- `completed`: Round has ended

**Admin Controls**:
- Admins manually start/stop rounds
- Countdown timer based on `startedAt` + `duration`

---

### 6. roundRules
**Purpose**: Round-specific proctoring rules (overrides event rules)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique rule set identifier |
| roundId | VARCHAR (UUID) | FOREIGN KEY → rounds(id), ON DELETE CASCADE, UNIQUE | Associated round |
| noRefresh | BOOLEAN | NOT NULL, DEFAULT TRUE | Prevent page refresh |
| noTabSwitch | BOOLEAN | NOT NULL, DEFAULT TRUE | Prevent tab switching |
| forceFullscreen | BOOLEAN | NOT NULL, DEFAULT TRUE | Enforce fullscreen |
| disableShortcuts | BOOLEAN | NOT NULL, DEFAULT TRUE | Disable shortcuts |
| autoSubmitOnViolation | BOOLEAN | NOT NULL, DEFAULT TRUE | Auto-submit on violation |
| maxTabSwitchWarnings | INTEGER | NOT NULL, DEFAULT 2 | Max warnings |
| additionalRules | TEXT | NULLABLE | Additional custom rules |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Rule creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

### 7. questions
**Purpose**: Question bank for rounds

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique question identifier |
| roundId | VARCHAR (UUID) | FOREIGN KEY → rounds(id), ON DELETE CASCADE | Associated round |
| questionType | TEXT | NOT NULL | Question type: multiple_choice, coding, descriptive, true_false |
| questionText | TEXT | NOT NULL | The question text |
| questionNumber | INTEGER | NOT NULL | Sequential question number |
| points | INTEGER | NOT NULL, DEFAULT 1 | Points awarded for correct answer |
| options | JSONB | NULLABLE | Array of options (for MCQ) |
| correctAnswer | TEXT | NULLABLE | Correct answer (for MCQ/True-False) |
| expectedOutput | TEXT | NULLABLE | Expected output (for coding/descriptive) |
| testCases | JSONB | NULLABLE | Test cases array (for coding questions) |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Question creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Question Types**:
- `multiple_choice`: Uses `options` and `correctAnswer`
- `true_false`: Uses `options` (["True", "False"]) and `correctAnswer`
- `descriptive`: Uses `expectedOutput`
- `coding`: Uses `expectedOutput` and `testCases`

**JSONB Format Examples**:
```json
// options (MCQ)
["Option A", "Option B", "Option C", "Option D"]

// testCases (Coding)
[
  { "input": "5", "output": "120" },
  { "input": "3", "output": "6" }
]
```

---

### 8. participants
**Purpose**: Tracks participant registrations for events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique participation identifier |
| eventId | VARCHAR (UUID) | FOREIGN KEY → events(id), ON DELETE CASCADE | Event participant registered for |
| userId | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE CASCADE | Participant user account |
| registeredAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Registration timestamp |
| status | TEXT | NOT NULL, DEFAULT 'registered' | Participation status |

**Status Values**:
- `registered`: Participant is registered
- `completed`: Participant completed the event
- `disqualified`: Participant was disqualified

**Registration Rules**:
- Max 1 technical event per participant
- Max 2 non-technical events per participant
- No time overlaps allowed

---

### 9. testAttempts
**Purpose**: Records test submission and results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique attempt identifier |
| roundId | VARCHAR (UUID) | FOREIGN KEY → rounds(id), ON DELETE CASCADE | Round being attempted |
| userId | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE CASCADE | User taking the test |
| startedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Test start timestamp |
| submittedAt | TIMESTAMP | NULLABLE | Test submission timestamp |
| score | INTEGER | NULLABLE | Total score achieved |
| totalQuestions | INTEGER | NULLABLE | Total number of questions |
| correctAnswers | INTEGER | NULLABLE | Number of correct answers |
| timeTaken | INTEGER | NULLABLE | Time taken in seconds |
| violationCount | INTEGER | NOT NULL, DEFAULT 0 | Number of rule violations |
| violationDetails | JSONB | NULLABLE | Details of violations |
| status | TEXT | NOT NULL, DEFAULT 'in_progress' | Attempt status |

**Status Values**:
- `in_progress`: Test is ongoing
- `submitted`: Test submitted normally
- `auto_submitted`: Auto-submitted due to violations
- `timed_out`: Auto-submitted due to time limit

**Violation Tracking**:
```json
// violationDetails format
[
  {
    "type": "tab_switch",
    "timestamp": "2025-10-03T12:34:56Z",
    "details": "User switched to another tab"
  }
]
```

---

### 10. answers
**Purpose**: Stores participant answers to questions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique answer identifier |
| testAttemptId | VARCHAR (UUID) | FOREIGN KEY → testAttempts(id), ON DELETE CASCADE | Associated test attempt |
| questionId | VARCHAR (UUID) | FOREIGN KEY → questions(id), ON DELETE CASCADE | Question being answered |
| answer | TEXT | NOT NULL | Participant's answer |
| isCorrect | BOOLEAN | NULLABLE | Whether answer is correct (null if not graded) |
| pointsAwarded | INTEGER | NULLABLE | Points awarded for this answer |
| answeredAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Answer submission timestamp |

**Grading**:
- MCQ/True-False: Auto-graded by comparing with `correctAnswer`
- Coding: Graded by running test cases
- Descriptive: Manual grading required

---

### 11. registrationForms
**Purpose**: Public registration forms for events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique form identifier |
| eventId | VARCHAR (UUID) | FOREIGN KEY → events(id), ON DELETE CASCADE | Associated event |
| formName | TEXT | NOT NULL | Form display name |
| slug | TEXT | NOT NULL, UNIQUE | URL-friendly slug |
| isActive | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether form accepts submissions |
| openDate | TIMESTAMP | NULLABLE | Form opens at this time |
| closeDate | TIMESTAMP | NULLABLE | Form closes at this time |
| maxRegistrations | INTEGER | NULLABLE | Maximum allowed registrations |
| description | TEXT | NULLABLE | Form description |
| createdBy | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE SET NULL | Form creator |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Form creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**URL Pattern**:
- Access via: `/register/{slug}`
- Example: `/register/coding-challenge-2026`

---

### 12. registrations
**Purpose**: Public registration submissions (before user creation)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique registration identifier |
| formId | VARCHAR (UUID) | FOREIGN KEY → registrationForms(id), ON DELETE CASCADE | Form used for registration |
| fullName | TEXT | NOT NULL | Registrant's full name |
| email | TEXT | NOT NULL | Registrant's email |
| phone | TEXT | NULLABLE | Contact phone |
| collegeName | TEXT | NULLABLE | College/institution name |
| department | TEXT | NULLABLE | Department/field of study |
| year | TEXT | NULLABLE | Year of study |
| status | TEXT | NOT NULL, DEFAULT 'pending' | Registration status |
| submittedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Registration timestamp |
| approvedAt | TIMESTAMP | NULLABLE | Approval timestamp |
| approvedBy | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE SET NULL | Who approved |

**Status Flow**:
- `pending`: Awaiting approval
- `approved`: Approved, credentials generated
- `rejected`: Registration rejected
- `cancelled`: Registration cancelled

---

### 13. eventCredentials
**Purpose**: Generated login credentials for participants

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique credential identifier |
| eventId | VARCHAR (UUID) | FOREIGN KEY → events(id), ON DELETE CASCADE | Associated event |
| userId | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE CASCADE, UNIQUE | Participant user account |
| username | TEXT | NOT NULL, UNIQUE | Generated username |
| rawPassword | TEXT | NOT NULL | Plain text password (for sending via email) |
| sequenceNumber | INTEGER | NOT NULL | Sequential number for username generation |
| emailSent | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether credentials were emailed |
| emailSentAt | TIMESTAMP | NULLABLE | Email sent timestamp |
| testAccessEnabled | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether participant can take tests |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Credential creation timestamp |

**Credential Format**:
- Username: `{eventSlug}-{firstName}-{sequenceNumber}`
  - Example: `coding-john-001`
- Password: `{eventShortName}{sequenceNumber}`
  - Example: `code001`

---

### 14. auditLogs
**Purpose**: Tracks super admin override actions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique log identifier |
| adminId | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE CASCADE | Admin who performed action |
| actionType | TEXT | NOT NULL | Type of override action |
| targetType | TEXT | NOT NULL | What was modified (event, question, round) |
| targetId | VARCHAR (UUID) | NOT NULL | ID of modified entity |
| changesBefore | JSONB | NULLABLE | State before modification |
| changesAfter | JSONB | NULLABLE | State after modification |
| reason | TEXT | NULLABLE | Reason for override |
| ipAddress | TEXT | NULLABLE | IP address of admin |
| timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Action timestamp |

**Action Types**:
- `event_modified`
- `question_modified`
- `round_force_start`
- `round_force_stop`
- `participant_disqualified`

---

### 15. emailLogs
**Purpose**: Tracks email notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR (UUID) | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique log identifier |
| recipient | TEXT | NOT NULL | Email recipient address |
| subject | TEXT | NOT NULL | Email subject |
| body | TEXT | NOT NULL | Email body content |
| status | TEXT | NOT NULL, DEFAULT 'pending' | Email status |
| sentAt | TIMESTAMP | NULLABLE | Successful send timestamp |
| error | TEXT | NULLABLE | Error message if failed |
| retryCount | INTEGER | NOT NULL, DEFAULT 0 | Number of retry attempts |
| eventId | VARCHAR (UUID) | FOREIGN KEY → events(id), ON DELETE SET NULL | Related event (if applicable) |
| userId | VARCHAR (UUID) | FOREIGN KEY → users(id), ON DELETE SET NULL | Related user (if applicable) |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Log creation timestamp |

**Status Values**:
- `pending`: Queued for sending
- `sent`: Successfully sent
- `failed`: Send failed
- `retry`: Queued for retry

---

## Indexes and Performance

### Recommended Indexes
```sql
-- Users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_by ON users(createdBy);

-- Events
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_start_date ON events(startDate);

-- Rounds
CREATE INDEX idx_rounds_event_id ON rounds(eventId);
CREATE INDEX idx_rounds_status ON rounds(status);

-- Questions
CREATE INDEX idx_questions_round_id ON questions(roundId);

-- Test Attempts
CREATE INDEX idx_test_attempts_round_id ON testAttempts(roundId);
CREATE INDEX idx_test_attempts_user_id ON testAttempts(userId);
CREATE INDEX idx_test_attempts_status ON testAttempts(status);

-- Participants
CREATE INDEX idx_participants_event_id ON participants(eventId);
CREATE INDEX idx_participants_user_id ON participants(userId);

-- Audit Logs
CREATE INDEX idx_audit_logs_admin_id ON auditLogs(adminId);
CREATE INDEX idx_audit_logs_timestamp ON auditLogs(timestamp);
```

---

## Database Migrations

### Using Drizzle ORM

**Push Schema Changes**:
```bash
npm run db:push
```

**Force Push (if data loss warning)**:
```bash
npm run db:push --force
```

**IMPORTANT**: Never manually write SQL migrations. Always use Drizzle's push command.

---

## Common Queries

### Get all active events with their admins
```sql
SELECT e.*, u.fullName as adminName
FROM events e
LEFT JOIN eventAdmins ea ON e.id = ea.eventId
LEFT JOIN users u ON ea.adminId = u.id
WHERE e.status = 'active';
```

### Get leaderboard for a round
```sql
SELECT 
  u.fullName,
  ta.score,
  ta.timeTaken,
  ta.correctAnswers
FROM testAttempts ta
JOIN users u ON ta.userId = u.id
WHERE ta.roundId = 'round-uuid'
  AND ta.status = 'submitted'
ORDER BY ta.score DESC, ta.timeTaken ASC;
```

### Count registrations per event
```sql
SELECT 
  e.name,
  COUNT(p.id) as participantCount
FROM events e
LEFT JOIN participants p ON e.id = p.eventId
GROUP BY e.id, e.name;
```

---

## Backup and Restore

### Backup (PostgreSQL)
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore (PostgreSQL)
```bash
psql $DATABASE_URL < backup_file.sql
```

---

## Security Considerations

1. **Password Hashing**: All passwords stored using bcrypt (10 rounds)
2. **UUID Primary Keys**: Using UUIDs instead of serial IDs prevents enumeration
3. **Cascade Deletes**: Properly configured to maintain referential integrity
4. **JSONB Validation**: Client-side validation before storing JSON data
5. **Audit Trail**: All sensitive actions logged in auditLogs table

---

## Maintenance

### Regular Tasks
- Monitor database size and performance
- Archive completed events and test attempts
- Clean up old email logs (older than 90 days)
- Review audit logs for security issues
- Backup database daily

### Optimization
- Regularly run `VACUUM ANALYZE` on PostgreSQL
- Monitor slow queries using pg_stat_statements
- Add indexes based on query patterns

---

## Support

For questions or issues with the database structure:
1. Check this documentation first
2. Review the Drizzle schema at `shared/schema.ts`
3. Consult the README.md for API documentation
4. Check existing seed data at `server/seed.ts`
