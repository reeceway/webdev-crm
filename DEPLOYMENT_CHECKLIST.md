# Railway Deployment Checklist - MUST DO BEFORE DEPLOYMENT WORKS

## ⚠️ CRITICAL: Health Check is Failing Because Environment Variables Are Missing!

The app built successfully but won't start because it needs these environment variables configured in Railway.

---

## Step-by-Step Setup (IN ORDER!)

### Step 1: Set Environment Variables in Railway Dashboard

Go to Railway Dashboard → Your Service → **Variables** tab

#### REQUIRED Variables (App won't start without these):

```bash
# Database location (CRITICAL - app won't start without this)
DATABASE_PATH=/data/database/crm.db

# JWT Secret (CRITICAL - app won't start without this)
JWT_SECRET=generate-a-long-random-string-here-at-least-32-characters

# Node environment
NODE_ENV=production
PORT=3001
```

#### Generate JWT_SECRET:
```bash
# On Mac/Linux, run:
openssl rand -base64 64

# Or use any long random string (32+ characters)
```

#### Admin User Variables (RECOMMENDED - creates your first admin user):

```bash
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_NAME=Your Name
```

#### Optional Variables:

```bash
# CORS (recommended for production)
ALLOWED_ORIGINS=https://your-frontend-url.com

# Google Places API (only if using lead finder)
GOOGLE_PLACES_API_KEY=your-api-key-here
```

### Step 2: Add Volume for Database Persistence

1. Go to Railway Dashboard → Your Service → **Settings** tab
2. Scroll to **Volumes** section
3. Click **Add Volume**
4. Configure:
   - **Mount Path**: `/data/database`
   - **Size**: 1 GB (or more if needed)
5. Click **Save**

### Step 3: Redeploy

After setting environment variables and adding the volume:

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Monitor the logs

---

## Expected Logs After Successful Deployment

You should see:

```
Database not found, initializing...
🔧 Initializing database...
✅ Admin user created (your-email@example.com)
✅ Database initialized successfully!
WebDev CRM API started
```

**On second deployment** (after volume is persisted):

```
Database found
WebDev CRM API started
```

---

## Health Check Should Pass

After environment variables are set, the health check endpoint should return:

```bash
GET https://your-railway-url.up.railway.app/api/health

Response:
{
  "status": "ok",
  "timestamp": "2026-01-06T...",
  "env": "production",
  "database": "connected"
}
```

---

## Why Did Deployment Fail?

The app is trying to:
1. Create/connect to database at `DATABASE_PATH` → **Variable not set!**
2. Initialize JWT authentication with `JWT_SECRET` → **Variable not set!**
3. Start the Express server on `PORT` → **Blocked by missing variables**

Without these variables, the Node.js process exits immediately, so the health check can't reach the `/api/health` endpoint.

---

## Deployment Status Meanings

| Log Message | Meaning | Action Needed |
|-------------|---------|---------------|
| `Build time: 36.39 seconds` ✅ | Docker build succeeded | None - build is working |
| `Starting Healthcheck` ⏳ | Railway trying to check if app is running | Wait for next message |
| `Attempt #1 failed with service unavailable` ❌ | App not responding on port 3001 | Check environment variables! |
| `1/1 replicas never became healthy!` ❌ | App failed to start in 5 minutes | Set environment variables and redeploy |

---

## Quick Fix Steps

1. ✅ Go to Railway Dashboard → Variables
2. ✅ Add these THREE variables:
   ```
   DATABASE_PATH=/data/database/crm.db
   JWT_SECRET=your-random-string-here
   PORT=3001
   ```
3. ✅ Add ADMIN_EMAIL and ADMIN_PASSWORD
4. ✅ Go to Settings → Volumes → Add Volume at `/data/database`
5. ✅ Redeploy

The next deployment should succeed!

---

## How to View Actual Error Logs

In Railway Dashboard:
1. Go to **Deployments** tab
2. Click on the failed deployment
3. Look for logs showing actual Node.js errors
4. Common errors:
   - `DATABASE_PATH is not defined`
   - `JWT_SECRET is not defined`
   - `ENOENT: no such file or directory` (database directory not created)

---

## After Successful Deployment

1. Test the health endpoint
2. Login with your ADMIN_EMAIL and ADMIN_PASSWORD
3. Start using the CRM!

See `TEST_CUSTOMER_LIFECYCLE.md` for complete testing guide.
