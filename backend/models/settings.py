from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from backend.database import Base

class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String, default="SwiftStock Retail")
    store_logo_path = Column(String, nullable=True)
    theme = Column(String, default="dark")  # 'dark' or 'light'
    currency_symbol = Column(String, default="$")
    low_stock_threshold = Column(Integer, default=10)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
