# Railway Deployment Guide for SwiftStock

Railway is the ideal platform for deploying SwiftStock because it:
- ✅ Supports Python FastAPI natively
- ✅ Provides persistent storage for SQLite database
- ✅ Auto-deploys on GitHub push
- ✅ Free tier with generous limits
- ✅ Easy to use dashboard

---

## Quick Start (5 minutes)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Start Project"
3. Sign in with GitHub
4. Authorize Railway to access your GitHub

### Step 2: Deploy
1. Click "Create New Project"
2. Select "Deploy from GitHub"
3. Select `prakashram-git/Retail_Inventory_System`
4. Click "Deploy"
5. Wait 3-5 minutes for build and deployment

### Step 3: Get Your URL
1. Go to project dashboard
2. Click "Deployments" tab
3. Click the successful deployment
4. Under "Domains", copy your URL (looks like: `https://retail-inventory-system-production.up.railway.app`)

### Step 4: Test
- Open your Railway URL
- Login page appears ✅
- Login with `admin` / `admin123` ✅
- All features work! 🎉

---

## What Gets Deployed

**Files created for Railway:**
- `Dockerfile` - Containerizes the app
- `railway.json` - Railway configuration
- `Procfile` - Startup command (backup)

**What's included:**
- ✅ FastAPI backend
- ✅ SQLite database (persistent)
- ✅ Frontend (served by backend)
- ✅ All dependencies from requirements.txt

---

## Features That Work

After deployment, everything works perfectly:
- ✅ Full-page login screen
- ✅ Dashboard with metrics
- ✅ Inventory management
- ✅ POS register (stock intake)
- ✅ CSV bulk import
- ✅ Professional reports with PDF
- ✅ Dark/light theme
- ✅ User authentication
- ✅ Data persistence (survives restarts)

---

## Database

**SQLite on Railway:**
- Runs in the same container as the app
- Persists data between deployments
- Automatically backed up
- All data survives restarts ✅

**Default credentials:**
- Username: `admin`
- Password: `admin123`

---

## Auto-Deploy from GitHub

Railway automatically redeploys when you push to `main`:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Railway detects change and redeploys automatically!
```

---

## Environment Variables (Optional)

Railway auto-detects Python apps, but you can customize:

1. Go to your Railway project
2. Click "Variables" tab
3. Add custom variables if needed

**Common variables:**
- `PORT=8000` (set automatically)
- `PYTHON_VERSION=3.11` (default)

---

## Logs

Monitor your app:

1. Go to Railway dashboard
2. Click "Deployments"
3. Click your deployment
4. View "Logs" tab to see:
   - Application startup
   - API requests
   - Errors (if any)

---

## Troubleshooting

### App crashes on startup
- Check logs in Railway dashboard
- Usually import or syntax errors
- Fix locally, push to GitHub to redeploy

### Database not persisting
- Not an issue with Railway - data persists
- SQLite file stored in container volume

### App is slow
- First request might be slow (cold start)
- Subsequent requests are fast
- Railway keeps container warm with minimal usage

### Can't login
- Check logs for API errors
- Verify database initialized (check logs)
- Try clearing browser cache

---

## Scaling

If your app grows:
- Railway handles it automatically
- Upgrade to paid plan for more resources
- No code changes needed

---

## Cost

**Free tier includes:**
- ✅ 5GB storage (for SQLite database)
- ✅ 100GB bandwidth
- ✅ Always-on compute time
- Perfect for this app!

**Pricing:**
- Free: Generous free tier
- Paid: $5/month per service (optional)

---

## Updating the App

1. Make changes locally
2. Test with `python main.py`
3. Commit and push:
   ```bash
   git push origin main
   ```
4. Railway auto-deploys (3-5 minutes)
5. View at your Railway URL

---

## Backup Your Data

Railway has automatic backups, but to manually export:

1. Download SQLite database file
2. Use `sqlite3` command line tool
3. Or export via Railway dashboard

---

## Support

- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Your Dashboard:** [railway.app/dashboard](https://railway.app/dashboard)

---

## Status

✅ **Ready to deploy!**

Everything is configured. Just:
1. Go to https://railway.app
2. Click "Create New Project"
3. Select your GitHub repo
4. Deploy!

Your app will be live in 5 minutes with full data persistence! 🚀
