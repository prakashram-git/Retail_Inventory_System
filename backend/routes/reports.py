from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database import get_db
from backend.models.inventory import Product, StockTransaction
from backend.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/inventory-summary")
async def get_inventory_summary(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product))
    products = result.scalars().all()

    total_value = sum(p.quantity_in_stock * p.unit_price for p in products)
    total_items = sum(p.quantity_in_stock for p in products)
    low_stock_count = sum(1 for p in products if p.status == "low_stock")
    out_of_stock_count = sum(1 for p in products if p.status == "out_of_stock")

    return {
        "total_products": len(products),
        "total_items": total_items,
        "total_inventory_value": total_value,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count
    }

@router.get("/stock-by-category")
async def get_stock_by_category(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product))
    products = result.scalars().all()

    categories = {}
    for product in products:
        if product.category not in categories:
            categories[product.category] = {
                "total_items": 0,
                "total_value": 0,
                "product_count": 0
            }
        categories[product.category]["total_items"] += product.quantity_in_stock
        categories[product.category]["total_value"] += product.quantity_in_stock * product.unit_price
        categories[product.category]["product_count"] += 1

    return categories

@router.get("/product-availability")
async def get_product_availability(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Product).order_by(Product.name))
    products = result.scalars().all()

    data = []
    for product in products:
        data.append({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "quantity": product.quantity_in_stock,
            "reorder_level": product.reorder_level,
            "status": product.status,
            "unit_price": product.unit_price,
            "total_value": product.quantity_in_stock * product.unit_price
        })

    return data

@router.get("/low-stock-items")
async def get_low_stock_items(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(
        select(Product).where(
            (Product.quantity_in_stock <= Product.reorder_level) |
            (Product.quantity_in_stock == 0)
        ).order_by(Product.quantity_in_stock)
    )
    products = result.scalars().all()

    return [
        {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "quantity": p.quantity_in_stock,
            "reorder_level": p.reorder_level,
            "status": p.status
        }
        for p in products
    ]

@router.get("/transactions")
async def get_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
    days: int = 30
):
    start_date = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(StockTransaction).where(
            StockTransaction.created_at >= start_date
        ).order_by(StockTransaction.created_at.desc())
    )
    transactions = result.scalars().all()

    return [
        {
            "id": t.id,
            "product_id": t.product_id,
            "quantity": t.quantity_change,
            "type": t.transaction_type,
            "notes": t.notes,
            "created_at": t.created_at
        }
        for t in transactions
    ]
