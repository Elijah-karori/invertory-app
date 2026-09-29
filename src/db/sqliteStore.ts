import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import {
  User,
  ItemCatalog,
  SerializedUnit,
  TransactionLedger,
  Task,
  CustomerIssue,
  TechnicianRequisition,
  StockSummaryItem,
  DashboardStats,
  StockMovementPayload,
  SwapDevicePayload,
  UserRole
} from '../models/types.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'ont_inventory.sqlite');

export class SqliteDatabaseStore {
  private db: Database | null = null;
  private initialized: Promise<void>;

  constructor() {
    this.initialized = this.init();
  }

  public async ready(): Promise<void> {
    await this.initialized;
  }

  private async init(): Promise<void> {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      try {
        const filebuffer = fs.readFileSync(DB_PATH);
        this.db = new SQL.Database(filebuffer);
      } catch (err) {
        console.warn('Existing SQLite file corrupted or unreadable, creating fresh DB:', err);
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA foreign_keys = ON;');
    this.bootstrapSchemaAndSeed();
    this.persist();
  }

  private persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (e) {
      console.error('Failed to persist SQLite database to disk:', e);
    }
  }

  private bootstrapSchemaAndSeed(): void {
    if (!this.db) return;

    // 1. Schema DDL
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
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
          status TEXT NOT NULL DEFAULT 'In Stock',
          condition TEXT NOT NULL DEFAULT 'New',
          current_location TEXT NOT NULL DEFAULT 'Main Store',
          current_custodian_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          assignee_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'Normal',
          status TEXT NOT NULL DEFAULT 'Assigned',
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
          status TEXT NOT NULL DEFAULT 'Open',
          logged_by_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS technician_requisitions (
          req_id TEXT PRIMARY KEY,
          tech_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
          sku TEXT NOT NULL REFERENCES item_catalog(sku) ON UPDATE CASCADE,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          reason TEXT,
          status TEXT NOT NULL DEFAULT 'Pending Approval',
          approved_by_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          approval_date TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transaction_ledger (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL DEFAULT (date('now')),
          direction TEXT NOT NULL,
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
    `);

    // 2. Check if users seeded
    const userCountRes = this.db.exec("SELECT COUNT(*) as count FROM users;");
    const count = userCountRes[0]?.values[0]?.[0] || 0;
    if (Number(count) === 0) {
      this.seedData();
    }
  }

  private seedData(): void {
    if (!this.db) return;

    this.db.run(`
      INSERT INTO users (id, name, email, role, department) VALUES
      ('USR-001', 'Sarah Jenkins', 'admin@ontnetwork.isp', 'Admin', 'Network Operations Center'),
      ('USR-002', 'Otieno Moses', 'otienomoses998@gmail.com', 'Store Manager', 'Logistics & Warehouse'),
      ('USR-003', 'Dennis Kiprop', 'dennis.tech@ontnetwork.isp', 'Field Technician', 'Field Engineering'),
      ('USR-004', 'Faith Wambui', 'faith.tech@ontnetwork.isp', 'Field Technician', 'FTTH Installations'),
      ('USR-005', 'Kevin Mutua', 'support@ontnetwork.isp', 'Support', 'Customer Experience');

      INSERT INTO item_catalog (sku, category, model, manufacturer, unit_cost, reorder_level, is_serialized, specifications) VALUES
      ('SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', 'Huawei', 3800.00, 5, 1, '1GE + 3FE + 1POTS + 1USB + 2.4G Wi-Fi GPON'),
      ('SKU-ONT-HG8145V5', 'XPON/ONT', 'EchoLife HG8145V5', 'Huawei', 4500.00, 3, 1, 'Dual-band Wi-Fi (2.4G/5G) + 4 GE ports'),
      ('SKU-ONT-EG8145V5', 'XPON/ONT', 'EG8145V5', 'Huawei', 4800.00, 3, 1, 'Intelligent routing-type ONT, Gigabit AC Wi-Fi'),
      ('SKU-ONT-HG8145V6', 'XPON/ONT', 'OptiXstar HG8145V6', 'Huawei', 6200.00, 2, 1, 'Wi-Fi 6 GPON terminal, 4*GE + 1*POTS'),
      ('SKU-ONT-HG8245H', 'XPON/ONT', 'EchoLife HG8245H', 'Huawei', 4100.00, 3, 1, '4GE + 2POTS + 1USB + Wi-Fi GPON'),
      ('SKU-ONT-XPON', 'XPON/ONT', 'XPON Dual-Mode Router', 'Generic', 3200.00, 6, 1, 'Dual-mode EPON/GPON ONU 1GE+1FE'),
      ('SKU-ONT-GPON', 'XPON/ONT', 'GPON Router Standard', 'Generic', 3100.00, 5, 1, 'Standard GPON Optical Network Terminal SC/UPC'),
      ('SKU-ONT-AN5506', 'XPON/ONT', 'AN5506-04-FS', 'FiberHome', 4300.00, 2, 1, 'Fiberhome GPON 4 GE ports, Wi-Fi'),
      ('SKU-RTR-TLWR842N', 'Wireless Router', 'TL-WR842N 300Mbps', 'TP-Link', 2100.00, 4, 1, '300Mbps Multi-Function Wireless N Router'),
      ('SKU-RTR-ZLTX25', 'Wireless Router', 'ZLT X25 Indoor CPE', 'Tozed', 5200.00, 2, 1, 'Indoor LTE/Fiber dual-WAN Wireless Router'),
      ('SKU-NET-AR611VW', 'Enterprise Router', 'NetEngine AR611VW', 'Huawei', 18500.00, 2, 1, 'Enterprise branch router, 1*GE Combo WAN, 4*GE LAN'),
      ('SKU-FAT-16P', 'FAT Box', '16-Port Fiber Access Terminal', 'OpticTech', 1900.00, 2, 1, 'Outdoor IP65 16-core Fiber Distribution Box'),
      ('SKU-SPL-1X8', 'Passive Optics', '1x8 Optical PLC Splitter', 'Corning', 450.00, 5, 0, 'Mini steel tube PLC splitter SC/UPC'),
      ('SKU-ATB-100', 'Passive Optics', 'Access Terminal Box 2-Port', 'Generic', 180.00, 8, 0, 'Indoor Rosette Terminal Box 2 Core'),
      ('SKU-ADP-BOX', 'Passive Optics', 'Fiber Adapter Box SC/UPC', 'Generic', 95.00, 10, 0, 'Simplex SC/UPC blue female coupler adapter'),
      ('SKU-PWR-ADP', 'Accessories', '12V 1.5A Power Adapter', 'Huntkey', 350.00, 10, 0, 'Universal DC power supply for ONTs'),
      ('SKU-CBL-DROP', 'Fiber Cable', '2-Core FTTH Drop Cable Roll 2km', 'CommScope', 14500.00, 2, 0, 'Outdoor G.657A1 drop cable 2km drum'),
      ('SKU-CBL-OUTDOOR', 'Fiber Cable', 'Outdoor Fiber Cable Roll 1km', 'CommScope', 9800.00, 2, 0, 'Armored outdoor single-mode fiber roll 1km'),
      ('SKU-CBL-OUTDOOR-ETHER', 'Copper Cable', 'Outdoor Shielded Cat6 Cable 305m', 'D-Link', 11200.00, 2, 0, 'Weatherproof UV-resistant Cat6 FTP cable drum');

      INSERT INTO serialized_units (asset_id, sku, category, model, serial_number, mac_address, status, condition, current_location, current_custodian_id, notes) VALUES
      ('INV-ONT-0001', 'SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', '4857544321A89F01', '48:57:02:1A:89:F1', 'In Stock', 'New', 'Main Store - Rack A1', NULL, 'Optical power -18.2 dBm.'),
      ('INV-ONT-0002', 'SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', '4857544321A89F02', '48:57:02:1A:89:F2', 'In Stock', 'New', 'Main Store - Rack A1', NULL, 'Provisioned firmware v4.1'),
      ('INV-ONT-0003', 'SKU-ONT-HG8546M', 'XPON/ONT', 'EchoLife HG8546M', '4857544321A89F03', '48:57:02:1A:89:F3', 'Issued / Out', 'Good', 'Westlands Plot 14', 'USR-003', 'Issued for TASK-0001'),
      ('INV-ONT-0004', 'SKU-ONT-HG8145V5', 'XPON/ONT', 'EchoLife HG8145V5', '4857544378B44122', 'A4:6C:2A:44:12:01', 'In Stock', 'New', 'Main Store - Rack A2', NULL, 'Dual-band Wi-Fi 5 ONT'),
      ('INV-ONT-0005', 'SKU-ONT-HG8145V5', 'XPON/ONT', 'EchoLife HG8145V5', '4857544378B44123', 'A4:6C:2A:44:12:02', 'Under Repair', 'Faulty', 'Service Bench 2', NULL, 'Swapped from TKT-4491: Red LOS alarm'),
      ('INV-ONT-0006', 'SKU-ONT-EG8145V5', 'XPON/ONT', 'EG8145V5', '4857544399CC8100', '00:E0:4C:99:CC:81', 'In Stock', 'New', 'Main Store - High Priority', NULL, 'Enterprise ready'),
      ('INV-ONT-0007', 'SKU-ONT-HG8145V6', 'XPON/ONT', 'OptiXstar HG8145V6', '4857544366DD1044', '20:08:ED:66:DD:10', 'In Stock', 'New', 'Main Store - Secure Vault', NULL, 'Wi-Fi 6 gigabit terminal'),
      ('INV-ONT-0008', 'SKU-ONT-HG8245H', 'XPON/ONT', 'EchoLife HG8245H', '4857544300EE5512', '70:AF:6A:00:EE:55', 'In Stock', 'Good', 'Main Store - Rack B1', NULL, 'Factory reset verified'),
      ('INV-ONT-0009', 'SKU-ONT-AN5506', 'XPON/ONT', 'AN5506-04-FS', 'FHTT44919022AA11', '00:0B:82:90:22:AA', 'In Stock', 'New', 'Main Store - Rack B2', NULL, 'FiberHome OLT compatible'),
      ('INV-RTR-0001', 'SKU-RTR-TLWR842N', 'Wireless Router', 'TL-WR842N 300Mbps', 'TP21098420011944', '50:C7:BF:09:84:20', 'In Stock', 'New', 'Main Store - Router Bin 4', NULL, 'Configured PPPoE'),
      ('INV-RTR-0002', 'SKU-RTR-ZLTX25', 'Wireless Router', 'ZLT X25 Indoor CPE', 'ZLT8894211029411', '9C:3D:CF:88:94:21', 'Issued / Out', 'Good', 'Kilimani Tower A - Unit 4B', 'USR-004', 'Issued for backup LTE'),
      ('INV-NET-0001', 'SKU-NET-AR611VW', 'Enterprise Router', 'NetEngine AR611VW', 'AR611VW202409001', '00:1E:10:81:44:90', 'In Stock', 'New', 'Secure Vault B', NULL, 'Includes IPsec VPN license'),
      ('INV-FAT-0001', 'SKU-FAT-16P', 'FAT Box', '16-Port Fiber Access Terminal', 'FAT16P-2024-NBO-01', 'N/A', 'In Stock', 'New', 'Outside Storage C', NULL, 'With 16 SC/UPC pigtails');

      INSERT INTO tasks (id, title, assignee_id, priority, status, required_sku, required_qty, site, reference, notes, created_by_id, stock_ready_at) VALUES
      ('TASK-0001', 'New FTTH Installation - Plot 14 Westlands', 'USR-003', 'High', 'In Progress', 'SKU-ONT-HG8546M', 1, 'Westlands Plot 14', 'WO-9982', 'Customer 50Mbps Fiber Pro. Device INV-ONT-0003 issued.', 'USR-002', '2026-09-22 10:00:00'),
      ('TASK-0002', 'Faulty ONT Swap at Parklands Court #12', 'USR-003', 'Critical', 'Awaiting Stock', 'SKU-ONT-HG8145V5', 1, 'Parklands Court #12', 'TKT-4491', 'Intermittent optical loss. Customer VIP SLA.', 'USR-002', NULL),
      ('TASK-0003', 'FAT Expansion & Drop Splicing - Kilimani', 'USR-004', 'Normal', 'Ready', 'SKU-SPL-1X8', 2, 'Kilimani Junction FAT-04', 'MAINT-104', 'Splice two 1x8 splitters for 16 new subscribers.', 'USR-001', '2026-09-25 08:00:00'),
      ('TASK-0004', 'SME Branch Setup - NetEngine Router Config', 'USR-003', 'Normal', 'Assigned', 'SKU-NET-AR611VW', 1, 'Upperhill Financial Hub', 'CORP-882', 'Deliver and install enterprise gateway router.', 'USR-001', NULL);

      INSERT INTO customer_issues (ticket_id, customer_name, account_number, issue_category, assigned_tech_id, old_device_sn, new_device_sn, status, logged_by_id, notes) VALUES
      ('TKT-4491', 'Amina Abdalla', 'ACC-88219', 'Faulty ONT / Router', 'USR-003', '4857544378B44123', '4857544321A89F01', 'In Progress', 'USR-005', 'Replaced faulty HG8145V5 with HG8546M.'),
      ('TKT-4492', 'Apex Logistics Ltd', 'ACC-10492', 'No Optical Link', 'USR-004', 'N/A', 'N/A', 'Open', 'USR-005', 'Aerial drop cable severed during road work.'),
      ('TKT-4493', 'Dr. David Mwangi', 'ACC-33120', 'Wi-Fi / Password Reset', 'USR-005', 'N/A', 'N/A', 'Resolved', 'USR-005', 'Guided customer with 5GHz SSID configuration.');

      INSERT INTO technician_requisitions (req_id, tech_id, sku, quantity, reason, status, approved_by_id, approval_date) VALUES
      ('REQ-001', 'USR-003', 'SKU-SPL-1X8', 4, 'Drop splitters for upcoming estate connection', 'Approved - Ready', 'USR-002', '2026-09-25 10:00:00'),
      ('REQ-002', 'USR-004', 'SKU-CBL-DROP', 1, 'Westlands fiber feeder project', 'Pending Approval', NULL, NULL);

      INSERT INTO transaction_ledger (id, date, direction, sku, asset_id, quantity, unit_cost, total_cost, performed_by_id, cost_type, task_id, site, notes, created_at) VALUES
      ('TXN-2026-0001', '2026-09-20', 'Stock In', 'SKU-ONT-HG8546M', 'INV-ONT-0001', 1, 3800.00, 3800.00, 'USR-001', 'Procurement / Stock In', NULL, 'Main Store', 'PO-9844 batch received', '2026-09-20 08:30:00'),
      ('TXN-2026-0002', '2026-09-20', 'Stock In', 'SKU-ONT-HG8546M', 'INV-ONT-0002', 1, 3800.00, 3800.00, 'USR-001', 'Procurement / Stock In', NULL, 'Main Store', 'PO-9844 batch received', '2026-09-20 08:31:00'),
      ('TXN-2026-0003', '2026-09-21', 'Stock In', 'SKU-SPL-1X8', NULL, 10, 450.00, 4500.00, 'USR-002', 'Procurement / Stock In', NULL, 'Main Store', 'Bulk optical splitters receipt', '2026-09-21 09:15:00'),
      ('TXN-2026-0004', '2026-09-22', 'Stock Out', 'SKU-ONT-HG8546M', 'INV-ONT-0003', 1, 3800.00, 3800.00, 'USR-002', 'Installation', 'TASK-0001', 'Westlands Plot 14', 'Issued to tech Dennis Kiprop for installation', '2026-09-22 11:00:00'),
      ('TXN-2026-0005', '2026-09-23', 'Stock In', 'SKU-CBL-DROP', NULL, 2, 14500.00, 29000.00, 'USR-001', 'Procurement / Stock In', NULL, 'Central Yard', '2 drums 2km drop cable', '2026-09-23 14:20:00');
    `);
  }

  // --- SQLITE QUERY HELPERS ---
  private queryAll(sql: string, params: any[] = []): any[] {
    if (!this.db) return [];
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } catch (e) {
      console.error('SQLite query error:', e, sql);
      return [];
    }
  }

  private queryOne(sql: string, params: any[] = []): any | null {
    const rows = this.queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  private execute(sql: string, params: any[] = []): void {
    if (!this.db) return;
    try {
      this.db.run(sql, params);
      this.persist();
    } catch (e) {
      console.error('SQLite execution error:', e, sql);
      throw e;
    }
  }

  // Users
  public getUsers(): User[] {
    return this.queryAll('SELECT id, name, email, role, department, created_at as createdAt, updated_at as updatedAt FROM users ORDER BY name ASC;');
  }

  public getUserById(id: string): User | undefined {
    const row = this.queryOne('SELECT id, name, email, role, department, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?;', [id]);
    return row || undefined;
  }

  public getUserByEmail(email: string): User | undefined {
    const row = this.queryOne('SELECT id, name, email, role, department, created_at as createdAt, updated_at as updatedAt FROM users WHERE LOWER(email) = LOWER(?);', [email.trim()]);
    return row || undefined;
  }

  // Item Catalog
  public getCatalog(role?: UserRole): ItemCatalog[] {
    const isAdmin = role === 'Admin';
    const rows = this.queryAll(`
      SELECT sku, category, model, manufacturer, unit_cost as unitCost, reorder_level as reorderLevel, 
             is_serialized as isSerialized, specifications, created_at as createdAt, updated_at as updatedAt
      FROM item_catalog
      ORDER BY sku ASC;
    `);

    return rows.map(r => ({
      sku: r.sku,
      category: r.category,
      model: r.model,
      manufacturer: r.manufacturer,
      unitCost: isAdmin ? Number(r.unitCost || 0) : 0,
      reorderLevel: Number(r.reorderLevel || 3),
      isSerialized: Boolean(r.isSerialized),
      specifications: r.specifications,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  public addCatalogItem(item: Omit<ItemCatalog, 'createdAt' | 'updatedAt'>, user: User): ItemCatalog {
    if (!this.db) throw new Error('Database not ready.');

    const cleanSku = item.sku.trim().toUpperCase();
    if (!cleanSku) throw new Error('SKU identifier is required.');
    if (!item.model || !item.category) throw new Error('Model name and category are required.');

    const existing = this.queryOne('SELECT sku FROM item_catalog WHERE sku = ?;', [cleanSku]);
    if (existing) {
      throw new Error(`SKU "${cleanSku}" already exists in the catalog.`);
    }

    this.execute(`
      INSERT INTO item_catalog (sku, category, model, manufacturer, unit_cost, reorder_level, is_serialized, specifications)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      cleanSku,
      item.category.trim(),
      item.model.trim(),
      item.manufacturer?.trim() || 'Generic',
      Number(item.unitCost || 0),
      Number(item.reorderLevel || 3),
      item.isSerialized ? 1 : 0,
      item.specifications?.trim() || ''
    ]);

    const row = this.queryOne(`
      SELECT sku, category, model, manufacturer, unit_cost as unitCost, reorder_level as reorderLevel,
             is_serialized as isSerialized, specifications, created_at as createdAt, updated_at as updatedAt
      FROM item_catalog
      WHERE sku = ?;
    `, [cleanSku]);

    const isAdmin = user.role === 'Admin';
    return {
      sku: row.sku,
      category: row.category,
      model: row.model,
      manufacturer: row.manufacturer,
      unitCost: isAdmin ? Number(row.unitCost || 0) : 0,
      reorderLevel: Number(row.reorderLevel || 3),
      isSerialized: Boolean(row.isSerialized),
      specifications: row.specifications,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  // Serialized Units
  public getSerializedUnits(): SerializedUnit[] {
    const rows = this.queryAll(`
      SELECT s.asset_id as assetId, s.sku, s.category, s.model, s.serial_number as serialNumber,
             s.mac_address as macAddress, s.status, s.condition, s.current_location as currentLocation,
             s.current_custodian_id as currentCustodianId, u.name as currentCustodianName,
             s.notes, s.created_at as createdAt, s.updated_at as updatedAt
      FROM serialized_units s
      LEFT JOIN users u ON s.current_custodian_id = u.id
      ORDER BY s.asset_id ASC;
    `);

    return rows.map(r => ({
      assetId: r.assetId,
      sku: r.sku,
      category: r.category,
      model: r.model,
      serialNumber: r.serialNumber,
      macAddress: r.macAddress,
      status: r.status,
      condition: r.condition,
      currentLocation: r.currentLocation,
      currentCustodianId: r.currentCustodianId,
      currentCustodianName: r.currentCustodianName || undefined,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  // Stock Summary with Net Balances
  public getStockSummary(role?: UserRole): StockSummaryItem[] {
    const isAdmin = role === 'Admin';
    const rows = this.queryAll(`
      SELECT 
        c.sku, c.model, c.category, c.is_serialized as isSerialized, c.unit_cost as unitCost, c.reorder_level as reorderLevel,
        COALESCE(SUM(CASE WHEN t.direction = 'Stock In' THEN t.quantity ELSE 0 END), 0) AS totalIn,
        COALESCE(SUM(CASE WHEN t.direction = 'Stock Out' THEN t.quantity ELSE 0 END), 0) AS totalOut
      FROM item_catalog c
      LEFT JOIN transaction_ledger t ON c.sku = t.sku
      GROUP BY c.sku, c.model, c.category, c.is_serialized, c.unit_cost, c.reorder_level
      ORDER BY c.sku ASC;
    `);

    return rows.map(r => {
      const inQty = Number(r.totalIn || 0);
      const outQty = Number(r.totalOut || 0);
      const net = inQty - outQty;
      const reorderLevel = Number(r.reorderLevel || 3);
      let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (net <= 0) {
        status = 'Out of Stock';
      } else if (net <= reorderLevel) {
        status = 'Low Stock';
      }

      const unitCost = Number(r.unitCost || 0);

      return {
        sku: r.sku,
        model: r.model,
        category: r.category,
        isSerialized: Boolean(r.isSerialized),
        totalIn: inQty,
        totalOut: outQty,
        netRemaining: net,
        status,
        reorderLevel,
        unitCost: isAdmin ? unitCost : undefined,
        stockValue: isAdmin ? Math.max(0, net) * unitCost : undefined
      };
    });
  }

  // Immutable Audit Ledger (Admin Only)
  public getLedger(role?: UserRole): TransactionLedger[] {
    const isAdmin = role === 'Admin';
    if (!isAdmin) return [];

    const rows = this.queryAll(`
      SELECT t.id, t.date, t.direction, t.sku, c.model, t.asset_id as assetId, t.quantity,
             t.unit_cost as unitCost, t.total_cost as totalCost, t.performed_by_id as performedById,
             u.name as performedByName, u.role as performedByRole, t.cost_type as costType,
             t.task_id as taskId, t.site, t.notes, t.created_at as createdAt
      FROM transaction_ledger t
      LEFT JOIN item_catalog c ON t.sku = c.sku
      LEFT JOIN users u ON t.performed_by_id = u.id
      ORDER BY t.created_at DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      date: r.date,
      direction: r.direction,
      sku: r.sku,
      model: r.model || r.sku,
      assetId: r.assetId || null,
      quantity: Number(r.quantity),
      unitCost: Number(r.unitCost || 0),
      totalCost: Number(r.totalCost || 0),
      performedById: r.performedById,
      performedByName: r.performedByName || 'Staff',
      performedByRole: r.performedByRole || 'Staff',
      costType: r.costType,
      taskId: r.taskId || null,
      site: r.site || '',
      notes: r.notes || '',
      createdAt: r.createdAt
    }));
  }

  // Tasks
  public getTasks(user?: User): Task[] {
    let sql = `
      SELECT t.id, t.title, t.assignee_id as assigneeId, u.name as assigneeName, u.email as assigneeEmail,
             t.priority, t.status, t.required_sku as requiredSku, c.model as requiredModel,
             t.required_qty as requiredQty, t.site, t.reference, t.notes,
             t.created_by_id as createdById, cb.name as createdByName, t.stock_ready_at as stockReadyAt,
             t.created_at as createdAt, t.updated_at as updatedAt
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users cb ON t.created_by_id = cb.id
      LEFT JOIN item_catalog c ON t.required_sku = c.sku
    `;
    const params: any[] = [];
    if (user && user.role === 'Field Technician') {
      sql += ' WHERE t.assignee_id = ?';
      params.push(user.id);
    }
    sql += ' ORDER BY t.created_at DESC;';

    const rows = this.queryAll(sql, params);
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      assigneeId: r.assigneeId || null,
      assigneeName: r.assigneeName || undefined,
      assigneeEmail: r.assigneeEmail || undefined,
      priority: r.priority,
      status: r.status,
      requiredSku: r.requiredSku || null,
      requiredModel: r.requiredModel || undefined,
      requiredQty: Number(r.requiredQty || 0),
      site: r.site || '',
      reference: r.reference || '',
      notes: r.notes || '',
      createdById: r.createdById || undefined,
      createdByName: r.createdByName || undefined,
      stockReadyAt: r.stockReadyAt || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  // Customer Issues
  public getIssues(): CustomerIssue[] {
    const rows = this.queryAll(`
      SELECT i.ticket_id as ticketId, i.customer_name as customerName, i.account_number as accountNumber,
             i.issue_category as issueCategory, i.assigned_tech_id as assignedTechId, u.name as assignedTechName,
             i.old_device_sn as oldDeviceSN, i.new_device_sn as newDeviceSN, i.status,
             i.logged_by_id as loggedById, lb.name as loggedByName, i.notes,
             i.created_at as createdAt, i.updated_at as updatedAt
      FROM customer_issues i
      LEFT JOIN users u ON i.assigned_tech_id = u.id
      LEFT JOIN users lb ON i.logged_by_id = lb.id
      ORDER BY i.created_at DESC;
    `);

    return rows.map(r => ({
      ticketId: r.ticketId,
      customerName: r.customerName,
      accountNumber: r.accountNumber || '',
      issueCategory: r.issueCategory,
      assignedTechId: r.assignedTechId || null,
      assignedTechName: r.assignedTechName || undefined,
      oldDeviceSN: r.oldDeviceSN || 'N/A',
      newDeviceSN: r.newDeviceSN || 'N/A',
      status: r.status,
      loggedById: r.loggedById || undefined,
      loggedByName: r.loggedByName || undefined,
      notes: r.notes || '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  // Technician Requisitions
  public getRequisitions(user?: User): TechnicianRequisition[] {
    let sql = `
      SELECT r.req_id as reqId, r.tech_id as techId, u.name as techName, r.sku, c.model,
             r.quantity, r.reason, r.status, r.approved_by_id as approvedById,
             ap.name as approvedByName, r.approval_date as approvalDate, r.created_at as createdAt
      FROM technician_requisitions r
      LEFT JOIN users u ON r.tech_id = u.id
      LEFT JOIN users ap ON r.approved_by_id = ap.id
      LEFT JOIN item_catalog c ON r.sku = c.sku
    `;
    const params: any[] = [];
    if (user && user.role === 'Field Technician') {
      sql += ' WHERE r.tech_id = ?';
      params.push(user.id);
    }
    sql += ' ORDER BY r.created_at DESC;';

    const rows = this.queryAll(sql, params);
    return rows.map(r => ({
      reqId: r.reqId,
      techId: r.techId,
      techName: r.techName || 'Technician',
      sku: r.sku,
      model: r.model || r.sku,
      quantity: Number(r.quantity),
      reason: r.reason || '',
      status: r.status,
      approvedById: r.approvedById || undefined,
      approvedByName: r.approvedByName || undefined,
      approvalDate: r.approvalDate || undefined,
      createdAt: r.createdAt
    }));
  }

  // Dashboard Aggregated Stats
  public getDashboardStats(role?: UserRole): DashboardStats {
    const isAdmin = role === 'Admin';
    const summary = this.getStockSummary(role);

    let totalInStock = 0;
    let lowStockCount = 0;
    for (const s of summary) {
      if (s.netRemaining > 0) totalInStock += s.netRemaining;
      if (s.status === 'Low Stock' || s.status === 'Out of Stock') lowStockCount++;
    }

    const unitsOutRow = this.queryOne("SELECT COUNT(*) as count FROM serialized_units WHERE status = 'Issued / Out';");
    const activeTasksRow = this.queryOne("SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('Completed', 'Cancelled');");
    const awaitingStockTasksRow = this.queryOne("SELECT COUNT(*) as count FROM tasks WHERE status = 'Awaiting Stock';");
    const openIssuesRow = this.queryOne("SELECT COUNT(*) as count FROM customer_issues WHERE status NOT IN ('Resolved', 'Closed');");

    const stats: DashboardStats = {
      totalSkus: summary.length,
      totalUnitsInStock: totalInStock,
      totalUnitsOut: Number(unitsOutRow?.count || 0),
      lowStockItemsCount: lowStockCount,
      activeTasksCount: Number(activeTasksRow?.count || 0),
      awaitingStockTasksCount: Number(awaitingStockTasksRow?.count || 0),
      openIssuesCount: Number(openIssuesRow?.count || 0)
    };

    if (isAdmin) {
      let totalValue = 0;
      for (const s of summary) {
        if (s.stockValue) totalValue += s.stockValue;
      }

      const spendRow = this.queryOne("SELECT COALESCE(SUM(total_cost), 0) as spend FROM transaction_ledger WHERE direction = 'Stock In';");
      const outCostRow = this.queryOne("SELECT COALESCE(SUM(total_cost), 0) as cost FROM transaction_ledger WHERE direction = 'Stock Out';");
      const replaceCostRow = this.queryOne("SELECT COALESCE(SUM(total_cost), 0) as cost FROM transaction_ledger WHERE direction = 'Stock Out' AND LOWER(cost_type) LIKE '%replacement%';");

      const costTypesRows = this.queryAll(`
        SELECT cost_type as type, SUM(quantity) as qty, SUM(total_cost) as cost
        FROM transaction_ledger
        WHERE direction = 'Stock Out'
        GROUP BY cost_type
        ORDER BY cost DESC;
      `);

      stats.totalStockValue = totalValue;
      stats.stockInSpend = Number(spendRow?.spend || 0);
      stats.stockOutCost = Number(outCostRow?.cost || 0);
      stats.replacementCost = Number(replaceCostRow?.cost || 0);
      stats.costByType = costTypesRows.map(r => ({
        type: r.type,
        qty: Number(r.qty),
        cost: Number(r.cost)
      }));
    }

    return stats;
  }

  // --- ATOMIC SQLITE TRANSACTIONS ---

  public executeStockMovement(payload: StockMovementPayload, performedBy: User): { success: boolean; message: string; transaction?: TransactionLedger } {
    if (!this.db) throw new Error('Database not ready.');
    const { direction, sku, assetId, quantity, site, costType, taskId, notes } = payload;

    if (!direction || !sku || !quantity || quantity <= 0) {
      throw new Error('Direction, SKU, and positive quantity are required.');
    }

    const catalogRow = this.queryOne('SELECT sku, model, category, unit_cost, is_serialized FROM item_catalog WHERE sku = ?;', [sku]);
    if (!catalogRow) {
      throw new Error(`SKU "${sku}" does not exist in item catalog.`);
    }

    // Begin SQLite Transaction
    this.db.run('BEGIN TRANSACTION;');

    try {
      let unitCost = Number(catalogRow.unit_cost || 0);

      if (assetId) {
        const assetRow = this.queryOne('SELECT asset_id, sku, status, serial_number FROM serialized_units WHERE asset_id = ?;', [assetId]);
        if (!assetRow) {
          throw new Error(`Asset ID "${assetId}" was not found.`);
        }
        if (assetRow.sku !== sku) {
          throw new Error(`Asset "${assetId}" SKU (${assetRow.sku}) does not match requested SKU (${sku}).`);
        }

        if (direction === 'Stock Out') {
          if (assetRow.status !== 'In Stock') {
            throw new Error(`Cannot Stock Out: Asset ${assetId} (${assetRow.serial_number}) is currently "${assetRow.status}", not "In Stock".`);
          }
          this.db.run(
            `UPDATE serialized_units 
             SET status = 'Issued / Out', current_location = ?, current_custodian_id = ?, 
                 notes = COALESCE(notes, '') || ' | [Issued to ' || ? || ']', updated_at = datetime('now')
             WHERE asset_id = ?;`,
            [site || 'Field Site', performedBy.id, performedBy.name, assetId]
          );
        } else if (direction === 'Stock In') {
          if (assetRow.status === 'In Stock') {
            throw new Error(`Cannot Stock In: Asset ${assetId} is already marked as "In Stock".`);
          }
          this.db.run(
            `UPDATE serialized_units 
             SET status = 'In Stock', current_location = ?, current_custodian_id = NULL,
                 notes = COALESCE(notes, '') || ' | [Returned by ' || ? || ']', updated_at = datetime('now')
             WHERE asset_id = ?;`,
            [site || 'Main Store', performedBy.name, assetId]
          );
        }
      } else if (Boolean(catalogRow.is_serialized) && direction === 'Stock Out') {
        throw new Error(`SKU "${sku}" is a serialized item. You must select the specific Serialized Unit to issue.`);
      }

      // Check balance for bulk Stock Out
      if (!assetId && direction === 'Stock Out') {
        const balRow = this.queryOne(`
          SELECT 
            COALESCE(SUM(CASE WHEN direction = 'Stock In' THEN quantity ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN direction = 'Stock Out' THEN quantity ELSE 0 END), 0) AS net
          FROM transaction_ledger WHERE sku = ?;
        `, [sku]);
        const available = Number(balRow?.net || 0);
        if (available < quantity) {
          throw new Error(`Insufficient inventory: Requested ${quantity}, but only ${available} available in stock.`);
        }
      }

      // Generate Txn ID
      const countRow = this.queryOne('SELECT COUNT(*) as count FROM transaction_ledger;');
      const nextNum = Number(countRow?.count || 0) + 1;
      const txnId = `TXN-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      const totalCost = unitCost * quantity;
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.split('T')[0];

      this.db.run(`
        INSERT INTO transaction_ledger (id, date, direction, sku, asset_id, quantity, unit_cost, total_cost, performed_by_id, cost_type, task_id, site, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [
        txnId,
        todayDate,
        direction,
        sku,
        assetId || null,
        quantity,
        unitCost,
        totalCost,
        performedBy.id,
        costType || (direction === 'Stock In' ? 'Procurement / Stock In' : 'Installation'),
        taskId || null,
        site || (direction === 'Stock In' ? 'Main Store' : 'Field'),
        notes || '',
        nowIso
      ]);

      // If Stock In, auto-ready tasks
      if (direction === 'Stock In') {
        const waitingTasks = this.queryAll("SELECT id, required_qty FROM tasks WHERE status = 'Awaiting Stock' AND required_sku = ?;", [sku]);
        for (const t of waitingTasks) {
          this.db.run(
            `UPDATE tasks SET status = 'Ready', stock_ready_at = datetime('now'), notes = COALESCE(notes, '') || ' | [Auto-Ready: Stock Replenished]' WHERE id = ?;`,
            [t.id]
          );
        }
      }

      // Commit transaction
      this.db.run('COMMIT;');
      this.persist();

      const newTxn: TransactionLedger = {
        id: txnId,
        date: todayDate,
        direction,
        sku,
        model: catalogRow.model,
        assetId: assetId || null,
        quantity,
        unitCost,
        totalCost,
        performedById: performedBy.id,
        performedByName: performedBy.name,
        performedByRole: performedBy.role,
        costType: (costType || 'Installation') as any,
        taskId: taskId || null,
        site: site || '',
        notes: notes || '',
        createdAt: nowIso
      };

      return {
        success: true,
        message: `SQLite Transaction Committed: ${direction} of ${quantity} × ${catalogRow.model} (${txnId}).`,
        transaction: newTxn
      };
    } catch (err) {
      this.db.run('ROLLBACK;');
      throw err;
    }
  }

  // Update Serialized Unit
  public updateSerializedUnit(assetId: string, updates: Partial<SerializedUnit>, performedBy: User): SerializedUnit {
    if (!this.db) throw new Error('Database not ready.');
    const unit = this.queryOne('SELECT * FROM serialized_units WHERE asset_id = ?;', [assetId]);
    if (!unit) throw new Error(`Device ${assetId} not found.`);

    const previousStatus = unit.status;
    const newStatus = updates.status || unit.status;

    if (newStatus !== previousStatus) {
      if (previousStatus === 'In Stock' && newStatus === 'Issued / Out') {
        this.executeStockMovement({
          direction: 'Stock Out',
          sku: unit.sku,
          assetId: unit.asset_id,
          quantity: 1,
          site: updates.currentLocation || 'Field Site',
          costType: 'Installation',
          notes: updates.notes || `Issued via device manager to ${updates.currentCustodianId || performedBy.name}`
        }, performedBy);
      } else if (previousStatus === 'Issued / Out' && newStatus === 'In Stock') {
        this.executeStockMovement({
          direction: 'Stock In',
          sku: unit.sku,
          assetId: unit.asset_id,
          quantity: 1,
          site: updates.currentLocation || 'Main Store',
          costType: 'Internal Use',
          notes: updates.notes || 'Returned to store via device manager'
        }, performedBy);
      }
    }

    const condition = updates.condition || unit.condition;
    const location = updates.currentLocation || unit.current_location;
    const custodianId = updates.currentCustodianId !== undefined ? updates.currentCustodianId : unit.current_custodian_id;
    const appendNotes = updates.notes ? ` | [${new Date().toISOString().split('T')[0]}] ${updates.notes}` : '';

    this.execute(`
      UPDATE serialized_units
      SET status = ?, condition = ?, current_location = ?, current_custodian_id = ?, notes = COALESCE(notes, '') || ?, updated_at = datetime('now')
      WHERE asset_id = ?;
    `, [newStatus, condition, location, custodianId, appendNotes, assetId]);

    const updated = this.queryOne(`
      SELECT s.asset_id as assetId, s.sku, s.category, s.model, s.serial_number as serialNumber,
             s.mac_address as macAddress, s.status, s.condition, s.current_location as currentLocation,
             s.current_custodian_id as currentCustodianId, u.name as currentCustodianName,
             s.notes, s.created_at as createdAt, s.updated_at as updatedAt
      FROM serialized_units s
      LEFT JOIN users u ON s.current_custodian_id = u.id
      WHERE s.asset_id = ?;
    `, [assetId]);

    return updated;
  }

  // Customer Support Device Swap
  public swapCustomerDevice(payload: SwapDevicePayload, performedBy: User): CustomerIssue {
    if (!this.db) throw new Error('Database not ready.');
    const { customerName, accountNumber, issueCategory, assignedTechId, oldDeviceSN, newDeviceSN, notes } = payload;

    this.db.run('BEGIN TRANSACTION;');
    try {
      // 1. Old device recovery
      if (oldDeviceSN && oldDeviceSN !== 'N/A') {
        this.db.run(`
          UPDATE serialized_units
          SET status = 'Under Repair', condition = 'Faulty', current_location = 'RMA / Repair Bench', current_custodian_id = NULL,
              notes = COALESCE(notes, '') || ' | [Recovered from ${customerName}] Faulty device swapped.'
          WHERE serial_number = ? OR asset_id = ?;
        `, [oldDeviceSN, oldDeviceSN]);
      }

      // 2. New device issuance
      let newAsset: any = null;
      if (newDeviceSN && newDeviceSN !== 'N/A') {
        newAsset = this.queryOne('SELECT * FROM serialized_units WHERE serial_number = ? OR asset_id = ?;', [newDeviceSN, newDeviceSN]);
        if (!newAsset) {
          throw new Error(`New replacement device S/N "${newDeviceSN}" not found in inventory.`);
        }
        if (newAsset.status !== 'In Stock') {
          throw new Error(`Replacement device ${newAsset.asset_id} cannot be issued: current status is "${newAsset.status}".`);
        }

        // Issue new device
        this.db.run(`
          UPDATE serialized_units
          SET status = 'Issued / Out', current_location = ?, current_custodian_id = ?,
              notes = COALESCE(notes, '') || ' | [Issued to ${customerName}] Replacement swap.'
          WHERE asset_id = ?;
        `, [`Customer Site (${customerName})`, performedBy.id, newAsset.asset_id]);

        // Write ledger entry
        const countRow = this.queryOne('SELECT COUNT(*) as count FROM transaction_ledger;');
        const txnId = `TXN-${new Date().getFullYear()}-${String(Number(countRow?.count || 0) + 1).padStart(4, '0')}`;
        const catRow = this.queryOne('SELECT unit_cost FROM item_catalog WHERE sku = ?;', [newAsset.sku]);
        const unitCost = Number(catRow?.unit_cost || 0);

        this.db.run(`
          INSERT INTO transaction_ledger (id, date, direction, sku, asset_id, quantity, unit_cost, total_cost, performed_by_id, cost_type, site, notes)
          VALUES (?, date('now'), 'Stock Out', ?, ?, 1, ?, ?, ?, 'Replacement', ?, ?);
        `, [
          txnId,
          newAsset.sku,
          newAsset.asset_id,
          unitCost,
          unitCost,
          performedBy.id,
          `Customer Site (${customerName})`,
          `Swapped replacement for faulty device S/N ${oldDeviceSN || 'N/A'}`
        ]);
      }

      // Create ticket
      const ticketCountRow = this.queryOne('SELECT COUNT(*) as count FROM customer_issues;');
      const ticketId = `TKT-${String(Number(ticketCountRow?.count || 0) + 4491)}`;

      this.db.run(`
        INSERT INTO customer_issues (ticket_id, customer_name, account_number, issue_category, assigned_tech_id, old_device_sn, new_device_sn, status, logged_by_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'In Progress', ?, ?);
      `, [
        ticketId,
        customerName,
        accountNumber || '',
        issueCategory,
        assignedTechId || null,
        oldDeviceSN || 'N/A',
        newDeviceSN || 'N/A',
        performedBy.id,
        notes || 'Hardware swap completed.'
      ]);

      this.db.run('COMMIT;');
      this.persist();

      const created = this.queryOne(`
        SELECT i.ticket_id as ticketId, i.customer_name as customerName, i.account_number as accountNumber,
               i.issue_category as issueCategory, i.assigned_tech_id as assignedTechId, u.name as assignedTechName,
               i.old_device_sn as oldDeviceSN, i.new_device_sn as newDeviceSN, i.status,
               i.logged_by_id as loggedById, lb.name as loggedByName, i.notes,
               i.created_at as createdAt, i.updated_at as updatedAt
        FROM customer_issues i
        LEFT JOIN users u ON i.assigned_tech_id = u.id
        LEFT JOIN users lb ON i.logged_by_id = lb.id
        WHERE i.ticket_id = ?;
      `, [ticketId]);

      return created;
    } catch (e) {
      this.db.run('ROLLBACK;');
      throw e;
    }
  }

  // Tasks Management
  public createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'stockReadyAt'>, createdBy: User): Task {
    const countRow = this.queryOne('SELECT COUNT(*) as count FROM tasks;');
    const id = `TASK-${String(Number(countRow?.count || 0) + 1).padStart(4, '0')}`;

    let initialStatus = taskData.status || 'Assigned';
    let stockReadyAt: string | null = null;

    if (taskData.requiredSku && taskData.requiredQty > 0) {
      const balRow = this.queryOne(`
        SELECT 
          COALESCE(SUM(CASE WHEN direction = 'Stock In' THEN quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN direction = 'Stock Out' THEN quantity ELSE 0 END), 0) AS net
        FROM transaction_ledger WHERE sku = ?;
      `, [taskData.requiredSku]);
      const available = Number(balRow?.net || 0);
      if (available < taskData.requiredQty) {
        initialStatus = 'Awaiting Stock';
      } else {
        initialStatus = 'Ready';
        stockReadyAt = new Date().toISOString();
      }
    }

    this.execute(`
      INSERT INTO tasks (id, title, assignee_id, priority, status, required_sku, required_qty, site, reference, notes, created_by_id, stock_ready_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      id,
      taskData.title,
      taskData.assigneeId || null,
      taskData.priority || 'Normal',
      initialStatus,
      taskData.requiredSku || null,
      taskData.requiredQty || 0,
      taskData.site || '',
      taskData.reference || '',
      taskData.notes || '',
      createdBy.id,
      stockReadyAt
    ]);

    const task = this.queryOne(`
      SELECT t.id, t.title, t.assignee_id as assigneeId, u.name as assigneeName, u.email as assigneeEmail,
             t.priority, t.status, t.required_sku as requiredSku, c.model as requiredModel,
             t.required_qty as requiredQty, t.site, t.reference, t.notes,
             t.created_by_id as createdById, cb.name as createdByName, t.stock_ready_at as stockReadyAt,
             t.created_at as createdAt, t.updated_at as updatedAt
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users cb ON t.created_by_id = cb.id
      LEFT JOIN item_catalog c ON t.required_sku = c.sku
      WHERE t.id = ?;
    `, [id]);

    return task;
  }

  public updateTaskStatus(taskId: string, status: Task['status'], user: User): Task {
    this.execute(`
      UPDATE tasks
      SET status = ?, notes = COALESCE(notes, '') || ' | [Status ' || ? || ' by ' || ? || ']', updated_at = datetime('now')
      WHERE id = ?;
    `, [status, status, user.name, taskId]);

    const task = this.queryOne(`
      SELECT t.id, t.title, t.assignee_id as assigneeId, u.name as assigneeName, u.email as assigneeEmail,
             t.priority, t.status, t.required_sku as requiredSku, c.model as requiredModel,
             t.required_qty as requiredQty, t.site, t.reference, t.notes,
             t.created_by_id as createdById, cb.name as createdByName, t.stock_ready_at as stockReadyAt,
             t.created_at as createdAt, t.updated_at as updatedAt
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users cb ON t.created_by_id = cb.id
      LEFT JOIN item_catalog c ON t.required_sku = c.sku
      WHERE t.id = ?;
    `, [taskId]);

    return task;
  }

  // Requisitions
  public createRequisition(techId: string, sku: string, quantity: number, reason: string): TechnicianRequisition {
    const countRow = this.queryOne('SELECT COUNT(*) as count FROM technician_requisitions;');
    const reqId = `REQ-${String(Number(countRow?.count || 0) + 1).padStart(3, '0')}`;

    this.execute(`
      INSERT INTO technician_requisitions (req_id, tech_id, sku, quantity, reason, status)
      VALUES (?, ?, ?, ?, ?, 'Pending Approval');
    `, [reqId, techId, sku, quantity, reason]);

    const req = this.queryOne(`
      SELECT r.req_id as reqId, r.tech_id as techId, u.name as techName, r.sku, c.model,
             r.quantity, r.reason, r.status, r.approved_by_id as approvedById,
             ap.name as approvedByName, r.approval_date as approvalDate, r.created_at as createdAt
      FROM technician_requisitions r
      LEFT JOIN users u ON r.tech_id = u.id
      LEFT JOIN users ap ON r.approved_by_id = ap.id
      LEFT JOIN item_catalog c ON r.sku = c.sku
      WHERE r.req_id = ?;
    `, [reqId]);

    return req;
  }

  public updateRequisitionStatus(reqId: string, action: 'Approved' | 'Rejected', approver: User): TechnicianRequisition {
    const current = this.queryOne('SELECT * FROM technician_requisitions WHERE req_id = ?;', [reqId]);
    if (!current) throw new Error(`Requisition ${reqId} not found.`);
    if (current.status !== 'Pending Approval') {
      throw new Error(`Requisition ${reqId} is already ${current.status}.`);
    }

    let finalStatus = action === 'Rejected' ? 'Rejected' : 'Approved - Ready';
    if (action === 'Approved') {
      const balRow = this.queryOne(`
        SELECT 
          COALESCE(SUM(CASE WHEN direction = 'Stock In' THEN quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN direction = 'Stock Out' THEN quantity ELSE 0 END), 0) AS net
        FROM transaction_ledger WHERE sku = ?;
      `, [current.sku]);
      const available = Number(balRow?.net || 0);
      if (available < current.quantity) {
        finalStatus = 'Awaiting Stock';
      }
    }

    this.execute(`
      UPDATE technician_requisitions
      SET status = ?, approved_by_id = ?, approval_date = datetime('now')
      WHERE req_id = ?;
    `, [finalStatus, approver.id, reqId]);

    const updated = this.queryOne(`
      SELECT r.req_id as reqId, r.tech_id as techId, u.name as techName, r.sku, c.model,
             r.quantity, r.reason, r.status, r.approved_by_id as approvedById,
             ap.name as approvedByName, r.approval_date as approvalDate, r.created_at as createdAt
      FROM technician_requisitions r
      LEFT JOIN users u ON r.tech_id = u.id
      LEFT JOIN users ap ON r.approved_by_id = ap.id
      LEFT JOIN item_catalog c ON r.sku = c.sku
      WHERE r.req_id = ?;
    `, [reqId]);

    return updated;
  }

  // Full Multi-Sheet Excel Workbook
  public generateFullExcelWorkbook(role?: UserRole): Buffer {
    const isAdmin = role === 'Admin';
    const wb = XLSX.utils.book_new();

    // Sheet 1: Stock Summary
    const summaryData = this.getStockSummary(role).map(s => {
      const row: any = {
        'SKU': s.sku,
        'Model / Name': s.model,
        'Category': s.category,
        'Serialized': s.isSerialized ? 'YES' : 'NO',
        'Total In': s.totalIn,
        'Total Out': s.totalOut,
        'Net Remaining': s.netRemaining,
        'Status': s.status,
        'Reorder Level': s.reorderLevel
      };
      if (isAdmin) {
        row['Unit Cost (KES)'] = s.unitCost || 0;
        row['Stock Valuation (KES)'] = s.stockValue || 0;
      }
      return row;
    });
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Stock Summary');

    // Sheet 2: Serialized Inventory
    const serialData = this.getSerializedUnits().map(u => ({
      'Asset ID': u.assetId,
      'SKU': u.sku,
      'Model': u.model,
      'Serial Number': u.serialNumber,
      'MAC Address': u.macAddress || 'N/A',
      'Status': u.status,
      'Condition': u.condition,
      'Current Location': u.currentLocation,
      'Custodian': u.currentCustodianName || 'Store',
      'Notes': u.notes || ''
    }));
    const wsSerial = XLSX.utils.json_to_sheet(serialData);
    XLSX.utils.book_append_sheet(wb, wsSerial, 'Serialized Units');

    // Sheet 3: Audit Ledger (Admin Only)
    if (isAdmin) {
      const ledgerData = this.getLedger(role).map(t => ({
        'Transaction ID': t.id,
        'Date': t.date,
        'Direction': t.direction,
        'SKU': t.sku,
        'Model': t.model || '',
        'Asset ID': t.assetId || 'N/A',
        'Quantity': t.quantity,
        'Unit Cost (KES)': t.unitCost,
        'Total Cost (KES)': t.totalCost,
        'Performed By': `${t.performedByName || ''} (${t.performedByRole || ''})`,
        'Cost Type': t.costType,
        'Task / Ref': t.taskId || '',
        'Site': t.site || '',
        'Notes': t.notes || ''
      }));
      const wsLedger = XLSX.utils.json_to_sheet(ledgerData);
      XLSX.utils.book_append_sheet(wb, wsLedger, 'Audit Ledger');
    }

    // Sheet 4: Field Tasks
    const taskData = this.getTasks().map(t => ({
      'Task ID': t.id,
      'Title': t.title,
      'Assignee': t.assigneeName || 'Unassigned',
      'Priority': t.priority,
      'Status': t.status,
      'Required SKU': t.requiredSku || 'None',
      'Required Qty': t.requiredQty,
      'Site': t.site || '',
      'Reference': t.reference || '',
      'Notes': t.notes || ''
    }));
    const wsTasks = XLSX.utils.json_to_sheet(taskData);
    XLSX.utils.book_append_sheet(wb, wsTasks, 'Field Tasks');

    // Sheet 5: Customer Issues
    const issueData = this.getIssues().map(i => ({
      'Ticket ID': i.ticketId,
      'Customer Name': i.customerName,
      'Account No': i.accountNumber || '',
      'Category': i.issueCategory,
      'Assigned Tech': i.assignedTechName || 'Unassigned',
      'Old S/N': i.oldDeviceSN || '',
      'New S/N': i.newDeviceSN || '',
      'Status': i.status,
      'Notes': i.notes || ''
    }));
    const wsIssues = XLSX.utils.json_to_sheet(issueData);
    XLSX.utils.book_append_sheet(wb, wsIssues, 'Customer Issues');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer as Buffer;
  }
}

export const sqliteDbStore = new SqliteDatabaseStore();
