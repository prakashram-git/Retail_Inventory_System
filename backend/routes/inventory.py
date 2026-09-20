from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.database import get_db
from backend.models.inventory import Product, StockTransaction, StockStatus
from backend.schemas import ProductCreate, ProductUpdate, ProductResponse, StockAdjustment
from backend.auth import get_current_user

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

def update_product_status(product: Product):
    if product.quantity_in_stock == 0:
        product.status = StockStatus.OUT_OF_STOCK
    elif product.quantity_in_stock <= product.reorder_level:
        product.status = StockStatus.LOW_STOCK
    else:
        product.status = StockStatus.IN_STOCK

@router.post("/products", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # Auto-generate SKU if not provided
    sku = product_data.sku
    if not sku:
        # Get the highest existing SKU number
        result = await db.execute(select(Product.sku))
        existing_skus = result.scalars().all()

        # Extract numbers from SKUs that match pattern "PRD-XXXX"
        max_num = 0
        for existing_sku in existing_skus:
            if existing_sku and existing_sku.startswith("PRD-"):
                try:
                    num = int(existing_sku.replace("PRD-", ""))
                    max_num = max(max_num, num)
                except ValueError:
                    pass

        sku = f"PRD-{str(max_num + 1).zfill(4)}"
    else:
        # Check if provided SKU already exists
        result = await db.execute(select(Product).where(Product.sku == sku))
        existing = result.scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Product with this SKU already exists")

    product_data.sku = sku
    product = Product(**product_data.model_dump())
    update_product_status(product)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.get("/products", response_model=list[ProductResponse])
async def list_products(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
    category: str = None
):
    query = select(Product)
    if category:
        query = query.where(Product.category == category)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return product

@router.post("/products/{product_id}/add-stock", response_model=ProductResponse)
async def add_stock(
    product_id: int,
    adjustment: StockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.quantity_in_stock += adjustment.quantity
    update_product_status(product)

    transaction = StockTransaction(
        product_id=product_id,
        quantity_change=adjustment.quantity,
        transaction_type="inbound",
        notes=adjustment.notes
    )
    db.add(transaction)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.execute(delete(Product).where(Product.id == product_id))
    await db.commit()
    return {"detail": "Product deleted successfully"}

@router.get("/categories")
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product.category).distinct())
    categories = result.scalars().all()
    return list(set([c for c in categories if c]))
