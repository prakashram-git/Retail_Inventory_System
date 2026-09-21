from fastapi.testclient import TestClient

from main import app


client = TestClient(app)

# Get auth token first
LOGIN_RESPONSE = client.post(
    "/api/auth/login",
    json={"username": "admin", "password": "admin123"}
)
TOKEN = LOGIN_RESPONSE.json()["access_token"]
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def test_create_new_product_with_stock():
    """Test creating a new product with initial stock via POS endpoint"""
    response = client.post(
        "/api/pos/create-product",
        headers=HEADERS,
        json={
            "name": "Stock Test Item",
            "category": "Maintenance",
            "quantity_in_stock": 12,
            "cost_price": 4.5,
            "unit_price": 9.0,
            "reorder_level": 5,
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["quantity_in_stock"] == 12
    assert data["name"] == "Stock Test Item"
    assert data["sku"].startswith("PRD-")


def test_add_stock_to_existing_product():
    """Test adding stock to an existing product"""
    # First, create a product
    create_response = client.post(
        "/api/pos/create-product",
        headers=HEADERS,
        json={
            "name": "New Stock Item",
            "category": "Accessories",
            "quantity_in_stock": 25,
            "cost_price": 10,
            "unit_price": 18,
            "reorder_level": 8,
        },
    )
    assert create_response.status_code == 200
    product = create_response.json()
    product_id = product["id"]

    # Now add more stock to it
    add_stock_response = client.post(
        f"/api/inventory/products/{product_id}/add-stock",
        headers=HEADERS,
        json={
            "quantity": 10,
            "notes": "Additional stock"
        },
    )
    assert add_stock_response.status_code == 200, add_stock_response.text
    updated_product = add_stock_response.json()
    assert updated_product["quantity_in_stock"] == 35  # 25 + 10
    assert updated_product["name"] == "New Stock Item"
