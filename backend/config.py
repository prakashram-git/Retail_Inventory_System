import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
# Use absolute path for database to avoid write permission issues
DB_PATH = os.path.expanduser("~/retail_inventory.db")
# Disable WAL mode and set proper SQLite options for async
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}?timeout=20&check_same_thread=False"
SQLALCHEMY_ECHO = False

SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Default admin credentials - should be changed on first login
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"
