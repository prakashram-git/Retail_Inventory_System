# SwiftStock Enterprise Edition - Technical Architecture

## Executive Summary
Upgrade SwiftStock from an MVP to a commercial-grade, multi-location inventory management platform comparable to Zoho Inventory and Cin7.

---

## 1. System Architecture Overview

### Tech Stack Evolution

**Current MVP Stack:**
- Backend: FastAPI (async Python)
- Database: SQLite (file-based)
- Frontend: Vanilla JavaScript + Tailwind
- Auth: JWT tokens
- Deployment: Vercel (serverless)

**Enterprise Stack:**
- Backend: FastAPI + Prisma ORM (PostgreSQL)
- Database: PostgreSQL (hosted: Supabase/AWS RDS)
- Frontend: React 18 + TypeScript + Tailwind + Shadcn/ui
- Auth: JWT + Role-Based Access Control (RBAC)
- Real-time: WebSockets for stock sync
- Deployment: Docker + Kubernetes / Vercel with PostgreSQL
- Queuing: Celery for async tasks (stock adjustments, audits)
- Caching: Redis for concurrent stock locks

### Microservices Boundaries

```
┌─────────────────────────────────────────────┐
│         API Gateway / Auth Middleware        │
├─────────────────────────────────────────────┤
│  Locations API  │  Inventory API  │ PO API  │
│  Suppliers API  │  Transfer API   │ Auth    │
└─────────────────────────────────────────────┘
         ↓              ↓              ↓
   ┌──────────────────────────────────────────┐
   │      PostgreSQL + Prisma ORM             │
   │  (Locations, Products, InventoryLevels,  │
   │   PurchaseOrders, StockLedger, Users)    │
   └──────────────────────────────────────────┘
```

---

## 2. Database Schema (PostgreSQL + Prisma)

### Core Models

