# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Run the application:**
```bash
python main.py
# App runs at http://localhost:8000
# Default login: admin / admin123 (check DEFAULT_PASSWORD in backend/config.py)
```

**Run tests:**
```bash
python -m pytest tests/
# Single test: python -m pytest tests/test_inventory_stock.py::test_name
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

## High-Level Architecture

### Overview
SwiftStock is a full-stack inventory management system with:
- **Backend**: FastAPI async web server with SQLAlchemy async ORM
- **Frontend**: Single-page app (SPA) using vanilla JavaScript (no framework)
- **Database**: SQLite with async support (aiosqlite)

### Backend Architecture (`/backend`)

**Entry Point**: `main.py`
- Initializes FastAPI app with lifespan context manager
- On startup: runs `init_db()`, creates default admin user if missing
- Mounts frontend as static files, serves index.html at `/`
- Includes 5 route modules via `app.include_router()`

**Core Components**:
- `backend/database.py`: Async SQLAlchemy engine, session factory, `init_db()` initialization
- `backend/models/`: SQLAlchemy ORM models (User, Product, StockTransaction, AppSettings)
- `backend/schemas.py`: Pydantic models for API request/response validation
- `backend/auth.py`: JWT token creation/verification, password hashing utilities
- `backend/config.py`: Settings (SECRET_KEY, DB path, defaults)

**Routes** (all `/api/*`):
- `routes/auth.py`: `/auth/register`, `/auth/login` — JWT authentication
- `routes/inventory.py`: CRUD endpoints for products, categories, stock lookups
- `routes/pos.py`: Stock intake endpoints, CSV bulk import (`/pos/import-products`)
- `routes/reports.py`: Analytics — summary stats, category breakdown, product availability
- `routes/settings.py`: Store config (name, logo, currency, low_stock_threshold)

**Key Design Patterns**:
- **Async/await**: All DB operations use `AsyncSessionLocal()` context managers
- **Dependency injection**: Routes receive `db: AsyncSession = Depends(get_db)`
- **Atomic transactions**: Use `db.flush()` before creating related records (e.g., product before StockTransaction)
- **Stock status calculation**: Derived from `quantity_in_stock` vs `reorder_level`, not stored

### Frontend Architecture (`/frontend`)

**Entry Point**: `index.html`
- Single page with embedded inline CSS + Tailwind CDN
- Loads `frontend/js/app.js` (1244 lines, monolithic)
- Includes libraries: Chart.js, FontAwesome, html2pdf.js, Tailwind CSS

**Frontend as Single Class** (`app.js` - class `SwiftStock`):
- Constructor initializes from localStorage (token, user, theme)
- `init()`: Checks for token; if none, shows full-page login screen; else loads dashboard
- Page routing via `showPage(page)` → calls `loadPageName()` method
- All API calls go through `apiFetch()` helper (handles auth headers, error parsing)

**Page Methods**:
- `loadDashboard()`: 4 metric cards + stock status
- `loadInventory()`: Product table with search/filter, CRUD actions
- `loadPOS()`: Stock intake with CSV import modal, dynamic product creation
- `loadReports()`: Date range filter + executive summary + category breakdown + product table (alternating colors) + PDF/print export
- `loadSetup()`: Store settings, theme toggle, logo upload
- `loadAbout()`: Product info, tech stack

**State Management**:
- `this.token`: JWT token (localStorage + memory)
- `this.user`: Current user object
- `this.theme`: 'dark' or 'light' (localStorage + class on document)
- All data fetched on-demand; no internal cache (re-fetches when pages load)

**Key Frontend Features** (recent additions):
- **Date range filter** in Reports: user picks fromDate/toDate, triggers `generateReport()` async function
- **Product table**: Alternating row colors (blue/green in light mode, gray variants in dark mode), small fonts (text-xs), bold product names
- **Full-page login**: No modal overlay; hides app (#app.hidden) until login succeeds
- **CSV import**: Downloads template, parses CSV file, auto-generates SKUs (PRD-XXXX format), posts to `/api/pos/import-products`
- **PDF export**: html2pdf.js library wraps report HTML, generates file with date in filename

### Data Flow Example: Add Stock via POS

1. **Frontend** (`loadPOS` → `showImportCSVModal`): User selects file, preview parsed CSV
2. **Frontend** → **Backend** (POST `/api/pos/import-products`): Sends array of product objects
3. **Backend** (`pos.py` route):
   - Validates required fields (name, category, cost_price, unit_price)
   - Auto-generates SKU (finds max PRD-#### number, increments)
   - Checks for duplicate product names
   - Creates Product record via `db.add(product)`, calls `db.flush()` to get `product.id`
   - Creates StockTransaction record with that `product_id`
   - Commits atomic transaction
   - Returns `{imported_count, failed_count, errors: []}`
4. **Frontend**: Displays toast, reloads POS page

### Database Schema
- **Users**: id, username, email, hashed_password, is_active, is_admin, created_at, updated_at
- **Products**: id, sku, name, category, description, unit_price, cost_price, quantity_in_stock, reorder_level, status (computed), created_at, updated_at
- **StockTransactions**: id, product_id (FK), quantity_change, transaction_type, notes, created_at
- **AppSettings**: id, store_name, store_logo_path, theme, currency_symbol, low_stock_threshold

## Common Development Tasks

### Adding a New Inventory Feature

1. **Backend**: Create route in `/backend/routes/inventory.py` (or new file if complex)
   - Define Pydantic schema for request/response in `backend/schemas.py`
   - Use dependency injection: `async def my_endpoint(db: AsyncSession = Depends(get_db), ...)`
   - Return JSON or raise `HTTPException` (FastAPI handles to JSON response)
   - Commit atomic transactions explicitly

2. **Frontend**: Add new page method in `app.js` class
   - Add button to sidebar nav (in HTML)
   - Create `loadMyFeatureName()` async method
   - Use `this.apiFetch()` to call backend
   - Render HTML into `document.getElementById('pageContent').innerHTML`
   - Attach event listeners to interactive elements

3. **Test**: Run `python -m pytest tests/` to ensure no regressions

### Handling CSV Import / Bulk Operations

- **Backend**: POST endpoint in `routes/pos.py` accepts array, loops over items, batches writes
- **Frontend**: File input → FileReader API → parse CSV → fetch to backend
- **Validation**: Server-side validation is authoritative (Pydantic schemas)
- **SKU generation**: Auto-increment from highest existing `PRD-####` number

### Reports & PDF Export

- **Backend**: Three endpoints in `routes/reports.py`
  - `inventory-summary`: Total products, units, value, alert counts
  - `stock-by-category`: Per-category SKU count and unit sum
  - `product-availability`: Full product list with status
- **Frontend**: `loadReports()` fetches all three, renders HTML, html2pdf.js generates file
- **Date filtering**: Frontend UI (fromDate/toDate pickers) but data fetched is global (date filtering not yet on backend)

### Authentication Flow

1. **Register**: POST `/api/auth/register` with username, password, optional email → creates User record with hashed password
2. **Login**: POST `/api/auth/login` with username, password → validates hash, returns JWT token + user object
3. **Frontend**: Stores token in localStorage and this.token; includes in Authorization header for subsequent requests
4. **JWT validation**: Handled by `get_current_user()` in `auth.py` (some endpoints use it, some don't)

## Key Technical Decisions

- **No migration tool**: SQLite + simple schema. Drop `.db` to reset (for dev only)
- **Async all the way**: FastAPI's async support + aiosqlite for I/O-bound operations
- **No frontend framework**: Vanilla JS keeps bundle small and avoids build step
- **Monolithic app.js**: Single class handles routing and all page logic; not optimal for scale but fine for current size
- **localStorage for UI state**: Token, user, theme persisted here; backend is source of truth for data
- **Computed fields**: Stock status (in_stock/low_stock/out_of_stock) calculated on-the-fly from quantity vs reorder_level, not persisted

## Important Files & When to Edit

| File | Purpose | When to Edit |
|------|---------|--------------|
| `main.py` | FastAPI app setup, lifespan, route registration | Adding new route modules or changing startup logic |
| `backend/models/inventory.py` | Product, StockTransaction ORM models | Changing product/transaction schema |
| `backend/schemas.py` | Pydantic request/response models | Validating new API input |
| `backend/routes/*.py` | API endpoints | Adding new features or fixing endpoint logic |
| `frontend/js/app.js` | All frontend logic (single class) | Adding pages, changing UI, fixing client-side bugs |
| `frontend/index.html` | HTML structure + inline CSS | Adding new nav items, updating styles, linking libraries |
| `backend/config.py` | Settings (DB path, JWT secret, defaults) | Changing app behavior (default user, thresholds, etc.) |
| `backend/database.py` | SQLAlchemy setup, session management | Changing DB engine or session config |

## Known Limitations & Future Work

- **No date filtering on backend**: Date range picker in Reports UI, but API returns all data; filtering happens in-memory
- **CSV import feedback**: Import success/failure shown in toast but errors not detailed in UI
- **Frontend monolith**: 1200+ line single file; could benefit from modular approach at scale
- **No role-based access**: All endpoints serve all authenticated users (all are treated as admin)
- **Logo upload**: Stores file path, not tested for all image types
- **SKU auto-generation**: Runs through all existing products to find max; could use database max() for efficiency

## Memory & Conventions

This repo maintains a `/memory/` directory (in `.claude/projects/...`) documenting features like:
- CSV import details (validation, auto-SKU, error handling)
- Professional reports (single-page layout, PDF quality, date range UI)
- Auto-SKU generation (PRD-XXXX format, increment logic)

When making changes to these features, update memory docs to help future instances.

## Testing

- Test file: `tests/test_inventory_stock.py`
- Run: `python -m pytest tests/test_inventory_stock.py`
- Structure: Async test functions using pytest fixtures

## Deployment

- **Port**: Hardcoded to 8000 in `main.py` line 69; change if needed
- **Database**: SQLite file at path in `backend/config.py` (defaults to `retail_inventory.db`)
- **Static files**: Frontend served from `frontend/` dir mounted at `/static`

Build command (if needed):
```bash
# No build step needed; FastAPI serves static files directly
# Just run: python main.py
```

Deployment note: When deployed, ensure `frontend/` directory is present and contains `index.html` and `js/app.js`.
