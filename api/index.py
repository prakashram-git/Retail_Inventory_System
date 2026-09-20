import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

# Initialize database first
from backend.database import init_db, AsyncSessionLocal
from backend.models.user import User
from backend.config import DEFAULT_USERNAME, DEFAULT_PASSWORD
import asyncio

# Run async init in sync context for app startup
try:
    asyncio.run(init_db())
except Exception as e:
    print(f"Warning: Could not initialize DB: {e}")

# Now import routes
from backend.routes import auth, inventory, pos, reports, settings

app = FastAPI(
    title="SwiftStock",
    description="Retail Inventory Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(pos.router)
app.include_router(reports.router)
app.include_router(settings.router)

# Serve frontend
frontend_dir = Path(__file__).parent.parent / "frontend"
index_html_path = frontend_dir / "index.html"

INDEX_HTML = None
if index_html_path.exists():
    with open(index_html_path, 'r', encoding='utf-8') as f:
        INDEX_HTML = f.read()

@app.get("/")
async def root():
    if INDEX_HTML:
        return HTMLResponse(content=INDEX_HTML)
    return {"message": "SwiftStock API"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if full_path.startswith("api/"):
        return {"error": "Not found"}
    if INDEX_HTML:
        return HTMLResponse(content=INDEX_HTML)
    return {"error": "Not found"}
