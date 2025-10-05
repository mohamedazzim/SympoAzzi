# Vercel Deployment Guide

## Overview
This guide covers deploying the BootFeet 2K26 Symposium Management System to Vercel with your Neon PostgreSQL database.

---

## Prerequisites

- Vercel account (free or pro)
- Neon database already set up
- GitHub repository with your code
- Basic knowledge of Vercel dashboard

---

## Step 1: Prepare Your Project

### 1.1 Update Build Configuration

The project already has the correct build configuration, but verify:

**package.json** should have:
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

### 1.2 Create vercel.json

Create `vercel.json` in project root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## Step 2: Connect to Neon Database

### 2.1 Get Your Neon Connection String

From your Neon dashboard, copy your connection string:
```
postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST.neon.tech/neondb?sslmode=require
```

⚠️ **SECURITY**: Never commit this to GitHub!

### 2.2 Set Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| DATABASE_URL | `postgresql://neondb_owner:...` | Production, Preview, Development |
| JWT_SECRET | Your JWT secret (64+ characters) | Production, Preview, Development |
| NODE_ENV | `production` | Production |
| NODE_ENV | `preview` | Preview |

#### Optional (for email notifications):
| Variable Name | Example Value |
|---------------|---------------|
| SMTP_HOST | `smtp.gmail.com` |
| SMTP_PORT | `587` |
| SMTP_USER | `your-email@gmail.com` |
| SMTP_PASS | `your-app-password` |
| SMTP_FROM | `BootFeet 2K26 <noreply@bootfeet.com>` |

---

## Step 3: Deploy to Vercel

### Method 1: Via Vercel Dashboard

