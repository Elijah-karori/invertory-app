export type UserRole = 'Admin' | 'Store Manager' | 'Field Technician' | 'Support';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemCatalog {
  sku: string;
  category: string;
  model: string;
  manufacturer?: string;
  unitCost: number; // Masked to 0 for non-Admins
  reorderLevel: number;
  isSerialized: boolean;
  specifications?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AssetStatus = 'In Stock' | 'Issued / Out' | 'Under Repair' | 'Decommissioned';
export type AssetCondition = 'New' | 'Good' | 'Faulty' | 'Refurbished' | 'Not Recorded';

export interface SerializedUnit {
  assetId: string;
  sku: string;
  category: string;
  model: string;
  serialNumber: string;
  macAddress?: string;
  status: AssetStatus;
  condition: AssetCondition;
  currentLocation: string;
  currentCustodianId?: string | null;
  currentCustodianName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MovementDirection = 'Stock In' | 'Stock Out';

export type CostType = 
  | 'Procurement / Stock In'
  | 'Installation'
  | 'Replacement'
  | 'Repair'
  | 'Internal Use'
  | 'Transfer'
  | 'Adjustment'
  | 'Other';

export interface TransactionLedger {
  id: string;
  date: string;
  direction: MovementDirection;
  sku: string;
  model?: string;
  assetId?: string | null;
  quantity: number;
  unitCost: number; // 0 for non-Admins
  totalCost: number; // 0 for non-Admins
  performedById: string;
  performedByName?: string;
  performedByRole?: string;
  costType: CostType;
  taskId?: string | null;
  site?: string;
  notes?: string;
  createdAt: string;
}

export type TaskPriority = 'Low' | 'Normal' | 'High' | 'Critical';
export type TaskStatus = 'Assigned' | 'Awaiting Stock' | 'Ready' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Task {
  id: string;
  title: string;
  assigneeId?: string | null;
  assigneeName?: string;
  assigneeEmail?: string;
  priority: TaskPriority;
  status: TaskStatus;
  requiredSku?: string | null;
  requiredModel?: string;
  requiredQty: number;
  site?: string;
  reference?: string;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  stockReadyAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerIssue {
  ticketId: string;
  customerName: string;
  accountNumber?: string;
  issueCategory: string;
  assignedTechId?: string | null;
  assignedTechName?: string;
  oldDeviceSN?: string;
  newDeviceSN?: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  loggedById?: string;
  loggedByName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianRequisition {
  reqId: string;
  techId: string;
  techName: string;
  sku: string;
  model?: string;
  quantity: number;
  reason?: string;
  status: 'Pending Approval' | 'Approved - Ready' | 'Awaiting Stock' | 'Rejected' | 'Fulfilled';
  approvedById?: string;
  approvedByName?: string;
  approvalDate?: string;
  createdAt: string;
}

export interface StockSummaryItem {
  sku: string;
  model: string;
  category: string;
  isSerialized: boolean;
  totalIn: number;
  totalOut: number;
  netRemaining: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  reorderLevel: number;
  unitCost?: number; // masked if non-admin
  stockValue?: number; // masked if non-admin
}

export interface DashboardStats {
  totalSkus: number;
  totalUnitsInStock: number;
  totalUnitsOut: number;
  lowStockItemsCount: number;
  activeTasksCount: number;
  awaitingStockTasksCount: number;
  openIssuesCount: number;
  // Admin-only financial metrics
  totalStockValue?: number;
  stockInSpend?: number;
  stockOutCost?: number;
  replacementCost?: number;
  costByType?: { type: string; qty: number; cost: number }[];
}

export interface StockMovementPayload {
  direction: MovementDirection;
  sku: string;
  assetId?: string;
  quantity: number;
  site?: string;
  costType?: CostType;
  taskId?: string;
  notes?: string;
}

export interface SwapDevicePayload {
  ticketId?: string;
  customerName: string;
  accountNumber?: string;
  issueCategory: string;
  assignedTechId?: string;
  oldDeviceSN: string;
  newDeviceSN: string;
  notes?: string;
}
