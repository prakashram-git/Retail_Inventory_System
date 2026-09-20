from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import pool, event
from backend.config import DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False, "timeout": 20},
    poolclass=pool.StaticPool
)

# Disable WAL mode for SQLite
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=DELETE")
    cursor.close()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

_db_initialized = False

async def init_db():
    global _db_initialized
    if _db_initialized:
        return

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Create default admin user if needed
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            from backend.models.user import User
            from backend.config import DEFAULT_USERNAME, DEFAULT_PASSWORD

            result = await db.execute(select(User).where(User.username == DEFAULT_USERNAME))
            user = result.scalars().first()
            if not user:
                user = User(username=DEFAULT_USERNAME, is_admin=True)
                user.set_password(DEFAULT_PASSWORD)
                db.add(user)
                await db.commit()

        _db_initialized = True
    except Exception as e:
        print(f"Database initialization error: {e}")
