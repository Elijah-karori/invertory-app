# ONT Network & Equipment Inventory System - Production Architecture & Migration Guide

This application replaces Google Sheets/Apps Script architectures with a robust PostgreSQL relational database, REST API, and modern React interface.

---

## 1. Relational Database Setup & Migrations (PostgreSQL)

### Prerequisites
- PostgreSQL 14+ database server running
- \`psql\` command-line utility

### Running Migrations
Execute the migrations in order:

\`\`\`bash
# 1. Initialize PostgreSQL database
psql -U postgres -c "CREATE DATABASE ont_inventory;"

# 2. Run DDL schema migration (tables, indexes, foreign keys, constraints)
psql -U postgres -d ont_inventory -f migrations/001_init_schema.sql

# 3. Seed initial ISP catalog items, serialized ONTs, staff, tasks, and audit ledger
psql -U postgres -d ont_inventory -f migrations/002_seed_isp_data.sql
\`\`\`

---

## 2. Environment Configuration

Create or update your \`.env\` file in the workspace root:

\`\`\`env
PORT=3000
DATABASE_URL="postgres://postgres:your_password@localhost:5432/ont_inventory?sslmode=disable"
\`\`\`

---

## 3. Starting the Full-Stack Application

\`\`\`bash
# Install dependencies
npm install

# Start Express server with Vite middleware in development
npm run dev

# Or build and start for production
npm run build
npm run start
\`\`\`

The web application is accessible at **http://localhost:3000**.

---

## 4. Multi-Sheet Excel Reports with Go & Excelize

The repository includes a standalone Go utility in \`scripts/generate_report_excelize.go\` that connects directly to the PostgreSQL database and outputs a multi-sheet \`.xlsx\` workbook report.

### Running with Go:
\`\`\`bash
cd scripts
go get github.com/xuri/excelize/v2
go get github.com/lib/pq
go run generate_report_excelize.go
\`\`\`

Generated workbook sheets:
1. **Stock Summary**: SKU, Model, Category, Tracking type, Total In, Total Out, Net Remaining, Status, Unit Cost, and Stock Valuation.
2. **Serialized Inventory**: Physical units tracked by S/N, MAC address, lifecycle status, condition, site, and custodian.
3. **Audit Ledger**: Immutable history of all transactions with timestamps, cost types, task IDs, and performed by.
4. **Field Tasks**: Work orders, priority levels, and required stock allocation.
5. **Customer Issues**: Support trouble tickets, old device S/N, and replacement device S/N.

---

## 5. Role-Based Access Control (RBAC) & Financial Masking

The system enforces strict permission levels:
- **Admin**: Full visibility over all modules, valuation metrics, procurement spend, replacement costs, and the immutable audit ledger.
- **Store Manager**: Full operational access to record stock movements, edit serial units, manage work orders, and approve requisitions. Financial unit costs are automatically masked.
- **Field Technician**: Restricted view to their assigned work orders, personal material requisitions, and serial units issued to them.
- **Support**: Ability to log customer issues and execute atomic ONT swaps.
