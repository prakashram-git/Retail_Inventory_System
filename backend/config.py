import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = "sqlite+aiosqlite:///./retail_inventory.db"
SQLALCHEMY_ECHO = False

SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Default admin credentials - should be changed on first login
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"
