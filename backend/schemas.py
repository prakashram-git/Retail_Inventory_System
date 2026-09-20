from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ProductCreate(BaseModel):
    name: str
    category: str
    unit_price: float
    cost_price: float
    sku: Optional[str] = Field(None, description="Product SKU (auto-generated if omitted)")
    description: Optional[str] = None
    quantity_in_stock: int = 0
    reorder_level: int = 10

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None
    reorder_level: Optional[int] = None

class StockAdjustment(BaseModel):
    quantity: int
    notes: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    category: str
    description: Optional[str]
    unit_price: float
    cost_price: float
    quantity_in_stock: int
    reorder_level: int
    status: str

    class Config:
        from_attributes = True

class AppSettingsUpdate(BaseModel):
    store_name: Optional[str] = None
    theme: Optional[str] = None
    currency_symbol: Optional[str] = None
    low_stock_threshold: Optional[int] = None

class AppSettingsResponse(BaseModel):
    store_name: str
    theme: str
    currency_symbol: str
    low_stock_threshold: int

    class Config:
        from_attributes = True
