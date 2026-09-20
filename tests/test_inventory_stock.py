from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_add_stock_increases_quantity_for_existing_product():
    product = client.post(
        "/api/inventory/add-stock",
        json={
            "sku": "POS-STOCK-TEST-1",
            "name": "Stock Test Item",
            "category": "Maintenance",
            "quantity": 12,
            "cost_price": 4.5,
            "selling_price": 9.0,
            "reorder_level": 5,
        },
    )
    assert product.status_code == 200, product.text
    data = product.json()
    assert data["quantity_on_hand"] == 12
    assert data["sku"] == "POS-STOCK-TEST-1"


def test_add_stock_creates_new_inventory_item_when_missing():
    response = client.post(
        "/api/inventory/add-stock",
        json={
            "sku": "POS-STOCK-NEW-ITEM",
            "name": "New Stock Item",
            "category": "Accessories",
            "quantity": 25,
            "cost_price": 10,
            "selling_price": 18,
            "reorder_level": 8,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["quantity_on_hand"] == 25
    assert body["name"] == "New Stock Item"
