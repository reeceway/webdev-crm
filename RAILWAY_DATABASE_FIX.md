# Railway Database Fix - Deployment Guide

## Problem Summary
The application was failing on Railway with `SQLITE_CANTOPEN` error because:
1. The retry logic wasn't properly awaiting delays between connection attempts
2. Railway volumes take time to mount after container startup
3. Early database integrity checks were happening before the volume was ready

## Changes Made

### 1. Fixed Async/Await in Retry Logic
**File**: `backend/src/index.js`

- Converted `connectWithRetry` to an async function
- Properly imported and awaited `setTimeout` from `timers/promises`
- Wrapped the function call in an async IIFE with proper error handling
- Increased retry attempts from 5 to 10
- Increased delay between retries from 1s to 2s (total wait time: up to 20 seconds)

### 2. Removed Premature Database Access
- Removed early database integrity check that happened before retry logic
- This check was trying to access the database before Railway's volume was mounted

### 3. Added .dockerignore
- Optimizes Docker build by excluding unnecessary files
- Reduces image size and build time

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Fix: Resolve Railway database connection issues with proper async retry logic"
git push origin main
```

### Step 2: Railway Will Auto-Deploy
Railway should automatically detect the changes and trigger a new deployment.

### Step 3: Monitor Deployment Logs
1. Go to your Railway dashboard
2. Click on your service
3. Go to the "Deployments" tab
4. Watch the logs for the new deployment

### Expected Log Output (Success)
You should see logs similar to:
```
[inf] Mounting volume on: /var/lib/containers/railwayapp/bind-mounts/.../vol_...
[inf] Starting Container
[inf] Database path configured
[inf] Attempting database connection (attempt 1/10)
[inf] ✅ Database connection successful
[inf] WebDev CRM API started
```

### Step 4: Verify Health Check
Once deployed, test the health endpoint:
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-06T...",
  "env": "production",
  "database": "connected"
}
```

## Troubleshooting

### If the deployment still fails:

#### 1. Check Volume Configuration
In Railway dashboard:
- Go to your service → Settings → Volumes
- Verify volume is mounted at `/app/data`
- Volume should have at least 1GB space

#### 2. Check Environment Variables
Ensure these are set in Railway:
- `NODE_ENV=production`
- `DATABASE_PATH=/app/data/crm.db` (should be set automatically by Dockerfile)

#### 3. Increase Retry Parameters
If Railway's volume is taking longer to mount, you can increase retries:

Edit `backend/src/index.js` line 95:
```javascript
async function connectWithRetry(dbPath, maxRetries = 20, delayMs = 3000) {
```

This would give up to 60 seconds for the volume to mount.

#### 4. Manual Database Initialization
If the database file is corrupted or missing:

1. SSH into Railway container (if available) or use Railway CLI:
```bash
railway run bash
```

2. Check database file:
```bash
ls -la /app/data/
```

3. If needed, manually initialize:
```bash
cd /app/backend
node -e "require('./src/database/init')"
```

#### 5. Check Railway Service Logs
Look for specific error patterns:
- `SQLITE_CANTOPEN` - Volume not mounted or permissions issue
- `SQLITE_CORRUPT` - Database file is corrupted
- `ENOENT` - Directory doesn't exist

## Rollback Plan
If issues persist, you can rollback to a previous deployment:
1. Go to Railway dashboard → Deployments
2. Find a working deployment
3. Click "Redeploy"

## Additional Optimizations

### Enable Railway Persistent Logs
Add to `railway.json`:
```json
{
  "deploy": {
    "volumes": ["/app/data"],
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "numReplicas": 1,
    "startCommand": "node src/index.js"
  }
}
```

### Add Startup Delay (if needed)
If Railway needs more time before health checks, add to Dockerfile:
```dockerfile
CMD ["sh", "-c", "sleep 5 && node src/index.js"]
```

## Success Indicators
✅ Container starts without errors
✅ Database connection succeeds within 10 retries
✅ Health check returns `"database": "connected"`
✅ API endpoints respond correctly
✅ No restart loops in Railway logs

## Next Steps After Successful Deployment
1. Test API endpoints
2. Verify data persistence across restarts
3. Monitor application performance
4. Set up automated backups for the database volume