```prisma
// Users & Organization
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  username    String    @unique
  password    String
  role        Role      @default(STAFF)  // ADMIN, MANAGER, CASHIER, CLERK
  locations   Location[] @relation("LocationManagers")
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum Role {
  ADMIN
  STORE_MANAGER
  WAREHOUSE_MANAGER
  CASHIER
  CLERK
}

model Location {
  id            String    @id @default(cuid())
  name          String
  type          LocationType  // WAREHOUSE, RETAIL_STORE, 3PL
  address       String
  city          String
  country       String
  managers      User[]    @relation("LocationManagers")
  
  products      InventoryLevel[]
  transfers     StockTransfer[]
  purchaseOrders PurchaseOrder[] @relation("DestinationLocation")
  
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum LocationType {
  WAREHOUSE
  RETAIL_STORE
  THIRD_PARTY_LOGISTICS
}

// Product & Inventory
model Product {
  id            String    @id @default(cuid())
  sku           String    @unique
  name          String
  description   String?
  category      String
  
  unitPrice     Float
  costPrice     Float
  reorderLevel  Int
  targetStock   Int
  
  inventoryLevels InventoryLevel[]
  suppliers     ProductSupplier[]
  ledgerEntries InventoryLedgerEntry[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model InventoryLevel {
  id            String    @id @default(cuid())
  productId     String    @db.VarChar(255)
  locationId    String    @db.VarChar(255)
  
  product       Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  location      Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  aisle         String?
  bin           String?
  
  onHand        Int       @default(0)
  committed     Int       @default(0)  // Allocated to pending orders
  available     Int       @default(0)  // onHand - committed
  incoming      Int       @default(0)  // From purchase orders in transit
  reorderPoint  Int
  targetStock   Int
  
  lastCountedAt DateTime?
  lastCountedBy String?
  
  @@unique([productId, locationId])
  @@index([locationId])
  @@index([productId])
}

// Suppliers & Purchase Orders
model Supplier {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  phone         String?
  
  paymentTerms  String    // Net 30, Net 60
  leadTimeDays  Int       @default(7)
  currency      String    @default("USD")
  
  products      ProductSupplier[]
  purchaseOrders PurchaseOrder[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ProductSupplier {
  id            String    @id @default(cuid())
  productId     String    @db.VarChar(255)
  supplierId    String    @db.VarChar(255)
  
  product       Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier      Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  
  supplierSku   String?
  supplierPrice Float
  minOrderQty   Int       @default(1)
  leadTimeDays  Int
  
  @@unique([productId, supplierId])
}

model PurchaseOrder {
  id            String    @id @default(cuid())
  poNumber      String    @unique
  supplierId    String    @db.VarChar(255)
  supplier      Supplier  @relation(fields: [supplierId], references: [id])
  
  destinationLocationId String @db.VarChar(255)
  destinationLocation   Location @relation("DestinationLocation", fields: [destinationLocationId], references: [id])
  
  status        POStatus  @default(DRAFT)  // DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
  
  totalCost     Float     @default(0)
  items         PurchaseOrderItem[]
  
  createdAt     DateTime  @default(now())
  sentDate      DateTime?
  expectedDeliveryDate DateTime?
  receivedDate  DateTime?
  updatedAt     DateTime  @updatedAt
}

enum POStatus {
  DRAFT
  SENT
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

model PurchaseOrderItem {
  id            String    @id @default(cuid())
  poId          String    @db.VarChar(255)
  productId     String    @db.VarChar(255)
  
  po            PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  
  quantity      Int
  receivedQty   Int       @default(0)
  unitCost      Float
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([poId])
}

// Stock Transfers
model StockTransfer {
  id            String    @id @default(cuid())
  fromLocationId String   @db.VarChar(255)
  toLocationId  String    @db.VarChar(255)
  
  fromLocation  Location  @relation(fields: [fromLocationId], references: [id])
  toLocation    Location  @relation(fields: [toLocationId], references: [id])
  
  status        TransferStatus @default(PENDING)
  
  items         StockTransferItem[]
  
  createdBy     String
  createdAt     DateTime  @default(now())
  sentDate      DateTime?
  receivedDate  DateTime?
  updatedAt     DateTime  @updatedAt
}

enum TransferStatus {
  PENDING
  IN_TRANSIT
  RECEIVED
  CANCELLED
}

model StockTransferItem {
  id            String    @id @default(cuid())
  transferId    String    @db.VarChar(255)
  productId     String    @db.VarChar(255)
  
  transfer      StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  
  quantity      Int
  receivedQty   Int       @default(0)
  
  @@index([transferId])
}

// Stock Adjustments
model StockAdjustment {
  id            String    @id @default(cuid())
  locationId    String    @db.VarChar(255)
  
  reason        AdjustmentReason  // SPOILAGE, SCRAP, RECOUNT, THEFT, OTHER
  quantity      Int
  productId     String    @db.VarChar(255)
  
  notes         String?
  status        ApprovalStatus @default(PENDING)  // PENDING, APPROVED, REJECTED
  
  createdBy     String
  approvedBy    String?
  
  createdAt     DateTime  @default(now())
  approvedAt    DateTime?
  updatedAt     DateTime  @updatedAt
}

enum AdjustmentReason {
  SPOILAGE
  SCRAP
  RECOUNT_DISCREPANCY
  THEFT
  LOSS_IN_TRANSIT
  OTHER
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

// Immutable Ledger
model InventoryLedgerEntry {
  id            String    @id @default(cuid())
  productId     String    @db.VarChar(255)
  locationId    String    @db.VarChar(255)
  
  product       Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  delta         Int       // +/- quantity
  runningBalance Int
  
  referenceType String    // PURCHASE_ORDER, SALE, TRANSFER, ADJUSTMENT, INITIAL
  referenceId   String?
  
  unitCost      Float?
  totalCost     Float?
  
  createdAt     DateTime  @default(now())
}

// Audit Log
model AuditLog {
  id            String    @id @default(cuid())
  userId        String
  action        String    // CREATE, UPDATE, DELETE, STOCK_ADJUSTMENT
  tableName     String
  recordId      String
  changes       Json      // Before/after values
  
  createdAt     DateTime  @default(now())
}
```

