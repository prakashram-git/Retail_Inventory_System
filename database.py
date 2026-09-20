from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_PATH = Path(__file__).resolve().parent / "database.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DATABASE_PATH}"

engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    from models import Base as ModelBase

    async with engine.begin() as connection:
        await connection.run_sync(ModelBase.metadata.create_all)
        columns = await connection.exec_driver_sql("PRAGMA table_info(store_configuration)")
        existing_columns = {row[1] for row in columns}
        if "theme" not in existing_columns:
            await connection.exec_driver_sql(
                "ALTER TABLE store_configuration ADD COLUMN theme VARCHAR DEFAULT 'dark'"
            )
