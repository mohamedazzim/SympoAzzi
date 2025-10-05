# Setup Instructions for BootFeet 2K26 Symposium Management System

## ✅ Completed Setup Steps

The following has been automatically configured:

1. ✅ **Dependencies Installed** - All npm packages installed successfully
2. ✅ **PostgreSQL Database Created** - Database provisioned via Replit (Neon-backed)
3. ✅ **Database Schema Deployed** - All tables created via Drizzle
4. ✅ **Workflow Configured** - Application runs on port 5000
5. ✅ **Deployment Settings** - Production deployment configured
6. ✅ **Vite Configuration** - Already set up with `allowedHosts: true` for Replit proxy
7. ✅ **Server Configuration** - Running on 0.0.0.0:5000 (required for Replit)

## ⚠️ Required Action: Set JWT_SECRET

**IMPORTANT:** You must set the `JWT_SECRET` environment variable for authentication to work.

### How to Set JWT_SECRET:

1. Click the **Lock icon** (🔒) in the left sidebar or go to "Secrets" tab
2. Click **"New Secret"**
3. Set the following:
   - **Key:** `JWT_SECRET`
   - **Value:** Use this secure random value:
   ```
   32e3aa3dafe5bbb1b131beeb8aa964f9b408535c6090d52e5a3bc35f74e2d7e3f967dc53b66b9e788472747f4a5d8ede166e0b8ec442903e8525002906548a68
   ```
   - Or generate your own using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
4. Click **"Save"**
5. **Restart the application** (it will restart automatically)

### ⚠️ Without JWT_SECRET:
- User login/authentication will not work
- The application will fail when trying to generate JWT tokens

## 📧 Optional: Email Configuration

To enable email notifications (credential delivery, test reminders, etc.):

Set these environment variables in Secrets:

- `SMTP_HOST` - e.g., `smtp.gmail.com`
- `SMTP_PORT` - e.g., `587`
- `SMTP_USER` - Your email address
- `SMTP_PASS` - Your email password or app-specific password
- `SMTP_FROM` - e.g., `BootFeet 2K26 <noreply@bootfeet.com>`

**Note:** Email features are optional. The app will work without them, but email notifications won't be sent.

## 🚀 Running the Application

The application is already running! Access it via the webview panel.

### Default Ports:
- **Application:** Port 5000 (frontend + backend + WebSocket)
- **Host:** 0.0.0.0 (required for Replit)

### Development Commands:
```bash
npm run dev          # Start development server (already running)
npm run build        # Build for production
npm run start        # Run production server
npm run db:push      # Sync database schema changes
npm run check        # TypeScript type checking
```

## 📊 Database

The PostgreSQL database is provisioned and ready. The following environment variables are automatically set:

- `DATABASE_URL`
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`

### Database Schema Includes:
- `users` - Authentication and user management
- `events` - Symposium events
- `rounds` - Test rounds within events
- `questions` - Question bank
- `participants` - Event registrations
- `testAttempts` - Test submissions and scoring
- `eventAdmins` - Admin-to-event assignments
- `eventRules` & `roundRules` - Proctoring configuration
- `auditLogs` - Super admin action tracking
- `emailLogs` - Email delivery tracking
- `registrationForms` - Public registration forms

## 👤 First-Time User Setup

Since this is a fresh database, you'll need to create the first Super Admin user:

### Option 1: Via Database (Recommended)
1. Open the Database tab in Replit
2. Run this SQL to create a super admin:

```sql
INSERT INTO users (username, password, email, full_name, role)
VALUES (
  'admin',
  '$2b$10$YourHashedPasswordHere',  -- See note below
  'admin@bootfeet.com',
  'Super Administrator',
  'super_admin'
);
```

**To generate a hashed password:**
```bash
node -e "console.log(require('bcrypt').hashSync('admin123', 10))"
```

### Option 2: Via Registration Endpoint
Send a POST request to `/api/auth/register` with:
```json
{
  "username": "admin",
  "password": "admin123",
  "email": "admin@bootfeet.com",
  "fullName": "Super Administrator",
  "role": "super_admin"
}
```

## 🎯 Application Features

### User Roles:
1. **Super Admin** - Full system control, override capabilities
2. **Event Admin** - Manages assigned events
3. **Participant** - Takes tests and views results
4. **Registration Committee** - Manages participant registrations

### Key Features:
- 🔐 JWT-based authentication with bcrypt
- 🎓 Complete event lifecycle management
- 🔄 Multi-round testing system
- ❓ Multiple question types (MCQ, True/False, Short Answer, Coding)
- 🛡️ Proctored online testing with violation tracking
- 👥 Participant registration and credential management
- 📊 Real-time leaderboards
- 📧 Email notifications (when configured)
- 🔴 WebSocket real-time updates
- 🔧 Super admin override capabilities with audit trail
- 📈 Comprehensive reporting (JSON, Excel, PDF)

## 🚀 Deployment

The deployment is already configured for **autoscale** mode:

- **Build command:** `npm run build`
- **Run command:** `npm run start`

To deploy:
1. Ensure `JWT_SECRET` is set in Secrets
2. Click the **"Deploy"** button in Replit
3. Your application will be live with a public URL

## 🔧 Troubleshooting

### Application won't start:
- Ensure `JWT_SECRET` is set in Secrets
- Check the Console tab for error messages
- Verify database is running (should be automatic)

### Authentication not working:
- Verify `JWT_SECRET` is set correctly
- Restart the application after setting secrets

### Email notifications not working:
- Check SMTP credentials are correct
- Ensure SMTP port is not blocked (use 587 or 465)
- For Gmail, use an App Password, not your regular password

## 📚 Documentation

See `README.md` for comprehensive documentation including:
- API endpoints
- WebSocket events
- Database schema details
- Testing instructions
- User guides for each role

## ✅ Setup Complete!

Once you set the `JWT_SECRET`, your Symposium Management System is ready to use!

Next steps:
1. Set JWT_SECRET in Secrets
2. Create your first Super Admin user
3. Login and start creating events!
