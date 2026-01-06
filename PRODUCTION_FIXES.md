# Production Deployment Fixes - Railway

## Issues Identified on https://webdev-crm-production.up.railway.app

### ✅ What's Working
- Health endpoint: `/api/health` ✓
- Frontend serving: React app loads ✓
- Audit functionality: `/api/audit/audit` works without auth ✓
- Database initialization on startup ✓

### ❌ Issues Fixed

#### 1. No Console Logs Visible in Railway
**Problem**: Railway logs weren't showing up properly because of simple console.log statements.

**Solution**:
- Created structured JSON logging utility at `backend/src/utils/logger.js`
- Logs now output in JSON format for better Railway log aggregation
- Added request/response logging middleware
- Enhanced health check to show environment and database status

#### 2. Limited Error Tracking
**Problem**: Errors weren't being logged with enough context.

**Solution**:
- All routes now use the logger utility
- Errors include request context (method, path, body)
- Request duration tracking added

## Changes Made

### New Files
1. **`backend/src/utils/logger.js`** - Production-ready structured logging
   - JSON formatted logs
   - Log levels: INFO, ERROR, WARN, DEBUG
   - Includes timestamps and metadata

### Modified Files
1. **`backend/src/index.js`**
   - Added request logging middleware
   - Enhanced health check endpoint
   - Better error logging
   - All console.log replaced with structured logger

2. **`backend/src/routes/leads.js`**
   - Added logger import
   - Improved error logging with context

## How to View Logs on Railway

### Option 1: Railway Dashboard (Recommended)
1. Go to https://railway.app/dashboard
2. Select your project: `webdev-crm`
3. Click on the deployment
4. Click "View Logs" tab
5. Logs now show structured JSON with timestamps

### Option 2: Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs
```

### Example Log Output
```json
{"level":"INFO","timestamp":"2026-01-06T01:00:00.000Z","message":"Request completed","method":"GET","path":"/api/leads","status":200,"duration":"45ms","ip":"::1"}
```

## Deployment Instructions

### Deploy to Railway
```bash
# Commit changes
git add .
git commit -m "Add structured logging for production

- Add JSON logger utility for Railway log aggregation
- Add request/response logging middleware
- Enhance health check endpoint with env/db status
- Improve error logging with context

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub (Railway auto-deploys)
git push origin main
```

### Verify Deployment
1. Wait 2-3 minutes for Railway to rebuild
2. Check health: https://webdev-crm-production.up.railway.app/api/health
3. Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-06T01:00:00.000Z",
  "env": "production",
  "database": "connected"
}
```

## Testing Search & Audit Features

### Test Audit (No Auth Required)
```bash
curl -X POST https://webdev-crm-production.up.railway.app/api/audit/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

### Test Leads Search (Auth Required)
1. Login to get token:
```bash
curl -X POST https://webdev-crm-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@webdevcrm.com","password":"admin123"}'
```

2. Use token to search leads:
```bash
curl https://webdev-crm-production.up.railway.app/api/leads?search=test \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Understanding Railway Logs

### Log Levels
- **INFO**: Normal operations (requests, startup)
- **ERROR**: Errors with full context
- **WARN**: Warnings
- **DEBUG**: Verbose info (only in development)

### Filtering Logs in Railway
- Search for `"level":"ERROR"` to find errors
- Search for `"path":"/api/leads"` for specific routes
- Search for `"status":500` for server errors

## Environment Variables Needed

Make sure these are set in Railway:
- `NODE_ENV=production` (should be auto-set)
- `JWT_SECRET` (for authentication)
- `PORT` (Railway sets this automatically)
- `DATABASE_PATH` (optional, defaults to `./database/crm.db`)

## Database Persistence

Your Railway volume is mounted at `/app/backend/database/` which persists the SQLite database across deployments.

To verify:
```bash
railway run ls -la /app/backend/database/
```

## Troubleshooting

### Logs not showing?
- Check Railway dashboard > Deployments > Logs tab
- Use `railway logs` CLI command
- Logs are now JSON formatted with timestamps

### Search not working?
- Ensure you're logged in (auth token required)
- Check browser console for errors
- Verify `/api/health` shows `"database":"connected"`

### Audit not working?
- No auth required for audit endpoint
- Check if the target website is accessible
- Look for `"level":"ERROR"` in Railway logs

## Next Steps

1. Monitor logs after deployment using Railway dashboard
2. Test all features with authentication
3. Set up proper JWT_SECRET in Railway environment variables
4. Consider adding monitoring/alerting for errors

## Support

If issues persist:
1. Check Railway logs for `"level":"ERROR"`
2. Verify environment variables are set
3. Check database volume is mounted correctly
4. Review the health endpoint response
