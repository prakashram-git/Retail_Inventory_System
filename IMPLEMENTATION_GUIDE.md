# SwiftStock Enterprise Edition - Implementation Guide

## Quick Start for Development

### Prerequisites
```bash
# Install dependencies
npm install @prisma/client prisma
npm install react@18 typescript tailwindcss shadcn/ui
npm install react-hook-form zod axios date-fns
pip install asyncpg alembic sqlalchemy[asyncio]
```

### Phase-Based Implementation

## Phase 1: Database Migration (Days 1-3)

### Step 1: Set up PostgreSQL
```bash
# Local development with Docker
docker compose up -d postgres

# Initialize Prisma
npx prisma init

# Copy prisma_schema.prisma to prisma/schema.prisma
cp prisma_schema.prisma prisma/schema.prisma

# Create migration
npx prisma migrate dev --name initial_schema

# Generate Prisma client
npx prisma generate
```

### Step 2: Seed Initial Data
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@swiftstock.com',
      username: 'admin',
      password: hashPassword('admin123'),
      role: 'ADMIN',
    },
  });

  // Create warehouse locations
  await prisma.location.createMany({
    data: [
      {
        name: 'Main Warehouse',
        type: 'WAREHOUSE',
        address: '123 Warehouse St',
        city: 'New York',
        country: 'USA',
        managers: { connect: [{ id: admin.id }] },
      },
      {
        name: 'Downtown Store',
        type: 'RETAIL_STORE',
        address: '456 Main St',
        city: 'New York',
        country: 'USA',
      },
    ],
  });

  // Create sample suppliers
  await prisma.supplier.createMany({
    data: [
      {
        name: 'Global Supplies Inc',
        email: 'sales@globalsupplies.com',
        paymentTerms: 'Net 30',
        leadTimeDays: 7,
        currency: 'USD',
      },
      {
        name: 'Fast Distributors',
        email: 'orders@fastdist.com',
        paymentTerms: 'Net 15',
        leadTimeDays: 3,
        currency: 'USD',
      },
    ],
  });

  console.log('Seed completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Phase 2: Backend API Implementation (Days 4-7)

### Create Core Service Layer

```typescript
// backend/services/inventory.service.ts
import { PrismaClient } from '@prisma/client';
import redis from 'redis';

export class InventoryService {
  constructor(private prisma: PrismaClient, private redis: redis.RedisClient) {}

  /**
   * Allocate stock with concurrency control
   * Uses Redis distributed lock to prevent race conditions
   */
  async allocateStock(
    productId: string,
    locationId: string,
    quantity: number,
    reference: { type: string; id: string }
  ): Promise<boolean> {
    const lockKey = `stock:${productId}:${locationId}`;
    const lockValue = Date.now().toString();

    // Acquire lock with 5-second expiry
    const acquired = await new Promise<boolean>(resolve =>
      this.redis.set(lockKey, lockValue, 'EX', 5, 'NX', (err, result) =>
        resolve(result === 'OK')
      )
    );

    if (!acquired) throw new Error('Stock locked by another process');

    try {
      const inventory = await this.prisma.inventoryLevel.findUnique({
        where: { productId_locationId: { productId, locationId } },
      });

      if (!inventory || inventory.available < quantity) {
        return false;
      }

      // Update inventory
      await this.prisma.inventoryLevel.update({
        where: { productId_locationId: { productId, locationId } },
        data: {
          onHand: { decrement: quantity },
          available: { decrement: quantity },
        },
      });

      // Log to ledger
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      await this.prisma.inventoryLedgerEntry.create({
        data: {
          productId,
          locationId,
          delta: -quantity,
          runningBalance: inventory.onHand - quantity,
          referenceType: reference.type,
          referenceId: reference.id,
          unitCost: product.costPrice,
          totalCost: product.costPrice * quantity,
        },
      });

      return true;
    } finally {
      // Release lock
      this.redis.del(lockKey);
    }
  }

  /**
   * Get reorder suggestions
   * Identifies products below reorder point across all locations
   */
  async getReorderSuggestions(locationId?: string) {
    const inventories = await this.prisma.inventoryLevel.findMany({
      where: {
        onHand: { lte: this.prisma.inventoryLevel.fields.reorderPoint },
        ...(locationId && { locationId }),
      },
      include: { product: true, location: true },
    });

    const suggestions = await Promise.all(
      inventories.map(async inv => {
        const suppliers = await this.prisma.productSupplier.findMany({
          where: { productId: inv.productId },
          include: { supplier: true },
          orderBy: { leadTimeDays: 'asc' },
        });

        const bestSupplier = suppliers[0];

        return {
          productId: inv.productId,
          product: inv.product,
          locationId: inv.locationId,
          currentStock: inv.onHand,
          reorderPoint: inv.reorderPoint,
          suggestedQty: Math.max(inv.targetStock - inv.onHand, inv.minOrderQty || 1),
          estimatedCost: (Math.max(inv.targetStock - inv.onHand, 1) * bestSupplier.supplierPrice),
          recommendedSupplier: bestSupplier.supplier,
        };
      })
    );

    return suggestions;
  }

  /**
   * Process stock transfer
   */
  async createStockTransfer(
    fromLocationId: string,
    toLocationId: string,
    items: Array<{ productId: string; quantity: number }>,
    createdBy: string
  ) {
    const transfer = await this.prisma.stockTransfer.create({
      data: {
        fromLocationId,
        toLocationId,
        createdBy,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
    });

    return transfer;
  }

  /**
   * Finalize stocktake and auto-generate adjustments
   */
  async finalizeStocktake(stocktakeId: string) {
    const stocktake = await this.prisma.stocktake.findUnique({
      where: { id: stocktakeId },
      include: { counts: { include: { product: true } } },
    });

    if (!stocktake) throw new Error('Stocktake not found');

    const adjustments = await Promise.all(
      stocktake.counts
        .filter(count => count.discrepancy !== 0)
        .map(count =>
          this.prisma.stockAdjustment.create({
            data: {
              productId: count.productId,
              locationId: stocktake.locationId,
              quantity: count.discrepancy,
              reason: 'RECOUNT_DISCREPANCY',
              notes: `Discrepancy from stocktake ${stocktakeId}. Book: ${count.bookQty}, Counted: ${count.countedQty}`,
              status: 'PENDING',
              createdBy: 'system',
            },
          })
        )
    );

    // Update stocktake status
    await this.prisma.stocktake.update({
      where: { id: stocktakeId },
      data: {
        status: 'ADJUSTMENT_PENDING',
        completedAt: new Date(),
      },
    });

    return adjustments;
  }
}
```

### Create FastAPI Endpoints

```python
# backend/routes/inventory.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models.inventory import InventoryLevel, Product
from backend.services.inventory import InventoryService

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

@router.get("/reorder-suggestions")
async def get_reorder_suggestions(
    location_id: str = None,
    db: AsyncSession = Depends(get_db)
):
    service = InventoryService(db)
    suggestions = await service.get_reorder_suggestions(location_id)
    return suggestions

@router.post("/transfers")
async def create_stock_transfer(
    payload: CreateStockTransferPayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = InventoryService(db)
    transfer = await service.create_stock_transfer(
        payload.from_location_id,
        payload.to_location_id,
        payload.items,
        current_user.id
    )
    return transfer

@router.get("/valuation")
async def get_inventory_valuation(
    location_id: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate inventory valuation using configured method:
    - WEIGHTED_AVERAGE: (Cost * Qty) / Total Qty
    - FIFO: Assume first items in are first out
    - LIFO: Assume last items in are first out
    """
    pass
```

---

## Phase 3: Frontend Components (Days 8-11)

### Create React Components

```typescript
// src/components/inventory/StockTransferForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';

const schema = z.object({
  fromLocationId: z.string().min(1, 'From location required'),
  toLocationId: z.string().min(1, 'To location required'),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
  })),
});

export function StockTransferForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Transfer failed');
      alert('Transfer created successfully');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>From Location</label>
        <select {...register('fromLocationId')}>
          <option>Select warehouse</option>
          {/* Options */}
        </select>
        {errors.fromLocationId && <span>{errors.fromLocationId.message}</span>}
      </div>

      <div>
        <label>To Location</label>
        <select {...register('toLocationId')}>
          <option>Select destination</option>
        </select>
        {errors.toLocationId && <span>{errors.toLocationId.message}</span>}
      </div>

      {/* Dynamic items array */}

      <Button type="submit">Create Transfer</Button>
    </form>
  );
}
```

---

## Phase 4: Real-Time Features (Days 12-14)

### WebSocket for Live Stock Updates
```typescript
// src/hooks/useStockSync.ts
import { useEffect, useState } from 'react';

export function useStockSync(productId: string, locationId: string) {
  const [stock, setStock] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(
      `wss://api.example.com/ws/stock/${productId}/${locationId}`
    );

    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStock(data); // Real-time stock update
    };
    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [productId, locationId]);

  return { stock, isConnected };
}
```

---

## Phase 5: Mobile Barcode Scanner (Days 15-16)

```typescript
// src/components/barcode/BarcodeScanner.tsx
import React, { useRef, useEffect } from 'react';
import jsQR from 'jsqr';

