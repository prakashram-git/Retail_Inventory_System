import sys
import asyncio
from pathlib import Path

# Setup path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import HTMLResponse, JSONResponse
    from starlette.middleware.base import BaseHTTPMiddleware

    # Import routes
    from backend.routes import auth, inventory, pos, reports, settings
    from backend.database import init_db
except Exception as e:
    print(f"Import error: {e}")
    raise

# Create app WITHOUT lifespan
app = FastAPI(
    title="SwiftStock",
    description="Retail Inventory Management System",
    version="1.0.0"
)

# Initialize DB on first request
class DBInitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            await init_db()
        except Exception as e:
            print(f"DB init error in middleware: {e}")

        try:
            response = await call_next(request)
            return response
        except Exception as e:
            print(f"Error in route handler: {e}")
            import traceback
            traceback.print_exc()
            return JSONResponse(
                status_code=500,
                content={"error": str(e), "detail": "Internal server error"}
            )

app.add_middleware(DBInitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with error handling
try:
    app.include_router(auth.router)
    app.include_router(inventory.router)
    app.include_router(pos.router)
    app.include_router(reports.router)
    app.include_router(settings.router)
except Exception as e:
    print(f"Router error: {e}")
    import traceback
    traceback.print_exc()

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

@app.get("/api/test")
async def test_api():
    """Test endpoint to verify API is working"""
    try:
        await init_db()
        return {"status": "ok", "message": "API working, database initialized"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": str(e)}
        )

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
        return JSONResponse(status_code=404, content={"error": "Not found"})
    if INDEX_HTML:
        return HTMLResponse(content=INDEX_HTML)
    return JSONResponse(status_code=404, content={"error": "Not found"})
