# Complete Deployment Guide for BootFeet 2K26

## 🎯 Quick Start Overview

This guide covers deploying your Symposium Management System to:
1. **Vercel** (Cloud) - with your Neon database for participant registration
2. **College Server** (Local) - for fast, offline-capable access

---

## 📁 Documentation Files Created

### 1. Database Documentation
- **File**: `docs/DATABASE_STRUCTURE.md`
- **Purpose**: Complete reference for all database tables, relationships, and queries
- **Use for**: Understanding schema, writing queries, troubleshooting

### 2. Vercel Deployment
- **File**: `docs/VERCEL_DEPLOYMENT.md`
- **Purpose**: Step-by-step guide for deploying to Vercel cloud platform
- **Use for**: Cloud deployment with Neon database

### 3. College Server Deployment
- **File**: `docs/COLLEGE_SERVER_DEPLOYMENT.md`
- **Purpose**: Complete guide for setting up on your local college server
- **Use for**: Fast, offline-capable local deployment

### 4. Database Seed File
- **File**: `server/seed.ts` (already exists)
- **Purpose**: Populates database with sample data for testing
- **Use for**: Development, testing, demo setups

### 5. Vercel Configuration
- **File**: `vercel.json`
- **Purpose**: Vercel deployment configuration
- **Use for**: Automatic deployment settings

---

## 🔐 Security Warning

**YOU EXPOSED YOUR DATABASE CREDENTIALS!**

Your Neon database URL was shared in the message:
```
postgresql://neondb_owner:npg_skX6jIpf0ziD@ep-bold-math-...
```

### IMMEDIATE ACTIONS REQUIRED:

1. **Go to Neon Console**: https://console.neon.tech
2. **Reset your password**: 
   - Go to your project → Settings → Connection Details
   - Click "Reset password"
   - Save the new connection string securely
3. **Never share DATABASE_URL again**: Always use environment variables
4. **Update all deployments** with the new connection string

---

## 📊 Database Setup

### Option 1: Using Neon Database (for both deployments)

**Advantages**:
- ✅ Shared database between Vercel and college server
- ✅ Automatic backups
- ✅ Scalable
- ✅ Easy to manage

**Connection String Format**:
```
postgresql://neondb_owner:PASSWORD@HOST.neon.tech/neondb?sslmode=require
```

### Option 2: Separate Databases

**Scenario**: Different database for Vercel vs College Server

| Deployment | Database | Why |
|------------|----------|-----|
| Vercel | Neon (Cloud) | Fast access from Vercel servers |
| College Server | Local PostgreSQL | Offline capability, speed |

**Data Sync**: If using separate databases, you'll need to:
1. Export from one: `pg_dump SOURCE_URL > data.sql`
2. Import to other: `psql TARGET_URL < data.sql`

---

## 🌱 Database Seeding

### Running the Seed File

The seed file (`server/seed.ts`) creates:
- ✅ Super admin account
- ✅ Event admin accounts
- ✅ Registration committee accounts
- ✅ Sample events (Technical & Non-Technical)
- ✅ Sample rounds with questions
- ✅ Test participants
- ✅ Registration forms

### How to Run

#### Method 1: Direct Execution
```bash
# Set your database URL
export DATABASE_URL="your-neon-or-local-db-url"
export JWT_SECRET="your-jwt-secret"

# Run seed
tsx server/seed.ts
```

#### Method 2: Add to package.json
Add this script to `package.json`:
```json
{
  "scripts": {
    "seed": "tsx server/seed.ts"
  }
}
```

Then run:
```bash
npm run seed
```

#### Method 3: From Replit
Simply run in the Shell:
```bash
tsx server/seed.ts
```

### Test Credentials After Seeding

```
Super Admin:
  Username: superadmin
  Password: admin123

Event Admin:
  Username: eventadmin1
  Password: admin123

Registration Committee:
  Username: regcommittee1
  Password: admin123

Participants:
  Username: webdev-john-001 (and more)
  Password: Various
```

---

## 🚀 Deployment Options Comparison

| Feature | Vercel (Cloud) | College Server (Local) |
|---------|---------------|------------------------|
| **Setup Time** | 15 minutes | 2-4 hours |
| **Cost** | Free tier available | Hardware one-time cost |
| **Speed** | Good (internet-dependent) | Excellent (LAN speed) |
| **Offline** | ❌ Requires internet | ✅ Works offline |
| **WebSocket** | ⚠️ Limited support | ✅ Full support |
| **Maintenance** | Automatic | Manual |
| **Data Control** | Cloud-hosted | Full control |
| **Scalability** | Automatic | Manual scaling needed |
| **Best For** | Public access, registration | Tests, local events |

---

## 📋 Deployment Checklist

### For Vercel Deployment

- [ ] Read `docs/VERCEL_DEPLOYMENT.md`
- [ ] Create Vercel account
- [ ] Reset Neon database password (security!)
- [ ] Connect GitHub repository to Vercel
- [ ] Set environment variables in Vercel:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `NODE_ENV=production`
- [ ] Deploy to Vercel
- [ ] Run database migration: `npm run db:push`
- [ ] Run seed file (optional): `npm run seed`
- [ ] Test login and features
- [ ] Configure custom domain (optional)