export function BarcodeScanner({ onScan }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        video.srcObject = stream;
        video.play();

        const scanInterval = setInterval(() => {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            onScan(code.data);
            clearInterval(scanInterval);
          }
        }, 500);

        return () => clearInterval(scanInterval);
      });
  }, [onScan]);

  return (
    <>
      <video ref={videoRef} style={{ width: '100%' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// services/__tests__/inventory.test.ts
describe('InventoryService', () => {
  it('should allocate stock atomically', async () => {
    const service = new InventoryService(prisma, redis);
    const result = await service.allocateStock('SKU-001', 'LOC-001', 10, {
      type: 'SALES_ORDER',
      id: 'SO-001',
    });
    expect(result).toBe(true);
  });

  it('should prevent negative stock if disabled', async () => {
    const service = new InventoryService(prisma, redis);
    await expect(
      service.allocateStock('SKU-001', 'LOC-001', 1000, {
        type: 'SALES_ORDER',
        id: 'SO-002',
      })
    ).rejects.toThrow('Cannot allocate more than available');
  });

  it('should generate reorder suggestions correctly', async () => {
    const suggestions = await service.getReorderSuggestions();
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(s => {
      expect(s.currentStock).toBeLessThanOrEqual(s.reorderPoint);
    });
  });
});
```

---

## Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/swiftstock
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
NODE_ENV=development
API_BASE_URL=http://localhost:8000
BARCODE_API_KEY=your-api-key
```

---

## Next Steps After Phase 5

1. **Performance Optimization**: Add caching layer, optimize queries
2. **Analytics**: Implement ABC analysis, inventory turnover metrics
3. **Mobile App**: React Native or PWA for warehouse staff
4. **Integrations**: Connect to accounting (QuickBooks), shipping (ShipStation)
5. **Advanced Features**: Demand forecasting (ML), automated reordering

---

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| 1 | 3 days | PostgreSQL + Prisma migration |
| 2 | 4 days | Backend services + API |
| 3 | 4 days | React UI components |
| 4 | 3 days | WebSocket real-time sync |
| 5 | 2 days | Mobile barcode scanner |
| **Total** | **~16 days** | **Enterprise-ready platform** |

---

## Success Criteria

✅ Multi-location inventory support
✅ Concurrent stock operations without race conditions
✅ Immutable audit log of all stock movements
✅ Barcode scanning integration
✅ Professional reports and analytics
✅ Role-based access control
✅ 99.9% stock accuracy
✅ <200ms API response times
✅ Mobile-responsive UI
✅ Comprehensive test coverage (>80%)
