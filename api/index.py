import sys
import asyncio
from pathlib import Path

# Setup path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Import routes
from backend.routes import auth, inventory, pos, reports, settings
from backend.database import init_db

# Create app WITHOUT lifespan
app = FastAPI(
    title="SwiftStock",
    description="Retail Inventory Management System",
    version="1.0.0"
)

# Initialize DB on first request
class DBInitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        await init_db()
        response = await call_next(request)
        return response

app.add_middleware(DBInitMiddleware)
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
try:
    if index_html_path.exists():
        with open(index_html_path, 'r', encoding='utf-8') as f:
            INDEX_HTML = f.read()
except Exception as e:
    print(f"Error reading index.html: {e}")

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
