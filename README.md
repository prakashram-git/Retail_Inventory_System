# SwiftStock - Retail Inventory Management System

A complete, lightweight retail inventory management system built with FastAPI, SQLAlchemy, SQLite, and Vanilla JavaScript.

## Features

### Feature 1: Inventory Management
- Complete inventory catalog with:
  - SKU (Stock Keeping Unit)
  - Product Name
  - Category
  - In Stock quantity tracking
  - Unit Price & Cost Price
  - Stock Status (In Stock, Low Stock, Out of Stock)
- Stock alerts for low inventory
- Add stock to existing products
- Real-time inventory updates

### Feature 2: POS Register (Stock Intake)
- Add stock to existing products
- Create new products on-the-fly
- Enter quantity, cost price, selling price, category, SKU, and reorder level
- Stock maintenance tool (NOT a sales checkout system)

### Feature 3: Setup & Theme Management
- Dark/Light mode toggle
- Theme persistence across sessions
- Readable text contrast in both modes
- Store configuration (name, logo, currency)

### Feature 4: Reports & Analytics
- Inventory summary dashboard
- Stock by category breakdown
- Product availability bar charts
- Low stock items report
- Stock transaction history

### Feature 5: User Management & Authentication
- Login with username and password
- Register new administrator accounts
- JWT-based authentication
- User sessions management

## Technology Stack

### Backend
- **FastAPI** - Modern async web framework
- **SQLAlchemy** - Async ORM
- **SQLite** - Local database
- **Python 3.9+** - Python async support
- **Pydantic** - Data validation
- **python-jose** - JWT authentication
- **bcrypt** - Password hashing

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **Tailwind CSS** - Utility-first styling
- **Chart.js** - Data visualization
- **FontAwesome** - Icons
- **HTML5** - Semantic markup

## Installation

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)

### Setup

1. **Navigate to the project directory:**
   ```bash
   cd /Users/ramprakash/Retail_Inventory_System
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   python3 main.py
   ```

4. **Access the application:**
   - Open your browser and go to: `http://localhost:8000`
   - Default credentials:
     - Username: `admin`
     - Password: `admin123`

## Project Structure

```
Retail_Inventory_System/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── backend/
│   ├── config.py          # Configuration settings
│   ├── database.py        # Database setup and async session
│   ├── auth.py            # Authentication utilities
│   ├── schemas.py         # Pydantic models for API
│   ├── models/
│   │   ├── user.py        # User model
│   │   ├── inventory.py   # Product and stock models
│   │   └── settings.py    # App settings model
│   └── routes/
│       ├── auth.py        # Login/Register endpoints
│       ├── inventory.py   # Product CRUD endpoints
│       ├── pos.py         # Stock intake endpoints
│       ├── reports.py     # Reports and analytics
│       └── settings.py    # Configuration endpoints
└── frontend/
    ├── index.html         # Main HTML file
    ├── js/
    │   └── app.js         # Main application logic
    └── css/
        └── (inline in HTML)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new admin
- `POST /api/auth/login` - Login user

### Inventory
- `GET /api/inventory/products` - List all products
- `POST /api/inventory/products` - Create product
- `GET /api/inventory/products/{id}` - Get product details
- `PUT /api/inventory/products/{id}` - Update product
- `POST /api/inventory/products/{id}/add-stock` - Add stock to product
- `DELETE /api/inventory/products/{id}` - Delete product
- `GET /api/inventory/categories` - Get all categories

### POS Register
- `POST /api/pos/create-product` - Create product via POS
- `POST /api/pos/add-to-product/{id}` - Add stock via POS
- `GET /api/pos/available-products` - List products for POS

### Reports
- `GET /api/reports/inventory-summary` - Overall inventory stats
- `GET /api/reports/stock-by-category` - Breakdown by category
- `GET /api/reports/product-availability` - All products with stock levels
- `GET /api/reports/low-stock-items` - Items needing reorder
- `GET /api/reports/transactions` - Stock transaction history

### Settings
- `GET /api/settings` - Get app settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/logo` - Upload store logo

## Usage Guide

### First Time Setup
1. Application starts with default admin account
2. Login with username: `admin`, password: `admin123`
3. Go to Setup to customize store name, theme, logo
4. You can create additional admin accounts from the login screen

### Managing Inventory
1. Navigate to **Inventory** tab
2. View all products in table format
3. Use search/filter to find products
4. Click "Add Stock" to increase quantities
5. Use "Add Product" button to create new items

### Stock Intake (POS Register)
1. Navigate to **POS Register** tab
2. **Option A**: Select existing product and add stock quantity
3. **Option B**: Create new product with all details (SKU, name, price, etc.)
4. Stock updates in real-time

### Viewing Reports
1. Navigate to **Reports** tab
2. View inventory summary statistics
3. See breakdown by category
4. View product availability bar chart showing stock levels

### Theme Management
1. Click the theme toggle (moon/sun icon) in header
2. Choose between dark and light mode
3. Selection persists across sessions

## Key Features

### Stock Status Indicators
- **In Stock** (Green) - Quantity > Reorder Level
- **Low Stock** (Orange) - Quantity <= Reorder Level
- **Out of Stock** (Red) - Quantity = 0

### Data Persistence
- All data stored in SQLite database
- Settings and theme preference saved to database
- Theme also cached in browser localStorage

### Real-Time Updates
- Inventory changes update immediately
- No page refresh needed for stock changes
- Dashboard reflects current system state

### Security
- Password hashing with bcrypt
- JWT-based authentication
- Admin-only access to sensitive functions

## Database Schema

### Users Table
- id, username, email, hashed_password, is_active, is_admin, created_at, updated_at

### Products Table
- id, sku, name, category, description, unit_price, cost_price
- quantity_in_stock, reorder_level, status, created_at, updated_at

### Stock Transactions Table
- id, product_id, quantity_change, transaction_type, notes, created_at

### App Settings Table
- id, store_name, store_logo_path, theme, currency_symbol, low_stock_threshold

## Troubleshooting

### Port Already in Use
If port 8000 is already in use, modify in main.py:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Database Errors
Delete `retail_inventory.db` to reset the database:
```bash
rm retail_inventory.db
```

### Login Issues
Reset to default admin:
- Delete database and restart app
- Default: username `admin`, password `admin123`

### Theme Not Persisting
Clear browser cache and localStorage for the domain

## Future Enhancements
- Multi-user support with roles
- Advanced reporting with date ranges
- Barcode scanning integration
- Email notifications for low stock
- Backup and export functionality
- Mobile app version

## License
Proprietary - SwiftStock Retail Inventory System

## Support
For issues or questions, please check the dashboard for system status.
