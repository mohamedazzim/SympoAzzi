# BootFeet 2K26 - Symposium Management System

A comprehensive React-based web application for managing symposium events with role-based access control, proctored online testing, real-time updates, and advanced reporting capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [User Roles](#user-roles)
- [Installation](#installation)
- [Usage](#usage)
- [WebSocket Real-Time Communication](#websocket-real-time-communication)
- [Testing](#testing)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

## 🎯 Overview

The Symposium Management System is designed to streamline the entire lifecycle of symposium events, from registration to results publication. It provides a robust, secure, and user-friendly platform for organizing and conducting online assessments with strict integrity measures.

**Business Vision:** Deliver a comprehensive solution for online event management and assessment, tapping into the growing market for virtual and hybrid events.

## ✨ Features

### 🔐 Authentication & Authorization
- **JWT-based Authentication** with bcrypt password hashing
- **Role-Based Access Control (RBAC)** for 4 user types
- **Universal Login System** supporting event-specific participant credentials and admin accounts
- **Secure Session Management** with token-based authentication

### 🎓 Event Management
- **Complete Event Lifecycle Management**
  - Create, read, update, delete (CRUD) operations
  - Event categories: Technical and Non-Technical
  - Event types: Quiz, Coding, General, etc.
  - Status tracking: Draft, Active, Completed
  - Date range management with validation
- **Event Rules Configuration**
  - Customizable proctoring settings per event
  - Round-level and event-level rule inheritance

### 🔄 Round Management
- **3-State Lifecycle**: Not Started → In Progress → Completed
- **Admin-Controlled Test Flow**
  - Start/Stop rounds manually
  - Restart rounds when needed
  - Real-time status synchronization via WebSocket
- **Live Countdown Timers** for active rounds
- **Round-Specific Configuration**
  - Duration settings
  - Question allocation
  - Proctoring rules

### ❓ Question Management
- **Multiple Question Types**
  - Multiple Choice Questions (MCQ)
  - True/False
  - Short Answer
  - Coding Questions
- **Bulk Upload Support**
  - CSV format import
  - JSON format import
  - Validation and error reporting
- **Question Bank Management**
  - Categorization by rounds
  - Difficulty levels
  - Point allocation

### 🛡️ Proctored Online Testing
- **Zero-Tolerance Browser Controls**
  - Fullscreen enforcement (cannot exit fullscreen)
  - Tab switch detection and blocking
  - Page refresh prevention
  - Browser back button disabled
  - Keyboard shortcut disabling (Ctrl+C, Ctrl+V, etc.)
  - Right-click context menu disabled
- **Violation Tracking**
  - Real-time violation logging
  - Configurable violation thresholds
  - Auto-submission on rule violations
- **Test Security**
  - One attempt per participant per round
  - Answer auto-save functionality
  - Secure test environment
  - Session monitoring

### 👥 Participant Management
- **Registration System**
  - Public registration forms with custom slugs
  - On-spot registration by Registration Committee
  - Event selection with rules:
    - Maximum 1 technical event
    - Maximum 2 non-technical events
    - Time overlap validation
- **Human-Readable Credentials**
  - Format: `eventname-firstname-001` (username)
  - Format: `shortname001` (password)
  - Per-event incremental counters
  - Automatic credential generation
- **Credential Management**
  - Export credentials as CSV
  - Export credentials as PDF
  - Email notifications with credentials
  - Retry logic for failed emails
- **Test Access Control**
  - Enable/disable test access per participant
  - Bulk access management
  - Real-time status updates

### 📊 Reporting & Analytics
- **Comprehensive Report Generation**
  - Event-wise reports
  - Symposium-wide reports
  - Multiple export formats: JSON, Excel, PDF
- **Report Contents**
  - Participant performance metrics
  - Question-wise analysis
  - Leaderboard data
  - Violation logs
  - Time tracking
- **Super Admin Override Reports**
  - All override actions tracked
  - Before/after change comparison
  - Audit trail with timestamps
  - IP address logging

### 🏆 Leaderboard System
- **Real-Time Leaderboards**
  - Round-specific leaderboards
  - Event-specific leaderboards
  - Live rank updates
- **Visual Podium Display**
  - Top 3 positions highlighted
  - Medal indicators (Gold, Silver, Bronze)
  - Animated transitions
- **Ranking Criteria**
  - Total score
  - Time taken (tiebreaker)
  - Completion status

### 📧 Email Notification System
- **Automated Emails**
  - Registration confirmation
  - Credential delivery
  - Test reminders
  - Result notifications
- **Email Features**
  - SMTP configuration support
  - Retry logic for failed sends
  - Comprehensive email logs
  - Status tracking (pending, sent, failed)
- **Email Log Management**
  - Search by recipient
  - Filter by status
  - View email content
  - Retry failed emails

### 🔧 Super Admin Override Capabilities
- **Event Overrides**
  - Modify any event parameter
  - Change event status
  - Update dates and settings
- **Question Overrides**
  - Edit questions across all events
  - Modify correct answers
  - Update point values
- **Round Overrides**
  - Force start/stop rounds
  - Reset round status
  - Modify round settings
- **Audit Logging**
  - All actions logged with:
    - Admin ID and username
    - Action type and target
    - Before/after values (JSONB)
    - Reason for override
    - Timestamp and IP address
  - Searchable audit trail
  - Export audit logs

### 🔴 Real-Time WebSocket Communication
- **Production-Ready Socket.io Implementation**
  - JWT authentication for WebSocket connections
  - Single connection per client via centralized context
  - Authentication-aware lifecycle (auto-connect/disconnect)
  - Automatic reconnection with exponential backoff
- **RBAC-Filtered Event Broadcasting**
  - `registrationUpdate`: Super Admin, Event Admin, Registration Committee
  - `roundStatus`: Super Admin, Event Admin, Event Participants
  - `overrideAction`: Super Admin only
  - `resultPublished`: Specific participant only
- **Real-Time Updates**
  - New registrations
  - Round status changes
  - Admin override actions
  - Results publication
  - Live connection status badge
- **Stress Tested & Validated**
  - 200+ concurrent connections validated
  - <1.5s average latency
  - 100% message delivery rate
  - 0 duplicates, 0 zombie connections
  - See `docs/websocket-validation-report.md` for details

### 👮 Registration Committee Portal
- **Registration Management Dashboard**
  - View all registrations
  - Search and filter capabilities
  - Approval workflow
- **On-Spot Registration**
  - Quick participant registration
  - Instant credential generation
  - Immediate email delivery
  - Multiple registration formats
- **Credential Export**
  - Bulk export to CSV
  - Bulk export to PDF
  - Print-ready formats
  - QR code generation (optional)

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Routing:** Wouter (lightweight React router)
- **State Management:** TanStack Query v5 (React Query)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Forms:** React Hook Form with Zod validation
- **Icons:** Lucide React, React Icons
- **Animations:** Framer Motion
- **Real-time:** Socket.io Client

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon for Replit)
- **ORM:** Drizzle ORM
- **Authentication:** JSON Web Tokens (JWT)
- **Password Hashing:** bcrypt
- **Validation:** Zod schemas
- **File Generation:**
  - PDFKit (PDF reports)
  - ExcelJS (Excel reports)
- **Email:** Nodemailer (SMTP)
- **Real-time:** Socket.io Server

### Infrastructure
- **Development:** Vite Dev Server
- **Build Tool:** Vite
- **Package Manager:** npm
- **Database Migrations:** Drizzle Kit
- **Environment:** Replit (Nix-based)

## 👤 User Roles

### 1. Super Admin
**Full system control with override capabilities**

**Capabilities:**
- ✅ Manage all events (create, edit, delete, override)
- ✅ Create and assign Event Admins
- ✅ Create Registration Committee members
- ✅ Manage registration forms
- ✅ View all registrations
- ✅ Generate symposium-wide and event-specific reports
- ✅ Override any event, question, or round
- ✅ View comprehensive audit logs
- ✅ View email logs and retry failed emails
- ✅ Access all system features
- ✅ Receive all WebSocket notifications

**Pages:**
- Dashboard with system overview
- Events management
- Event Admin assignment
- Registration forms
- Registration Committee management
- All registrations view
- Report generation
- Email logs
- Super Admin overrides & audit logs

### 2. Event Admin
**Manages a single assigned event**

**Capabilities:**
- ✅ View assigned event details
- ✅ Configure event and round proctoring rules
- ✅ Manage rounds (create, edit, start, stop, restart)
- ✅ Manage questions (create, edit, bulk upload)
- ✅ View event participants
- ✅ Control test access for participants
- ✅ Monitor live test sessions
- ✅ View round and event leaderboards
- ✅ Receive event-specific WebSocket notifications

**Pages:**
- Single-event focused dashboard
- Event details and settings
- Event rules configuration
- Rounds management
- Round rules configuration
- Questions management
- Bulk question upload
- Participants view

### 3. Participant
**Takes tests and views results**

**Capabilities:**
- ✅ View assigned event details
- ✅ Access available tests (when enabled)
- ✅ Take proctored tests with strict controls
- ✅ View test results and scores
- ✅ Access round and event leaderboards
- ✅ View test history
- ✅ Receive result notifications via WebSocket

**Pages:**
- Participant dashboard
- Browse events
- Event details
- Take test (proctored environment)
- Test results
- My tests history
- Round leaderboard
- Event leaderboard

### 4. Registration Committee
**Manages participant registrations**

**Capabilities:**
- ✅ View all registrations
- ✅ Approve/reject registrations
- ✅ On-spot participant registration
- ✅ Generate and export credentials (CSV, PDF)
- ✅ Send credential emails
- ✅ Receive registration notifications via WebSocket

**Pages:**
- Registration dashboard
- View all registrations
- On-spot registration form
- Credential management

## 🚀 Installation

### Prerequisites
- Node.js 20+ (or use Replit)
- PostgreSQL database
- SMTP credentials (for email notifications)

### Environment Variables

Create a `.env` file with the following:

```bash
# Database (Replit provides these automatically)
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=your-postgres-host
PGPORT=5432
PGUSER=your-postgres-user
PGPASSWORD=your-postgres-password
PGDATABASE=your-database-name

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email (Optional - for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=BootFeet 2K26 <noreply@bootfeet.com>
```

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd symposium-management-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup database**
```bash
# Push schema to database
npm run db:push
```

4. **Start development server**
```bash
npm run dev
```

5. **Access the application**
```
http://localhost:5000
```

### First-Time Setup

1. **Create Super Admin** (via database or registration)
2. **Login as Super Admin**
3. **Create Events**
4. **Assign Event Admins**
5. **Create Registration Forms**
6. **Set up Registration Committee**

## 📖 Usage

### For Super Admin

1. **Login** with super admin credentials
2. **Create Events** from the Events page
3. **Assign Event Admins** to manage specific events
4. **Create Registration Forms** with custom slugs
5. **Monitor Registrations** and approve participants
6. **Generate Reports** for events or entire symposium
7. **Use Override Capabilities** when needed (with audit trail)

### For Event Admin

1. **Login** with event admin credentials
2. **View Your Assigned Event** on the dashboard
3. **Configure Event Rules** (proctoring settings)
4. **Create Rounds** with duration and settings
5. **Add Questions** individually or via bulk upload
6. **Start Round** when participants are ready
7. **Monitor Live Tests** and participant progress
8. **Stop Round** when time expires
9. **View Leaderboards** and results

### For Participants

1. **Register** via public registration form
2. **Receive Credentials** via email
3. **Login** with provided credentials
4. **Wait for Test Access** to be enabled
5. **Take Test** in proctored environment
   - Enter fullscreen mode
   - Do not switch tabs or refresh
   - Submit before time expires
6. **View Results** when published
7. **Check Leaderboard** to see rankings

### For Registration Committee

1. **Login** with registration committee credentials
2. **View All Registrations** on dashboard
3. **Approve/Reject** pending registrations
4. **On-Spot Registration**:
   - Enter participant details
   - Select events (with validation)
   - Auto-generate credentials
   - Send credentials via email
5. **Export Credentials** in CSV/PDF format

## 🔴 WebSocket Real-Time Communication

### Connection Management

The application uses Socket.io for real-time bidirectional communication:

```typescript
// Frontend - Automatic connection on login
import { useWebSocket } from '@/contexts/WebSocketContext';

function MyComponent() {
  const { isConnected, socket } = useWebSocket();
  
  // Connection status shown as "Live" badge when connected
  return <Badge>{isConnected ? 'Live' : 'Offline'}</Badge>;
}
```

### WebSocket Events

#### 1. `registrationUpdate`
**Sent to:** Super Admin, Event Admin (for that event), Registration Committee

**Payload:**
```json
{
  "type": "new_registration",
  "eventId": "event-uuid",
  "registration": {
    "id": "registration-uuid",
    "fullName": "John Doe",
    "eventName": "Coding Challenge"
  }
}
```

#### 2. `roundStatus`
**Sent to:** Super Admin, Event Admin (for that event), Participants (of that event)

**Payload:**
```json
{
  "eventId": "event-uuid",
  "roundId": "round-uuid",
  "status": "in_progress",
  "round": {
    "name": "Round 1",
    "duration": 60
  }
}
```

#### 3. `overrideAction`
**Sent to:** Super Admin only

**Payload:**
```json
{
  "action": "event_modified",
  "targetType": "event",
  "targetId": "event-uuid",
  "changes": {
    "before": { "status": "draft" },
    "after": { "status": "active" }
  },
  "timestamp": "2025-10-03T12:00:00.000Z"
}
```

#### 4. `resultPublished`
**Sent to:** Specific participant only

**Payload:**
```json
{
  "eventId": "event-uuid",
  "result": {
    "score": 85,
    "totalQuestions": 20,
    "correctAnswers": 17
  }
}
```

### WebSocket Rooms

- `super_admin` - All super admins
- `event:{eventId}` - Event admins for specific event
- `participant:{userId}` - Individual participants
- `registration_committee` - All registration committee members

## 🧪 Testing

### WebSocket Stress Test

The application includes a comprehensive WebSocket stress test suite:

```bash
# Run WebSocket validation and stress test
npm run test:websocket
```

**Test Coverage:**
- ✅ Authentication lifecycle (connect, disconnect, reconnect)
- ✅ RBAC filtering for all 4 event types
- ✅ Stress test with 200+ concurrent connections
- ✅ Performance metrics (latency, duplicates, zombies)
- ✅ Message delivery verification

**Test Results:**
- 6/6 tests passing
- 200 concurrent connections (100% success)
- ~1.4s average latency
- 100% message delivery
- 0 duplicates, 0 zombies

See `docs/websocket-validation-report.md` for full validation report.

### Manual Testing

**Test User Credentials:**
```
Super Admin:
Username: admin
Password: admin123

Event Admin:
Username: eventadmin
Password: admin123

Participant:
Username: participant
Password: user123
```

## 🗄️ Database Schema

### Core Tables

**users**
- Authentication and user management
- Roles: super_admin, event_admin, participant, registration_committee

**events**
- Event information and configuration
- Categories: technical, non_technical
- Status: draft, active, completed

**eventAdmins**
- Assignment of admins to events
- One-to-many relationship

**rounds**
- Test rounds within events
- Lifecycle: not_started, in_progress, completed

**questions**
- Question bank linked to rounds
- Types: mcq, true_false, short_answer, coding

**participants**
- Participant registrations
- Event selection and credentials

**testAttempts**
- Test submissions and scoring
- Violation tracking
- Answer storage

**eventRules & roundRules**
- Proctoring configuration
- Rule inheritance system

**auditLogs**
- Super admin override tracking
- Complete audit trail

**emailLogs**
- Email delivery tracking
- Retry management

**registrationForms**
- Public registration forms
- Custom slugs

### Relationships

```
users (1) ─── (N) eventAdmins ─── (1) events
events (1) ─── (N) rounds ─── (N) questions
events (1) ─── (N) participants ─── (1) users
rounds (1) ─── (N) testAttempts ─── (1) participants
events (1) ─── (1) eventRules
rounds (1) ─── (1) roundRules
```

## 📡 API Documentation

### Authentication
```
POST /api/auth/login          - Login with username/password
POST /api/auth/register       - Register new user
GET  /api/auth/me             - Get current user info
POST /api/auth/logout         - Logout user
```

### Events (Super Admin)
```
GET    /api/events            - Get all events
POST   /api/events            - Create event
GET    /api/events/:id        - Get event details
PUT    /api/events/:id        - Update event
DELETE /api/events/:id        - Delete event
```

### Rounds (Event Admin)
```
GET    /api/events/:id/rounds        - Get event rounds
POST   /api/events/:id/rounds        - Create round
PUT    /api/rounds/:id               - Update round
DELETE /api/rounds/:id               - Delete round
POST   /api/rounds/:id/start         - Start round
POST   /api/rounds/:id/stop          - Stop round
POST   /api/rounds/:id/restart       - Restart round
```

### Questions (Event Admin)
```
GET    /api/rounds/:id/questions     - Get round questions
POST   /api/rounds/:id/questions     - Create question
PUT    /api/questions/:id            - Update question
DELETE /api/questions/:id            - Delete question
POST   /api/rounds/:id/questions/bulk - Bulk upload questions
```

### Participants
```
GET    /api/events/:id/participants  - Get event participants
POST   /api/participants              - Register participant
PUT    /api/participants/:id/access  - Toggle test access
POST   /api/participants/:id/credentials/send - Send credentials email
GET    /api/participants/my-credential - Get participant's credential
```

### Tests (Participant)
```
GET    /api/rounds/:id/test          - Get test questions
POST   /api/test-attempts             - Submit test
GET    /api/test-attempts/:id         - Get test attempt results
GET    /api/participants/my-tests     - Get participant's test history
```

### Reports (Super Admin)
```
POST   /api/reports/event            - Generate event report
POST   /api/reports/symposium        - Generate symposium report
GET    /api/reports                  - Get all reports
GET    /api/reports/:id/download     - Download report
```

### Leaderboards
```
GET    /api/rounds/:id/leaderboard   - Get round leaderboard
GET    /api/events/:id/leaderboard   - Get event leaderboard
```

### Super Admin Overrides
```
POST   /api/admin/override/event     - Override event
POST   /api/admin/override/question  - Override question
POST   /api/admin/override/round     - Override round
GET    /api/admin/audit-logs         - Get audit logs
```

### Email Logs
```
GET    /api/email-logs               - Get all email logs
GET    /api/email-logs/:email        - Get logs by recipient
POST   /api/email-logs/:id/retry     - Retry failed email
```

## 🚀 Deployment

### Replit Deployment

1. **Configure Environment Variables** in Replit Secrets
2. **Set Database URL** (automatically provided by Replit)
3. **Configure SMTP** settings for email
4. **Click "Deploy"** button in Replit
5. **Access via** provided Replit URL

### Manual Deployment

1. **Build the application**
```bash
npm run build
```

2. **Set Production Environment Variables**
```bash
export NODE_ENV=production
export JWT_SECRET=your-production-secret
export DATABASE_URL=your-production-database-url
# Add SMTP variables
```

3. **Run Database Migrations**
```bash
npm run db:push
```

4. **Start Production Server**
```bash
npm start
```

### Environment Checklist

- ✅ `DATABASE_URL` set
- ✅ `JWT_SECRET` set (strong random value)
- ✅ `NODE_ENV=production`
- ✅ SMTP credentials configured (optional)
- ✅ Database migrations run
- ✅ Super admin account created

## 📚 Documentation

Additional documentation available:

- **WebSocket System:** `docs/websockets.md`
- **WebSocket Validation Report:** `docs/websocket-validation-report.md`
- **Project Overview:** `replit.md`

## 🔒 Security Features

- ✅ JWT-based authentication with bcrypt password hashing
- ✅ Role-based access control (RBAC) at API level
- ✅ Input validation using Zod schemas
- ✅ SQL injection prevention via Drizzle ORM
- ✅ XSS protection via React's built-in escaping
- ✅ CSRF protection via same-origin policy
- ✅ Secure WebSocket authentication
- ✅ Proctored test environment with strict browser controls
- ✅ Comprehensive audit logging for admin actions
- ✅ Violation tracking for test integrity

## 🤝 Contributing

This is a proprietary system built for BootFeet 2K26 Symposium.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for BootFeet 2K26 Symposium**

For support or inquiries, contact the system administrator.
"# SympoAzzi" 
