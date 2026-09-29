import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbStore } from './src/db/store.ts';
import { User, UserRole, StockMovementPayload, SwapDevicePayload } from './src/models/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Extend Request type to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Authentication & RBAC Middleware
const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Fallback default user for convenient initial state (Sarah Jenkins - Admin)
    req.user = dbStore.getUserById('USR-001')!;
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  // Decode user ID or email encoded in simulated JWT token
  try {
    let userId = token;
    if (token.startsWith('user:')) {
      userId = token.replace('user:', '');
    }
    const user = dbStore.getUserById(userId) || dbStore.getUserByEmail(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token. User not found.' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

// Role Guard Middleware Helper
const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Current role: "${req.user.role}".`
      });
    }
    next();
  };
};

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Auth Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, userId } = req.body;
  let user: User | undefined;
  if (userId) {
    user = dbStore.getUserById(userId);
  } else if (email) {
    user = dbStore.getUserByEmail(email);
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid user email or ID.' });
  }

  // Simulated Bearer token contains user id
  const token = `user:${user.id}`;
  res.json({
    token,
    user
  });
});

app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json(req.user);
});

app.get('/api/users', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbStore.getUsers());
});

// 2. Dashboard KPIs & Financial Metrics
app.get('/api/dashboard/stats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const stats = dbStore.getDashboardStats(req.user?.role);
  res.json(stats);
});

// 3. Item Catalog & Stock Summary
app.get('/api/catalog', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const catalog = dbStore.getCatalog(req.user?.role);
  res.json(catalog);
});

app.post('/api/catalog', authenticate, requireRole('Admin', 'Store Manager'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const newItem = dbStore.addCatalogItem(req.body, req.user!);
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add catalog item.' });
  }
});

app.get('/api/stock/summary', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const summary = dbStore.getStockSummary(req.user?.role);
  res.json(summary);
});

// 4. Serialized Units Tracking
app.get('/api/serialized', authenticate, (req: AuthenticatedRequest, res: Response) => {
  let units = dbStore.getSerializedUnits();
  const { status, search, sku } = req.query;

  if (status && typeof status === 'string' && status !== 'all') {
    units = units.filter(u => u.status === status);
  }
  if (sku && typeof sku === 'string' && sku !== 'all') {
    units = units.filter(u => u.sku === sku);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    units = units.filter(u =>
      u.assetId.toLowerCase().includes(q) ||
      u.serialNumber.toLowerCase().includes(q) ||
      (u.macAddress && u.macAddress.toLowerCase().includes(q)) ||
      u.model.toLowerCase().includes(q) ||
      u.currentLocation.toLowerCase().includes(q)
    );
  }

  res.json(units);
});

app.patch('/api/serialized/:assetId', authenticate, requireRole('Admin', 'Store Manager'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = dbStore.updateSerializedUnit(req.params.assetId, req.body, req.user!);
    res.json({ success: true, unit: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update serialized device.' });
  }
});

// 5. Stock Movements & Transactions (Atomic Execution)
app.post('/api/transactions/move', authenticate, requireRole('Admin', 'Store Manager'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload: StockMovementPayload = req.body;
    const result = dbStore.executeStockMovement(payload, req.user!);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Movement failed.' });
  }
});

// Audit Ledger (Strictly Admin Only)
app.get('/api/transactions/ledger', authenticate, requireRole('Admin'), (req: AuthenticatedRequest, res: Response) => {
  const ledger = dbStore.getLedger(req.user?.role);
  res.json(ledger);
});

// 6. Field Tasks Management
app.get('/api/tasks', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const tasks = dbStore.getTasks(req.user);
  res.json(tasks);
});

app.post('/api/tasks', authenticate, requireRole('Admin', 'Store Manager'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = dbStore.createTask(req.body, req.user!);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const updated = dbStore.updateTaskStatus(req.params.id, status, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Customer Support & Device Swaps
app.get('/api/issues', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbStore.getIssues());
});

app.post('/api/issues/swap', authenticate, requireRole('Admin', 'Store Manager', 'Support'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload: SwapDevicePayload = req.body;
    const issue = dbStore.swapCustomerDevice(payload, req.user!);
    res.status(201).json({ success: true, message: `Ticket ${issue.ticketId} logged and device swap completed.`, issue });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Equipment swap failed.' });
  }
});

// 8. Technician Requisitions
app.get('/api/requisitions', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbStore.getRequisitions(req.user));
});

app.post('/api/requisitions', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sku, quantity, reason } = req.body;
    const techId = req.user!.id;
    const reqRecord = dbStore.createRequisition(techId, sku, Number(quantity), reason);
    res.status(201).json(reqRecord);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/requisitions/:reqId/action', authenticate, requireRole('Admin', 'Store Manager'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action } = req.body;
    const updated = dbStore.updateRequisitionStatus(req.params.reqId, action, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Excelize-Compatible Excel Report Exports
import { createTransactionLedgerWorkbook, createSerializedUnitsWorkbook, createMasterReportWorkbook } from './src/utils/excelExport.ts';

app.get('/api/export/ledger', authenticate, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ledger = dbStore.getLedger(req.user?.role);
    const buffer = await createTransactionLedgerWorkbook(ledger, req.user?.name);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ont_transaction_ledger_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate transaction ledger Excel report' });
  }
});

app.get('/api/export/serialized', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const units = dbStore.getSerializedUnits();
    const buffer = await createSerializedUnitsWorkbook(units);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ont_serialized_units_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate serialized units Excel report' });
  }
});

app.get('/api/export/master', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const buffer = await createMasterReportWorkbook({
      summary: dbStore.getStockSummary(req.user?.role),
      serialized: dbStore.getSerializedUnits(),
      ledger: dbStore.getLedger(req.user?.role),
      tasks: dbStore.getTasks(req.user),
      issues: dbStore.getIssues(),
      requisitions: dbStore.getRequisitions(req.user),
      role: req.user?.role
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ont_master_report_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate master Excel report' });
  }
});

app.get('/api/export/excel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const buffer = await createMasterReportWorkbook({
      summary: dbStore.getStockSummary(req.user?.role),
      serialized: dbStore.getSerializedUnits(),
      ledger: dbStore.getLedger(req.user?.role),
      tasks: dbStore.getTasks(req.user),
      issues: dbStore.getIssues(),
      requisitions: dbStore.getRequisitions(req.user),
      role: req.user?.role
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ont_inventory_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// ==========================================
// VITE DEV SERVER / STATIC SERVING
// ==========================================
async function startServer() {
  await dbStore.ready();
  console.log('SQLite Database engine initialized and synced with data/ont_inventory.sqlite');

  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ONT Network Inventory System server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
