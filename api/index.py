import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from backend.database import init_db
from backend.routes import auth, inventory, pos, reports, settings

app = FastAPI(
    title="SwiftStock",
    description="Retail Inventory Management System",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    try:
        await init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {e}")
        import traceback
        traceback.print_exc()

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

@app.get("/static/{file_path:path}")
async def serve_static(file_path: str):
    """Serve static files from frontend directory"""
    file_location = frontend_dir / file_path
    if file_location.exists() and file_location.is_file():
        with open(file_location, 'r', encoding='utf-8') as f:
            content = f.read()

        # Determine content type
        if file_path.endswith('.js'):
            return HTMLResponse(content=content, media_type="application/javascript")
        elif file_path.endswith('.css'):
            return HTMLResponse(content=content, media_type="text/css")
        else:
            return HTMLResponse(content=content)

    return {"error": "File not found"}

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """Catch-all for SPA routing - serve index.html for non-API routes"""
    if full_path.startswith("api/"):
        return {"error": "Not found"}

    # Don't catch static files
    if full_path.startswith("static/"):
        return {"error": "Not found"}

    # Serve index.html for SPA routing
    if INDEX_HTML:
        return HTMLResponse(content=INDEX_HTML)
    return {"error": "Not found"}