### For College Server Deployment

- [ ] Read `docs/COLLEGE_SERVER_DEPLOYMENT.md`
- [ ] Prepare server hardware
- [ ] Install Ubuntu Server 22.04 LTS
- [ ] Install Node.js, PostgreSQL, PM2, Nginx
- [ ] Clone repository to `/var/www/symposium-app`
- [ ] Configure PostgreSQL database
- [ ] Set up `.env` file with credentials
- [ ] Run database migration: `npm run db:push`
- [ ] Build application: `npm run build`
- [ ] Configure PM2 process manager
- [ ] Configure Nginx reverse proxy
- [ ] Set up firewall (UFW)
- [ ] Configure static IP
- [ ] Run seed file (optional): `npm run seed`
- [ ] Test from client machines
- [ ] Set up automated backups
- [ ] Document server details for IT team

---

## 🔄 Hybrid Setup (Recommended)

**Best of Both Worlds**: Use both deployments!

### Registration Phase
- **Use**: Vercel deployment
- **Why**: Public access, participants register from anywhere
- **Database**: Neon (shared)

### Testing/Event Phase
- **Use**: College Server deployment
- **Why**: Fast, reliable, offline-capable for actual tests
- **Database**: Sync from Neon or use local PostgreSQL

### Data Flow
```
Registration (Vercel + Neon)
         ↓
   [Data Sync]
         ↓
Testing/Event (College Server + Local/Synced DB)
```

---

## 🛠️ Common Commands Reference

### Database Commands
```bash
# Push schema to database
npm run db:push

# Force push (if data loss warning)
npm run db:push --force

# Seed database with sample data
tsx server/seed.ts

# Backup database
pg_dump DATABASE_URL > backup.sql

# Restore database
psql DATABASE_URL < backup.sql
```

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type check
npm run check

# WebSocket stress test
npm run test:websocket
```

### Deployment Commands
```bash
# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# PM2 commands (for college server)
pm2 start ecosystem.config.js
pm2 status
pm2 logs
pm2 restart symposium-app
```

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error**: `Connection refused` or `SSL error`

**Solutions**:
1. Verify DATABASE_URL is correct
2. Check database is running (Neon: check console, Local: `sudo systemctl status postgresql`)
3. Ensure `?sslmode=require` is in Neon URLs
4. Test connection: `psql DATABASE_URL`

### Build Failures

**Error**: `tsx: command not found`

**Solution**: Ensure tsx is in `dependencies`, not `devDependencies`

### WebSocket Not Working

**On Vercel**: 
- ⚠️ Vercel has limited WebSocket support
- Consider: Use Ably/Pusher or deploy WebSocket server separately

**On College Server**:
- Check Nginx WebSocket configuration
- Verify PM2 is running
- Test with: `curl -i -N -H "Connection: Upgrade" http://localhost:5000/socket.io/`

### Port Already in Use

**Error**: `EADDRINUSE: address already in use 0.0.0.0:5000`

**Solution**:
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 PID

# Or kill by name
pkill -f "tsx server/index.ts"
```

---

## 📞 Support Resources

### Documentation
- `docs/DATABASE_STRUCTURE.md` - Database reference
- `docs/VERCEL_DEPLOYMENT.md` - Vercel guide
- `docs/COLLEGE_SERVER_DEPLOYMENT.md` - Local server guide
- `README.md` - Project overview and features
- `SETUP.md` - Initial setup instructions

### External Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [Nginx Documentation](https://nginx.org/en/docs)

---

## 🎓 Your Deployment Strategy

Based on your requirements:

### Phase 1: Registration (Cloud)
1. Deploy to Vercel with Neon database
2. Public registration forms accessible from anywhere
3. Collect participant information
4. Generate credentials

### Phase 2: Event/Testing (Local)
1. Deploy to college server
2. Sync data from Neon to local PostgreSQL
3. Fast, reliable test environment
4. No internet dependency during tests

### Phase 3: Results & Analytics (Hybrid)
1. Sync results back to Neon (optional)
2. Cloud backup and analytics on Vercel
3. Local archives on college server

---

## ✅ Next Steps

1. **Secure Your Database**: Reset Neon password immediately
2. **Choose Deployment**: Vercel, College Server, or both
3. **Follow Guides**: Use the appropriate documentation file
4. **Test Thoroughly**: Verify all features work
5. **Set Up Monitoring**: CloudWatch (Vercel) or logs (college server)
6. **Document Everything**: Keep notes for your IT team
7. **Train Your Team**: Super admins, event admins, reg committee

---

## 🎉 You're Ready!

You now have:
- ✅ Comprehensive database documentation
- ✅ Vercel deployment guide
- ✅ College server deployment guide
- ✅ Seed data for testing
- ✅ Security best practices
- ✅ Troubleshooting help

**Good luck with your symposium! 🚀**
