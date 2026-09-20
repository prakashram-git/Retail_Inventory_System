from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.inventory import Product, StockTransaction, StockStatus
from backend.schemas import ProductCreate, ProductResponse, StockAdjustment
from backend.auth import get_current_user

router = APIRouter(prefix="/api/pos", tags=["pos"])

def update_product_status(product: Product):
    if product.quantity_in_stock == 0:
        product.status = StockStatus.OUT_OF_STOCK
    elif product.quantity_in_stock <= product.reorder_level:
        product.status = StockStatus.LOW_STOCK
    else:
        product.status = StockStatus.IN_STOCK

@router.post("/create-product", response_model=ProductResponse)
async def create_product_pos(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).where(Product.sku == product_data.sku))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")

    product = Product(**product_data.model_dump())
    update_product_status(product)

    if product.quantity_in_stock > 0:
        transaction = StockTransaction(
            product_id=None,
            quantity_change=product.quantity_in_stock,
            transaction_type="inbound",
            notes="Initial stock from POS"
        )
        db.add(transaction)

    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.post("/add-to-product/{product_id}", response_model=ProductResponse)
async def add_stock_to_existing(
    product_id: int,
    adjustment: StockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if adjustment.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    product.quantity_in_stock += adjustment.quantity
    update_product_status(product)

    transaction = StockTransaction(
        product_id=product_id,
        quantity_change=adjustment.quantity,
        transaction_type="inbound",
        notes=adjustment.notes or "Stock added via POS"
    )
    db.add(transaction)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.get("/available-products", response_model=list[ProductResponse])
async def get_available_products(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).order_by(Product.name))
    return result.scalars().all()
