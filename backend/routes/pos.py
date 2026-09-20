from fastapi import APIRouter, Depends, HTTPException, status, Body
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

@router.post("/import-products")
async def import_products_csv(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    products_data = data.get('products', [])
    if not products_data:
        raise HTTPException(status_code=400, detail="No products provided")

    imported_count = 0
    failed_count = 0
    errors = []

    # Get existing SKU numbers for auto-generation
    result = await db.execute(select(Product.sku))
    existing_skus = result.scalars().all()
    max_num = 0
    for existing_sku in existing_skus:
        if existing_sku and existing_sku.startswith("PRD-"):
            try:
                num = int(existing_sku.replace("PRD-", ""))
                max_num = max(max_num, num)
            except ValueError:
                pass

    for idx, product_data in enumerate(products_data, 1):
        try:
            # Validate required fields
            required_fields = ['name', 'category', 'cost_price', 'unit_price']
            for field in required_fields:
                if field not in product_data or not product_data[field]:
                    raise ValueError(f"Missing required field: {field}")

            # Check if product with same name already exists
            existing = await db.execute(
                select(Product).where(Product.name == product_data['name'])
            )
            if existing.scalars().first():
                raise ValueError(f"Product '{product_data['name']}' already exists")

            # Auto-generate SKU
            max_num += 1
            sku = f"PRD-{str(max_num).zfill(4)}"

            # Create product
            product = Product(
                name=product_data['name'],
                category=product_data['category'],
                cost_price=float(product_data['cost_price']),
                unit_price=float(product_data['unit_price']),
                sku=sku,
                description=product_data.get('description', ''),
                quantity_in_stock=int(product_data.get('quantity_in_stock', 0)),
                reorder_level=int(product_data.get('reorder_level', 10))
            )

            # Update status
            if product.quantity_in_stock == 0:
                product.status = StockStatus.OUT_OF_STOCK
            elif product.quantity_in_stock <= product.reorder_level:
                product.status = StockStatus.LOW_STOCK
            else:
                product.status = StockStatus.IN_STOCK

            db.add(product)
            await db.flush()

            # Add transaction if initial stock provided
            if product.quantity_in_stock > 0:
                transaction = StockTransaction(
                    product_id=product.id,
                    quantity_change=product.quantity_in_stock,
                    transaction_type="inbound",
                    notes="Initial stock from CSV import"
                )
                db.add(transaction)

            imported_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Row {idx}: {str(e)}")

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

    return {
        "imported_count": imported_count,
        "failed_count": failed_count,
        "errors": errors[:10]  # Return first 10 errors
    }
