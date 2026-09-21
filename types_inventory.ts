// TypeScript Types for SwiftStock Enterprise Edition

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ============================================================================
// USER & AUTH
// ============================================================================

export enum Role {
  ADMIN = "ADMIN",
  STORE_MANAGER = "STORE_MANAGER",
  WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER",
  CASHIER = "CASHIER",
  CLERK = "CLERK",
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  managedLocationIds: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  expiresIn: number;
  user: User;
}

// ============================================================================
// LOCATION
// ============================================================================

export enum LocationType {
  WAREHOUSE = "WAREHOUSE",
  RETAIL_STORE = "RETAIL_STORE",
  THIRD_PARTY_LOGISTICS = "THIRD_PARTY_LOGISTICS",
  OFFICE = "OFFICE",
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  active: boolean;
  managerIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PRODUCT & INVENTORY
// ============================================================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  barcode?: string;
  unitPrice: number;
  costPrice: number;
  reorderLevel: number;
  targetStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLevel {
  id: string;
  productId: string;
  locationId: string;
  product?: Product;
  location?: Location;

  // Physical location
  aisle?: string;
  bin?: string;

  // Stock values
  onHand: number;
  committed: number;    // Allocated to pending orders
  available: number;    // onHand - committed
  incoming: number;     // From purchase orders in transit

  // Thresholds
  reorderPoint: number;
  targetStock: number;

  // Audit
  lastCountedAt?: Date;
  lastCountedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface StockValuation {
  productId: string;
  locationId: string;
  onHandQty: number;
  unitCost: number;
  totalValue: number;
  valuationMethod: ValuationMethod;
  lastUpdated: Date;
}

export interface ABCAnalysis {
  productId: string;
  sku: string;
  name: string;
  annualValue: number;
  percentageOfTotal: number;
  classification: "A" | "B" | "C";  // A: 80% value, B: 15%, C: 5%
}

// ============================================================================
// SUPPLIERS & PURCHASE ORDERS
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  paymentTerms: string;
  leadTimeDays: number;
  currency: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  supplierSku?: string;
  supplierPrice: number;
  minOrderQty: number;
  leadTimeDays: number;
}

export enum POStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  product?: Product;
  quantity: number;
  receivedQty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: Supplier;
  destinationLocationId: string;
  destinationLocation?: Location;
  status: POStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  createdAt: Date;
  sentDate?: Date;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  updatedAt: Date;
}

export interface ReceivePurchaseOrderPayload {
  poId: string;
  itemUpdates: Array<{
    itemId: string;
    receivedQty: number;
    discrepancyReason?: string;
  }>;
}

export interface ReorderSuggestion {
  productId: string;
  product: Product;
  locationId: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
  estimatedCost: number;
  estimatedDeliveryDate: Date;
  recommendedSupplier: Supplier;
}

// ============================================================================
// STOCK TRANSFERS
// ============================================================================

export enum TransferStatus {
  PENDING = "PENDING",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  product?: Product;
  quantity: number;
  receivedQty: number;
  discrepancyNotes?: string;
}

export interface StockTransfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocation?: Location;
  toLocation?: Location;
  status: TransferStatus;
  items: StockTransferItem[];
  createdBy: string;
  createdAt: Date;
  sentDate?: Date;
  receivedDate?: Date;
  updatedAt: Date;
}

export interface CreateStockTransferPayload {
  fromLocationId: string;
  toLocationId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
}

// ============================================================================
// STOCK ADJUSTMENTS
// ============================================================================

export enum AdjustmentReason {
  SPOILAGE = "SPOILAGE",
  SCRAP = "SCRAP",
  RECOUNT_DISCREPANCY = "RECOUNT_DISCREPANCY",
  THEFT = "THEFT",
  LOSS_IN_TRANSIT = "LOSS_IN_TRANSIT",
  DAMAGE = "DAMAGE",
  INVENTORY_CORRECTION = "INVENTORY_CORRECTION",
  OTHER = "OTHER",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface StockAdjustment {
  id: string;
  locationId: string;
  location?: Location;
  productId: string;
  product?: Product;
  reason: AdjustmentReason;
  quantity: number;  // Can be +/-
  notes?: string;
  status: ApprovalStatus;
  createdBy: string;
  createdByUser?: User;
  approvedBy?: string;
  approvedByUser?: User;
  createdAt: Date;
  approvedAt?: Date;
  updatedAt: Date;
}

export interface AdjustmentApprovalPayload {
  adjustmentId: string;
  approved: boolean;
  rejectionReason?: string;
}

// ============================================================================
// STOCKTAKE / CYCLE COUNTING
// ============================================================================

export enum StocktakeType {
  CYCLE_COUNT = "CYCLE_COUNT",
  FULL_INVENTORY = "FULL_INVENTORY",
  SPOT_CHECK = "SPOT_CHECK",
}

export enum StocktakeStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  ADJUSTMENT_PENDING = "ADJUSTMENT_PENDING",
}

