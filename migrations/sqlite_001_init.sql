-- ============================================================================
-- ONT Network & Equipment Inventory System - SQLite Schema Migration
-- Migration: sqlite_001_init.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Users Table (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Store Manager', 'Field Technician', 'Support')),
    department TEXT DEFAULT 'Operations',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Item Catalog
CREATE TABLE IF NOT EXISTS item_catalog (
    sku TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    model TEXT NOT NULL,
    manufacturer TEXT DEFAULT 'Generic',
    unit_cost REAL NOT NULL DEFAULT 0.00,
    reorder_level INTEGER NOT NULL DEFAULT 3,
    is_serialized INTEGER NOT NULL DEFAULT 0,
    specifications TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Serialized Units
CREATE TABLE IF NOT EXISTS serialized_units (
    asset_id TEXT PRIMARY KEY,
    sku TEXT NOT NULL REFERENCES item_catalog(sku) ON UPDATE CASCADE,
    category TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    mac_address TEXT,
    status TEXT NOT NULL DEFAULT 'In Stock' 
        CHECK (status IN ('In Stock', 'Issued / Out', 'Under Repair', 'Decommissioned')),
    condition TEXT NOT NULL DEFAULT 'New' 
        CHECK (condition IN ('New', 'Good', 'Faulty', 'Refurbished', 'Not Recorded')),
    current_location TEXT NOT NULL DEFAULT 'Main Store',
    current_custodian_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Tasks (Work Orders & Installations)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignee_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'Normal' 
        CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'Assigned' 
        CHECK (status IN ('Assigned', 'Awaiting Stock', 'Ready', 'In Progress', 'Completed', 'Cancelled')),
    required_sku TEXT REFERENCES item_catalog(sku) ON UPDATE CASCADE ON DELETE SET NULL,
    required_qty INTEGER NOT NULL DEFAULT 0,
    site TEXT,
    reference TEXT,
    notes TEXT,
    created_by_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    stock_ready_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Customer Issues / Support Tickets
CREATE TABLE IF NOT EXISTS customer_issues (
    ticket_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    account_number TEXT,
    issue_category TEXT NOT NULL,
    assigned_tech_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    old_device_sn TEXT,
    new_device_sn TEXT,
    status TEXT NOT NULL DEFAULT 'Open' 
        CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    logged_by_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. Technician Material Requisitions
CREATE TABLE IF NOT EXISTS technician_requisitions (
    req_id TEXT PRIMARY KEY,
    tech_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    sku TEXT NOT NULL REFERENCES item_catalog(sku) ON UPDATE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending Approval'
        CHECK (status IN ('Pending Approval', 'Approved - Ready', 'Awaiting Stock', 'Rejected', 'Fulfilled')),
    approved_by_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    approval_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Immutable Audit Transaction Ledger (Atomic Stock Movements)
CREATE TABLE IF NOT EXISTS transaction_ledger (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL DEFAULT (date('now')),
    direction TEXT NOT NULL CHECK (direction IN ('Stock In', 'Stock Out')),
    sku TEXT NOT NULL REFERENCES item_catalog(sku) ON UPDATE CASCADE,
    asset_id TEXT REFERENCES serialized_units(asset_id) ON UPDATE CASCADE ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost REAL NOT NULL DEFAULT 0.00,
    total_cost REAL NOT NULL DEFAULT 0.00,
    performed_by_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    cost_type TEXT NOT NULL,
    task_id TEXT REFERENCES tasks(id) ON UPDATE CASCADE ON DELETE SET NULL,
    site TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sqlite_ledger_sku ON transaction_ledger(sku);
CREATE INDEX IF NOT EXISTS idx_sqlite_ledger_asset_id ON transaction_ledger(asset_id);
CREATE INDEX IF NOT EXISTS idx_sqlite_ledger_date ON transaction_ledger(date);
CREATE INDEX IF NOT EXISTS idx_sqlite_serialized_status ON serialized_units(status);
CREATE INDEX IF NOT EXISTS idx_sqlite_tasks_status ON tasks(status);
