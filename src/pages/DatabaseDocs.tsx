import React, { useState } from 'react';
import {
  Database,
  Code,
  FileCode,
  Terminal,
  FileSpreadsheet,
  Copy,
  Check,
  Server
} from 'lucide-react';

export const DatabaseDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sqlite' | 'sql' | 'prisma' | 'gorm' | 'excelize' | 'setup'>('sqlite');
  const [copied, setCopied] = useState<string | null>(null);

  const sqliteCode = `-- ============================================================================
-- Active Database Engine: SQLite (file: data/ont_inventory.sqlite)
-- Migration: migrations/sqlite_001_init.sql
-- ============================================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Store Manager', 'Field Technician', 'Support')),
    department TEXT DEFAULT 'Operations',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignee_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Awaiting Stock', 'Ready', 'In Progress', 'Completed', 'Cancelled')),
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

CREATE TABLE IF NOT EXISTS customer_issues (
    ticket_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    account_number TEXT,
    issue_category TEXT NOT NULL,
    assigned_tech_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    old_device_sn TEXT,
    new_device_sn TEXT,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    logged_by_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sqlMigrationCode = `-- ============================================================================
-- PostgreSQL Schema: 001_init_schema.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('Admin', 'Store Manager', 'Field Technician', 'Support')),
    department VARCHAR(64) DEFAULT 'Operations',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
);`;

  const setupGuide = `# Step-by-Step Production & Migration Setup Instructions

### 1. Prerequisites
- PostgreSQL 14+ database instance
- Node.js 20+ runtime
- (Optional) Go 1.21+ for Go-based reporting with Excelize

### 2. Configure Environment
Create a \`.env\` file in your server root:
\`\`\`env
PORT=3000
DATABASE_URL="postgres://postgres:password@localhost:5432/ont_inventory?sslmode=disable"
\`\`\`

### 3. Run Database Migrations
Execute the migrations directly using the \`psql\` CLI:
\`\`\`bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE ont_inventory;"

# 2. Run DDL schema migration
psql -U postgres -d ont_inventory -f migrations/001_init_schema.sql

# 3. Seed initial ISP catalog, serial units, staff, and tasks
psql -U postgres -d ont_inventory -f migrations/002_seed_isp_data.sql
\`\`\`

### 4. Start Full-Stack Development Server
\`\`\`bash
# Install dependencies
npm install

# Start Express REST API and Vite frontend together
npm run dev
\`\`\`
The application will be served at http://localhost:3000.

### 5. Running the Go Excelize Report Generator
To generate a comprehensive Excel workbook directly from PostgreSQL:
\`\`\`bash
cd scripts
go get github.com/xuri/excelize/v2
go get github.com/lib/pq
go run generate_report_excelize.go
\`\`\`
Output file: \`ont_inventory_report_<timestamp>.xlsx\``;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-600/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Database Architecture & Migration Blueprints</h2>
            <p className="text-xs text-slate-400">
              PostgreSQL DDL migrations, GORM models, Prisma schema, and Excelize batch reporting
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('sqlite')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono font-medium transition ${
            activeTab === 'sqlite' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Active SQLite Engine (data/ont_inventory.sqlite)</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono font-medium transition ${
            activeTab === 'sql' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>PostgreSQL (001_init_schema.sql)</span>
        </button>

        <button
          onClick={() => setActiveTab('prisma')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono font-medium transition ${
            activeTab === 'prisma' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Prisma Schema (schema.prisma)</span>
        </button>

        <button
          onClick={() => setActiveTab('gorm')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono font-medium transition ${
            activeTab === 'gorm' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Go GORM (gorm_models.go)</span>
        </button>

        <button
          onClick={() => setActiveTab('excelize')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono font-medium transition ${
            activeTab === 'excelize' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Go Excelize Script</span>
        </button>

        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono font-medium transition ${
            activeTab === 'setup' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Setup & Migration Guide</span>
        </button>
      </div>

      {/* Code Display Area */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
        <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
          <span>
            {activeTab === 'sqlite' && 'migrations/sqlite_001_init.sql (Active SQLite DB)'}
            {activeTab === 'sql' && 'migrations/001_init_schema.sql'}
            {activeTab === 'prisma' && 'src/models/schema.prisma'}
            {activeTab === 'gorm' && 'src/models/gorm_models.go'}
            {activeTab === 'excelize' && 'scripts/generate_report_excelize.go'}
            {activeTab === 'setup' && 'README_SETUP.md'}
          </span>

          <button
            onClick={() => {
              if (activeTab === 'sqlite') copyToClipboard(sqliteCode, 'code');
              if (activeTab === 'sql') copyToClipboard(sqlMigrationCode, 'code');
              if (activeTab === 'setup') copyToClipboard(setupGuide, 'code');
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
          >
            {copied === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied === 'code' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre selection:bg-cyan-500/30">
          {activeTab === 'sqlite' && sqliteCode}
          {activeTab === 'sql' && sqlMigrationCode}
          {activeTab === 'prisma' && `// Viewable at src/models/schema.prisma in this repository`}
          {activeTab === 'gorm' && `// Viewable at src/models/gorm_models.go in this repository`}
          {activeTab === 'excelize' && `// Viewable at scripts/generate_report_excelize.go in this repository`}
          {activeTab === 'setup' && setupGuide}
        </div>
      </div>
    </div>
  );
};
