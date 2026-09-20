from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class StoreConfiguration(Base):
    __tablename__ = "store_configuration"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_name: Mapped[str] = mapped_column(String, default="SwiftStock Retail")
    tax_rate_percentage: Mapped[float] = mapped_column(Float, default=7.0)
    currency_symbol: Mapped[str] = mapped_column(String, default="$")
    receipt_header_message: Mapped[str] = mapped_column(String, default="Thank you for shopping with us")
    receipt_footer_message: Mapped[str] = mapped_column(String, default="Please keep your receipt")
    auto_print_receipt_on_checkout: Mapped[bool] = mapped_column(Boolean, default=True)
    theme: Mapped[str] = mapped_column(String, default="dark")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (Index("ix_products_sku", "sku", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    quantity_on_order: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10)
    reorder_quantity: Mapped[int] = mapped_column(Integer, default=50)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    selling_price: Mapped[float] = mapped_column(Float, nullable=False)

    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="product")

    @property
    def stock_status(self) -> str:
        available = self.quantity_on_hand + self.quantity_on_order
        if available <= self.reorder_level:
            return "CRITICAL" if available == 0 else "LOW STOCK"
        return "HEALTHY"


class SaleHistory(Base):
    __tablename__ = "sale_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    payment_method: Mapped[str] = mapped_column(String, nullable=False)
    receipt_text: Mapped[str] = mapped_column(Text, default="")

    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sale_history.id"), nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    item_name: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)

    sale: Mapped[SaleHistory] = relationship(back_populates="items")
    product: Mapped[Product | None] = relationship(back_populates="sale_items")
