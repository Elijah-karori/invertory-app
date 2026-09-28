-- ============================================================================
-- ONT Network & Equipment Inventory System - PostgreSQL Schema Migration
-- Migration: 001_init_schema.sql
-- ============================================================================

-- 1. Users Table (RBAC: Admin, Store Manager, Field Technician, Support)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('Admin', 'Store Manager', 'Field Technician', 'Support')),
    department VARCHAR(64) DEFAULT 'Operations',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Item Catalog (Telecom Equipment & Bulk Material Specs)
CREATE TABLE IF NOT EXISTS item_catalog (
    sku VARCHAR(64) PRIMARY KEY,
    category VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    manufacturer VARCHAR(64) DEFAULT 'Generic',
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reorder_level INTEGER NOT NULL DEFAULT 3,
    is_serialized BOOLEAN NOT NULL DEFAULT false,
    specifications TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Serialized Units (Optical Network Terminals, Routers, OLT Cards, SFPs)
CREATE TABLE IF NOT EXISTS serialized_units (
    asset_id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) NOT NULL REFERENCES item_catalog(sku) ON UPDATE CASCADE,
    category VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    serial_number VARCHAR(128) NOT NULL UNIQUE,
    mac_address VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'In Stock' 
        CHECK (status IN ('In Stock', 'Issued / Out', 'Under Repair', 'Decommissioned')),
    condition VARCHAR(32) NOT NULL DEFAULT 'New' 
        CHECK (condition IN ('New', 'Good', 'Faulty', 'Refurbished', 'Not Recorded')),
    current_location VARCHAR(128) NOT NULL DEFAULT 'Main Store',
    current_custodian_id VARCHAR(64) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tasks (Field Installations, Maintenance, Fiber Cuts, Upgrades)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    assignee_id VARCHAR(64) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'Normal' 
        CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
    status VARCHAR(32) NOT NULL DEFAULT 'Assigned' 
        CHECK (status IN ('Assigned', 'Awaiting Stock', 'Ready', 'In Progress', 'Completed', 'Cancelled')),
    required_sku VARCHAR(64) REFERENCES item_catalog(sku) ON UPDATE CASCADE ON DELETE SET NULL,
    required_qty INTEGER NOT NULL DEFAULT 0,
    site VARCHAR(128),
    reference VARCHAR(128),
    notes TEXT,
    created_by_id VARCHAR(64) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    stock_ready_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customer Issues / Support Tickets (Device Swaps & Field Trouble Tickets)
CREATE TABLE IF NOT EXISTS customer_issues (
    ticket_id VARCHAR(64) PRIMARY KEY,
    customer_name VARCHAR(128) NOT NULL,
    account_number VARCHAR(64),
    issue_category VARCHAR(64) NOT NULL 
        CHECK (issue_category IN ('No Optical Link', 'Faulty ONT / Router', 'High Loss / Splice Needed', 'Wi-Fi / Password Reset', 'Equipment Damage', 'Upgrade Request')),
    assigned_tech_id VARCHAR(64) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    old_device_sn VARCHAR(128),
    new_device_sn VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'Open' 
        CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    logged_by_id VARCHAR(64) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Technician Requisitions (Material Requests from the Field)
CREATE TABLE IF NOT EXISTS technician_requisitions (
    req_id VARCHAR(64) PRIMARY KEY,
    tech_id VARCHAR(64) NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    sku VARCHAR(64) NOT NULL REFERENCES item_catalog(sku) ON UPDATE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'Pending Approval'
        CHECK (status IN ('Pending Approval', 'Approved - Ready', 'Awaiting Stock', 'Rejected', 'Fulfilled')),
    approved_by_id VARCHAR(64) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    approval_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Immutable Audit Transaction Ledger (Atomic Stock Movements)
CREATE TABLE IF NOT EXISTS transaction_ledger (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('Stock In', 'Stock Out')),
    sku VARCHAR(64) NOT NULL REFERENCES item_catalog(sku) ON UPDATE CASCADE,
    asset_id VARCHAR(64) REFERENCES serialized_units(asset_id) ON UPDATE CASCADE ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    performed_by_id VARCHAR(64) NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    cost_type VARCHAR(64) NOT NULL 
        CHECK (cost_type IN ('Procurement / Stock In', 'Installation', 'Replacement', 'Repair', 'Internal Use', 'Transfer', 'Adjustment', 'Other')),
    task_id VARCHAR(64) REFERENCES tasks(id) ON UPDATE CASCADE ON DELETE SET NULL,
    site VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & auditing
CREATE INDEX IF NOT EXISTS idx_ledger_sku ON transaction_ledger(sku);
CREATE INDEX IF NOT EXISTS idx_ledger_asset_id ON transaction_ledger(asset_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON transaction_ledger(date);
CREATE INDEX IF NOT EXISTS idx_ledger_task_id ON transaction_ledger(task_id);
CREATE INDEX IF NOT EXISTS idx_serialized_status ON serialized_units(status);
CREATE INDEX IF NOT EXISTS idx_serialized_custodian ON serialized_units(current_custodian_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