---

## 3. Core Business Logic & Constraints

### Concurrency Control Strategy
```typescript
// Use optimistic locking with version field
// or Redis-based distributed locks for high-contention operations

class StockService {
  async allocateStock(
    productId: string,
    locationId: string,
    quantity: number,
    lockTimeoutMs: number = 5000
  ): Promise<boolean> {
    // Acquire distributed lock via Redis
    const lockKey = `stock:${productId}:${locationId}`;
    const acquired = await redis.set(lockKey, "locked", "EX", 5, "NX");
    
    if (!acquired) throw new ConcurrencyError("Stock locked by another process");
    
    try {
      const inventory = await getInventoryLevel(productId, locationId);
      if (inventory.available >= quantity) {
        await updateInventory(productId, locationId, -quantity);
        await ledger.log(productId, locationId, -quantity, "SALE");
        return true;
      }
      return false;
    } finally {
      await redis.del(lockKey);
    }
  }
}
```

### Negative Stock Prevention
```typescript
interface CompanySettings {
  allowNegativeStock: boolean;  // Default: false
  negativeStockThreshold: number; // How negative is allowed (if enabled)
}

async function createStockAdjustment(
  productId: string,
  locationId: string,
  delta: number,
  reason: AdjustmentReason
) {
  const settings = await getCompanySettings();
  const inventory = await getInventoryLevel(productId, locationId);
  
  const projectedBalance = inventory.onHand + delta;
  
  if (projectedBalance < 0 && !settings.allowNegativeStock) {
    throw new BusinessRuleError(
      `Cannot reduce stock below 0. Current: ${inventory.onHand}, Delta: ${delta}`
    );
  }
  
  // Process adjustment...
}
```

### Role-Based Permissions
```typescript
const PERMISSIONS = {
  ADMIN: ["*"],  // Full access
  STORE_MANAGER: [
    "inventory:view",
    "inventory:adjust",  // Needs approval
    "reports:view",
    "transfers:create",
    "pos:checkin"
  ],
  WAREHOUSE_MANAGER: [
    "inventory:view",
    "transfers:manage",
    "po:receive",
    "stocktake:conduct"
  ],
  CASHIER: [
    "inventory:view",  // Read-only
    "pos:checkout"
  ],
  CLERK: [
    "inventory:view",
    "barcode:scan",
    "stocktake:scan"
  ]
};

// Middleware
async function authorize(requiredPermission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const allowed = PERMISSIONS[user.role]?.includes(requiredPermission) || 
                   PERMISSIONS[user.role]?.includes("*");
    
    if (!allowed) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}
```

---

## 4. API Endpoints (RESTful)

### Locations
```
GET    /api/locations
POST   /api/locations
GET    /api/locations/:id
PUT    /api/locations/:id
DELETE /api/locations/:id
GET    /api/locations/:id/inventory  # Inventory snapshot
```

### Inventory & Stock
```
GET    /api/inventory/:locationId
GET    /api/inventory/:locationId/:productId
PUT    /api/inventory/:locationId/:productId/adjust  # Stock adjustment
GET    /api/inventory/valuation  # ABC analysis, FIFO vs WAC
POST   /api/stocktake/start  # Begin audit
POST   /api/stocktake/:id/count  # Submit count
GET    /api/stocktake/:id/discrepancies  # Compare book vs count
POST   /api/stocktake/:id/finalize  # Auto-generate adjustments
```

### Suppliers & PurchaseOrders
```
GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/:id/catalog
GET    /api/suppliers/:id/suggested-orders  # Auto-reorder

POST   /api/purchase-orders
GET    /api/purchase-orders
GET    /api/purchase-orders/:id
POST   /api/purchase-orders/:id/send
POST   /api/purchase-orders/:id/receive  # Partial receiving
GET    /api/purchase-orders/:id/discrepancies
```

### Stock Transfers
```
POST   /api/stock-transfers
GET    /api/stock-transfers
GET    /api/stock-transfers/:id
POST   /api/stock-transfers/:id/send
POST   /api/stock-transfers/:id/receive
```

