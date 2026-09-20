import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

# Get proper paths
CURRENT_DIR = Path(__file__).parent
PROJECT_ROOT = CURRENT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from backend.database import init_db, AsyncSessionLocal
    from backend.models.user import User
    from backend.config import DEFAULT_USERNAME, DEFAULT_PASSWORD
    from backend.routes import auth, inventory, pos, reports, settings
except ImportError as e:
    print(f"Import error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()

        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.username == DEFAULT_USERNAME))
            user = result.scalars().first()
            if not user:
                user = User(username=DEFAULT_USERNAME, is_admin=True)
                user.set_password(DEFAULT_PASSWORD)
                db.add(user)
                await db.commit()
    except Exception as e:
        print(f"Lifespan initialization error: {e}")

    yield

app = FastAPI(
    title="SwiftStock",
    description="Retail Inventory Management System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    app.include_router(auth.router)
    app.include_router(inventory.router)
    app.include_router(pos.router)
    app.include_router(reports.router)
    app.include_router(settings.router)
except Exception as e:
    print(f"Router inclusion error: {e}")

# Paths
frontend_dir = PROJECT_ROOT / "frontend"
index_html_path = frontend_dir / "index.html"

# Read index.html at startup
INDEX_HTML_CONTENT = None
if index_html_path.exists():
    try:
        with open(index_html_path, 'r', encoding='utf-8') as f:
            INDEX_HTML_CONTENT = f.read()
    except Exception as e:
        print(f"Error reading index.html: {e}")

@app.get("/")
async def read_root():
    """Serve index.html for SPA routing"""
    if INDEX_HTML_CONTENT:
        return HTMLResponse(content=INDEX_HTML_CONTENT)
    return {"message": "SwiftStock API running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/health")
async def api_health():
    return {"status": "ok", "service": "SwiftStock API"}

# Catch-all route for SPA - serves index.html for any unknown routes
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """Serve index.html for all non-API routes to support SPA routing"""
    # Don't intercept actual API calls
    if full_path.startswith("api/"):
        return {"error": "Endpoint not found"}

    # Serve index.html for all other routes
    if INDEX_HTML_CONTENT:
        return HTMLResponse(content=INDEX_HTML_CONTENT)
    return {"error": "Frontend not found"}
