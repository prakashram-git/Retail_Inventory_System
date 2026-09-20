import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.wsgi import WSGIMiddleware

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import init_db, AsyncSessionLocal
from backend.models.user import User
from backend.config import DEFAULT_USERNAME, DEFAULT_PASSWORD
from backend.routes import auth, inventory, pos, reports, settings

@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(pos.router)
app.include_router(reports.router)
app.include_router(settings.router)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/health")
async def api_health():
    return {"status": "ok", "service": "SwiftStock API"}