export interface Stocktake {
  id: string;
  locationId: string;
  location?: Location;
  type: StocktakeType;
  status: StocktakeStatus;
  counts: StocktakeCount[];
  startedBy: string;
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface StocktakeCount {
  id: string;
  stocktakeId: string;
  productId: string;
  product?: Product;
  locationId: string;
  countedQty: number;
  bookQty: number;
  discrepancy: number;  // countedQty - bookQty
  countedBy: string;
  countedAt: Date;
}

export interface StocktakeDiscrepancy {
  product: Product;
  locationId: string;
  bookQty: number;
  countedQty: number;
  discrepancy: number;
  discrepancyPercent: number;
  suggestedAdjustment: {
    reason: AdjustmentReason;
    quantity: number;
  };
}

export interface StartStocktakePayload {
  locationId: string;
  type: StocktakeType;
  productIds?: string[];  // If null, include all products
}

// ============================================================================
// INVENTORY LEDGER
// ============================================================================

export enum LedgerReferenceType {
  PURCHASE_ORDER = "PURCHASE_ORDER",
  SALES_ORDER = "SALES_ORDER",
  STOCK_TRANSFER = "STOCK_TRANSFER",
  STOCK_ADJUSTMENT = "STOCK_ADJUSTMENT",
  STOCKTAKE = "STOCKTAKE",
  INITIAL_INVENTORY = "INITIAL_INVENTORY",
  RETURN_FROM_CUSTOMER = "RETURN_FROM_CUSTOMER",
  RETURN_TO_SUPPLIER = "RETURN_TO_SUPPLIER",
}

export interface InventoryLedgerEntry {
  id: string;
  productId: string;
  locationId?: string;
  delta: number;
  runningBalance: number;
  referenceType: LedgerReferenceType;
  referenceId?: string;
  unitCost?: number;
  totalCost?: number;
  createdAt: Date;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  tableName: string;
  recordId: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

export enum ValuationMethod {
  WEIGHTED_AVERAGE = "WEIGHTED_AVERAGE",
  FIFO = "FIFO",
  LIFO = "LIFO",
  STANDARD_COST = "STANDARD_COST",
}

export interface CompanySettings {
  id: string;
  allowNegativeStock: boolean;
  negativeStockThreshold: number;
  valuationMethod: ValuationMethod;
  lowStockAlertEnabled: boolean;
  lowStockAlertQty: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PERMISSIONS & AUTHORIZATION
// ============================================================================

export type Permission =
  | "inventory:view"
  | "inventory:adjust"
  | "inventory:approve-adjustment"
  | "reports:view"
  | "reports:export"
  | "transfers:create"
  | "transfers:manage"
  | "po:create"
  | "po:approve"
  | "po:receive"
  | "stocktake:conduct"
  | "stocktake:approve"
  | "supplier:manage"
  | "users:manage"
  | "settings:manage";

export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  [Role.ADMIN]: ["*"], // All permissions
  [Role.STORE_MANAGER]: [
    "inventory:view",
    "inventory:adjust",
    "reports:view",
    "transfers:create",
    "transfers:manage",
    "stocktake:conduct",
    "po:receive",
  ],
  [Role.WAREHOUSE_MANAGER]: [
    "inventory:view",
    "inventory:adjust",
    "reports:view",
    "transfers:create",
    "transfers:manage",
    "po:receive",
    "stocktake:conduct",
  ],
  [Role.CASHIER]: [
    "inventory:view",
    "reports:view",
  ],
  [Role.CLERK]: [
    "inventory:view",
    "stocktake:conduct",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = PERMISSION_MATRIX[role];
  return permissions?.includes("*") || permissions?.includes(permission) || false;
}

// ============================================================================
// BARCODE & SCANNING
// ============================================================================

export interface BarcodeLabel {
  id: string;
  productId: string;
  product: Product;
  barcode: string;
  format: "CODE128" | "QR";
  quantity: number;  // How many labels to print
}

export interface BarcodeScannedData {
  barcode: string;
  productId?: string;
  product?: Product;
  quantity: number;
  timestamp: Date;
}

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

export interface LowStockAlert {
  productId: string;
  product: Product;
  locationId: string;
  location: Location;
  currentQty: number;
  reorderPoint: number;
  daysUntilStockout: number;
  suggestedOrder: ReorderSuggestion;
}

export interface InventoryHealthScore {
  totalSku: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  turnoverRate: number;
  grossMargin: number;
  accuracy: number;  // Last stocktake accuracy %
}

export interface StockMovementReport {
  productId: string;
  period: "daily" | "weekly" | "monthly";
  inbound: number;
  outbound: number;
  adjustments: number;
  netMovement: number;
}
