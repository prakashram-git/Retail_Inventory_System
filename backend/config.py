import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Detect if running on Vercel (serverless environment)
IS_VERCEL = os.getenv("VERCEL") == "1"

if IS_VERCEL:
    # Use in-memory database on Vercel (no persistent storage)
    DATABASE_URL = "sqlite+aiosqlite:///:memory:?timeout=20&check_same_thread=False"
else:
    # Use file-based database locally
    DB_PATH = os.path.expanduser("~/retail_inventory.db")
    DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}?timeout=20&check_same_thread=False"

SQLALCHEMY_ECHO = False

SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Default admin credentials - should be changed on first login
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"