1. **Login to Vercel**: Go to [vercel.com](https://vercel.com)
2. **Import Project**: Click "Add New" → "Project"
3. **Connect GitHub**: 
   - Select your repository
   - Grant necessary permissions
4. **Configure Project**:
   - Framework Preset: Other
   - Root Directory: `./` (leave as root)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. **Deploy**: Click "Deploy"

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

---

## Step 4: Initialize Database Schema

After deployment, you need to push the database schema to your Neon database.

### Option 1: From Local Machine

```bash
# Set your Neon database URL
export DATABASE_URL="postgresql://neondb_owner:..."

# Push schema
npm run db:push
```

### Option 2: Via Vercel CLI

```bash
# Run command in Vercel environment
vercel env pull .env.local

# Then run db:push with the downloaded env
npm run db:push
```

### Option 3: Custom Script

Add this to `package.json`:
```json
{
  "scripts": {
    "postbuild": "npm run db:push || true"
  }
}
```

⚠️ **Note**: This will attempt to push schema after every build. Use with caution.

---

## Step 5: Seed the Database (Optional)

If you want to populate with sample data:

```bash
# From local machine
export DATABASE_URL="your-neon-url"
export JWT_SECRET="your-jwt-secret"

npm run seed
```

Or create a seed script:
```json
{
  "scripts": {
    "seed": "tsx server/seed.ts"
  }
}
```

---

## Step 6: Configure Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

---

## Step 7: Verify Deployment

### 7.1 Check Deployment Status

- Go to Vercel Dashboard → Your Project → Deployments
- Click on the latest deployment
- Check build logs for errors

### 7.2 Test the Application

1. Open your Vercel URL (e.g., `your-app.vercel.app`)
2. Verify login page loads
3. Test authentication with seeded credentials:
   - Username: `superadmin`
   - Password: `admin123`

### 7.3 Test Database Connection

Check Vercel function logs:
```bash
vercel logs --follow
```

---

## Troubleshooting

### Build Fails

**Error**: `tsx: command not found`
**Solution**: Ensure `tsx` is in `dependencies`, not `devDependencies`

```json
{
  "dependencies": {
    "tsx": "^4.20.5"
  }
}
```

### Database Connection Fails

**Error**: `Connection refused` or `SSL error`

**Solutions**:
1. Verify DATABASE_URL includes `?sslmode=require`
2. Check Neon database is not paused (Neon auto-pauses after inactivity)
3. Verify connection string is correct
4. Check Neon connection pooling is enabled

### Serverless Function Timeout

**Error**: `FUNCTION_INVOCATION_TIMEOUT`

Vercel free tier: 10s timeout
Vercel Pro tier: 60s timeout

**Solution**: Optimize queries or upgrade to Pro plan

### Environment Variables Not Loading

**Solution**:
1. Verify variables are set for correct environment (Production/Preview)
2. Redeploy after adding new variables
3. Check variable names match exactly (case-sensitive)

---

## Optimization for Vercel

### 1. Connection Pooling

Add to `server/db.ts`:
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Use HTTP connection for Vercel serverless
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

### 2. Serverless-Friendly WebSocket

Vercel doesn't support WebSockets in serverless functions. Options:

**Option A**: Use Ably or Pusher for real-time features
**Option B**: Use Vercel Edge Functions (limited support)
**Option C**: Deploy WebSocket server separately (see next section)

⚠️ **Important**: WebSocket features will NOT work on Vercel by default.

### 3. Static File Serving

Ensure frontend is properly built:
```bash
vite build
```

Output goes to `dist/public` and is served automatically.

---

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch (production)
- Create a PR (preview deployment)

### Configure Branch Deployments

In Vercel Dashboard → Project → Settings → Git:
- Production Branch: `main` or `master`
- Preview Branches: All branches
- Ignored Build Step: Configure if needed

---

## Monitoring and Logs

### View Logs

```bash
# Follow logs in real-time
vercel logs --follow

# View specific deployment logs
vercel logs <deployment-url>
```

### Performance Monitoring

1. Go to Vercel Dashboard → Your Project → Analytics
2. Monitor:
   - Response times
   - Error rates
   - Traffic patterns

### Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for comprehensive monitoring

---

## Database Backups

### Neon Automatic Backups

Neon automatically backs up your database. To restore:

1. Go to Neon Console
2. Select your project
3. Go to "Backups" tab
4. Choose a backup point
5. Restore to new branch or current branch

### Manual Backups

```bash
# Export database
pg_dump "postgresql://neondb_owner:...@...neon.tech/neondb" > backup.sql

# Import database
psql "postgresql://neondb_owner:...@...neon.tech/neondb" < backup.sql
```

---

## Scaling Considerations

### Neon Database

- Free tier: 0.5 GB storage, shared compute
- Pro tier: More storage, dedicated compute, connection pooling

### Vercel Hosting

- Hobby: 100 GB bandwidth/month
- Pro: 1 TB bandwidth/month, priority support

### When to Upgrade

Consider upgrading when:
- Traffic exceeds free tier limits
- Need faster response times
- Require WebSocket support
- Need longer function timeouts

---

## Security Checklist

- ✅ Environment variables set (never in code)
- ✅ JWT_SECRET is strong (64+ characters)
- ✅ Database uses SSL (sslmode=require)
- ✅ No sensitive data in git
- ✅ CORS configured properly
- ✅ Rate limiting enabled (if needed)
- ✅ Neon IP allowlist configured (optional)

---

## Cost Estimation

### Vercel Costs
- Hobby (Personal): Free
  - 100 GB bandwidth
  - Unlimited deployments
  - 10s function timeout
  
- Pro: $20/month per member
  - 1 TB bandwidth
  - 60s function timeout
  - Priority support

### Neon Costs
- Free Tier: $0
  - 0.5 GB storage
  - Shared compute
  - Auto-suspend after inactivity
  
- Pro: Starting at $19/month
  - More storage
  - Dedicated compute
  - Always-on database

**Estimated Monthly Cost for Production**:
- Small app: $0 (both free tiers)
- Medium app: $39 (Vercel Pro + Neon Pro)
- Large app: $100+ (need to scale both)

---

## Alternative: Deploy WebSocket Server Separately

Since Vercel doesn't support WebSockets well, consider:

1. **Deploy main app to Vercel** (REST API + Frontend)
2. **Deploy WebSocket server to Render/Railway/Fly.io**
3. **Update frontend to connect to separate WebSocket URL**

See `COLLEGE_SERVER_DEPLOYMENT.md` for self-hosted options.

---

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- Project Issues: Check GitHub repository

---

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Initialize database schema
3. ✅ Seed sample data
4. ✅ Test thoroughly
5. ✅ Set up monitoring
6. ✅ Configure custom domain
7. ✅ Set up CI/CD (automated via Vercel)

Your Symposium Management System is now live on Vercel! 🚀