### Barcode
```
POST   /api/barcode/generate  # Generate Code128/QR labels
POST   /api/barcode/scan  # Lookup by barcode
```

---

## 5. Frontend Component Architecture (React)

```
src/
├── components/
│   ├── inventory/
│   │   ├── StockLevelCard.tsx
│   │   ├── InventoryGrid.tsx
│   │   ├── QuickAdjustModal.tsx
│   ├── transfers/
│   │   ├── TransferForm.tsx
│   │   ├── TransferTracking.tsx
│   │   ├── ReceiveGoodsModal.tsx
│   ├── procurement/
│   │   ├── SupplierCatalog.tsx
│   │   ├── PurchaseOrderBuilder.tsx
│   │   ├── ReceivePartialPO.tsx
│   ├── stocktake/
│   │   ├── StartStocktakeModal.tsx
│   │   ├── CountingInterface.tsx  (mobile-optimized)
│   │   ├── DiscrepancyReport.tsx
│   ├── barcode/
│   │   ├── BarcodeScanner.tsx  (HTML5 camera)
│   │   ├── BarcodeGenerator.tsx
│   ├── analytics/
│   │   ├── ValuationDashboard.tsx
│   │   ├── ABCAnalysis.tsx
│   │   ├── LowStockAlerts.tsx
│   ├── shared/
│   │   ├── PermissionGate.tsx
│   │   ├── AuditLog.tsx
│   │   ├── ErrorBoundary.tsx
│
├── hooks/
│   ├── useInventory.ts
│   ├── useStockLock.ts  (concurrency control)
│   ├── useBarcodeScan.ts
│
├── services/
│   ├── inventory.service.ts
│   ├── transfer.service.ts
│   ├── po.service.ts
│   ├── stocktake.service.ts
│   ├── audit.service.ts
│
├── types/
│   ├── inventory.ts
│   ├── orders.ts
│   ├── transfers.ts
│   ├── user.ts
│
├── utils/
│   ├── permissions.ts
│   ├── valuation.ts  (FIFO, WAC algorithms)
│   ├── reorderLogic.ts
```

---

## 6. Mobile & Accessibility Considerations

- **Barcode Scanner**: HTML5 `getUserMedia()` API for camera access (PWA-ready)
- **Touch-friendly**: 48px+ tap targets for warehouse staff
- **Offline mode**: Service Workers for count data sync when connection drops
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen readers

---

## 7. Deployment Architecture

```yaml
# Docker Compose (Local Dev)
services:
  api:
    image: swiftstock:latest
    ports: [8000]
    env:
      DATABASE_URL: postgresql://user:pass@postgres:5432/swiftstock
      REDIS_URL: redis://redis:6379
      
  web:
    image: swiftstock-frontend:latest
    ports: [3000]
    
  postgres:
    image: postgres:15-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    
  redis:
    image: redis:7-alpine
    
  celery-worker:  # For async tasks
    image: swiftstock:latest
    command: celery -A tasks worker
```

**Production (Vercel + Supabase):**
- API: Vercel serverless functions
- Database: Supabase (PostgreSQL)
- Cache: Vercel KV (Redis-compatible)
- CDN: Vercel Edge Network

---

## 8. Phase-Based Rollout Plan

**Phase 1 (Week 1-2):** Database migration, core schemas, API layer
**Phase 2 (Week 3):** Multi-location inventory, stock transfers
**Phase 3 (Week 4):** Purchase orders, supplier management
**Phase 4 (Week 5):** Stocktake & cycle counting
**Phase 5 (Week 6):** Barcode scanning, advanced analytics
**Phase 6 (Week 7-8):** Mobile optimization, production deployment

---

## Success Metrics
- Concurrent user support: 100+ simultaneous staff
- Stock consistency: 99.9% accuracy across locations
- API response time: <200ms p95
- Mobile app load: <2s on 4G
- Audit trail completeness: 100% of mutations logged
