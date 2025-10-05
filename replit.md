# BootFeet 2K26 - Symposium Management System

## Project Overview
A comprehensive React-based web application for managing symposium events with role-based access control, proctored online testing, real-time updates, and advanced reporting capabilities.

## Recent Setup (October 3, 2025)
- ✅ Project imported from GitHub repository
- ✅ Dependencies installed successfully
- ✅ PostgreSQL database provisioned (Neon-backed via Replit)
- ✅ Database schema deployed successfully
- ✅ Application running on port 5000
- ✅ Deployment configured for autoscale
- ✅ Comprehensive deployment guides created (Vercel + College Server)
- ✅ Database structure documentation created
- ✅ Database seed file ready for use
- ⚠️ **ACTION REQUIRED:** Set JWT_SECRET in Secrets (see SETUP.md)

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Node.js (TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: Socket.io (WebSocket)
- **Authentication**: JWT + bcrypt

## Environment Configuration
### Required Secrets
- `JWT_SECRET` - **NEEDS TO BE SET**: Use the value below or generate your own
  - Suggested value: `32e3aa3dafe5bbb1b131beeb8aa964f9b408535c6090d52e5a3bc35f74e2d7e3f967dc53b66b9e788472747f4a5d8ede166e0b8ec442903e8525002906548a68`

### Optional Secrets (for email notifications)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - Email sender address

## Project Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types and schemas
├── docs/           # Documentation
├── tests/          # Test files
└── attached_assets/ # Static assets
```

## Development Workflow
1. Server runs on port 5000 (0.0.0.0)
2. Vite dev server configured with `allowedHosts: true` for Replit proxy
3. Backend and frontend served from same port
4. WebSocket server runs alongside Express

## Database Management
- Use `npm run db:push` to sync schema changes
- Use `npm run db:push --force` if data-loss warning appears
- Never manually write SQL migrations
- Database URL provided automatically by Replit
- Seed file available: `server/seed.ts` (run with `tsx server/seed.ts`)
- Complete database documentation: `docs/DATABASE_STRUCTURE.md`

## User Roles
1. **Super Admin** - Full system control
2. **Event Admin** - Manages assigned events
3. **Participant** - Takes tests and views results
4. **Registration Committee** - Manages registrations

## Deployment Guides
- **Master Guide**: `DEPLOYMENT_GUIDE.md` - Complete overview and strategy
- **Vercel Deployment**: `docs/VERCEL_DEPLOYMENT.md` - Cloud deployment with Neon DB
- **College Server**: `docs/COLLEGE_SERVER_DEPLOYMENT.md` - Local server setup for offline use
- **Database Reference**: `docs/DATABASE_STRUCTURE.md` - Complete schema documentation
- **Vercel Config**: `vercel.json` - Ready for Vercel deployment

## Key Features
- Role-based access control (RBAC)
- Proctored online testing with violation tracking
- Real-time WebSocket updates
- Leaderboards and analytics
- Email notifications
- Credential management (CSV/PDF export)
- Super admin override capabilities with audit logging
