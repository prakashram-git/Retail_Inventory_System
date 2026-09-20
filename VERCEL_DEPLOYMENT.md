# Vercel Deployment Guide for SwiftStock

## ⚠️ Important Considerations

**Vercel is a serverless platform with some limitations for this app:**
- ✅ Frontend (HTML, JS, CSS) - Works perfectly
- ✅ API endpoints - Work as serverless functions
- ⚠️ SQLite Database - **Does NOT persist between requests** (serverless containers are ephemeral)

**This deployment is best for:**
- Demo/testing purposes
- Frontend showcase
- API testing
- Learning/evaluation

**For production, consider:**
- Railway.app (supports persistent storage)
- Render.com (better for Python apps)
- DigitalOcean App Platform
- AWS EC2 with persistent storage

---

## Quick Deployment to Vercel

### Prerequisites
1. GitHub repository set up (✅ Already done)
2. Vercel account (free at vercel.com)

### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository: `prakashram-git/Retail_Inventory_System`
5. Click "Import"

### Step 2: Configure (Optional)

Vercel will auto-detect the configuration from `vercel.json`

**Environment Variables** (optional):
- No environment variables required for basic deployment
- Database will reset on each deployment

### Step 3: Deploy

1. Click "Deploy"
2. Wait for build to complete (usually 2-3 minutes)
3. Get your deployment URL
4. Access your app at `https://your-deployment.vercel.app`

### Step 4: Test

- Go to `https://your-deployment.vercel.app`
- Full-page login screen appears
- Login with default credentials:
  - Username: `admin`
  - Password: `admin123`
- All features work (inventory, reports, CSV import, etc.)

---

## File Changes for Vercel

**New files created:**
- `vercel.json` - Vercel configuration
- `api/index.py` - Serverless entry point
- `VERCEL_DEPLOYMENT.md` - This file

**How it works:**
1. `vercel.json` tells Vercel how to build and route requests
2. Python API requests → `api/index.py` (serverless function)
3. Frontend requests → `frontend/` (static files)
4. Database → SQLite (ephemeral, resets on restart)

---

## Using the Deployed App

### Basic Features
- ✅ Dashboard with metrics
- ✅ Inventory management (add/view products)
- ✅ POS register (stock intake, CSV import)
- ✅ Reports with PDF export
- ✅ Dark/light theme
- ✅ Login/logout

### Database Behavior
- **First load**: Database initialized with default admin account
- **After logout/restart**: Database resets (all data lost)
- **Add data**: Works fine during session, lost on restart
- **Demo mode**: Perfect for showing features, not for storing data

---

## Updating Deployment

After making changes locally:

```bash
git add .
git commit -m "Update changes"
git push origin main
```

Vercel automatically redeploys when you push to `main` branch.

---

## Troubleshooting

### "Database not found" error
- Normal for serverless - database initializes on first request
- Reload the page

### "Build failed" error
- Check Vercel build logs
- Ensure all Python dependencies in `requirements.txt`
- Verify `api/index.py` syntax

### App crashes after logout
- Normal behavior - Vercel containers don't persist SQLite
- Reload page to reinitialize database

### Very slow first load
- First request is slower (cold start of serverless function)
- Subsequent requests are faster

---

## Upgrading to Production Database

To make the app production-ready:

1. **Switch from SQLite to PostgreSQL:**
   - Sign up at ElephantSQL, Neon, or Supabase
   - Get database URL
   - Update `backend/database.py` to use PostgreSQL connection string
   - Set `DATABASE_URL` environment variable in Vercel dashboard

2. **Update database driver:**
   ```bash
   pip install psycopg2-binary
   # Update requirements.txt
   ```

3. **Redeploy** - Data now persists!

---

## Current Deployment Status

- **Frontend**: ✅ Ready for Vercel
- **API**: ✅ Ready for serverless
- **Database**: ⚠️ Ephemeral (for demo only)
- **Authentication**: ✅ Working
- **Features**: ✅ All working

---

## Support

For Vercel-specific questions:
- [Vercel Docs](https://vercel.com/docs)
- [FastAPI on Vercel](https://vercel.com/docs/runtimes/python)

For SwiftStock questions:
- See `CLAUDE.md` and `README.md`
- Check `/memory/` directory for feature details
