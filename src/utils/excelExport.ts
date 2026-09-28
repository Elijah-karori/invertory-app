import ExcelJS from 'exceljs';
import {
  TransactionLedger,
  SerializedUnit,
  StockSummaryItem,
  Task,
  CustomerIssue,
  TechnicianRequisition,
  UserRole
} from '../models/types.ts';

// Corporate Telecom Color Theme for Excel Sheets (Excelize style)
const THEME = {
  headerFill: '1E293B', // Slate 800
  headerFont: 'FFFFFF', // White
  accentFill: '4F46E5', // Indigo 600
  zebraFill: 'F8FAFC',  // Slate 50
  borderColor: 'E2E8F0',// Slate 200
  statusInStock: 'DCFCE7', // Emerald 100
  statusOut: 'E0F2FE',     // Sky 100
  statusRepair: 'FEF3C7',  // Amber 100
  statusDecomm: 'FEE2E2',  // Rose 100
};

/**
 * Applies Excelize-compatible header styling, auto-filters, borders, and frozen panes
 */
function styleWorksheetHeader(sheet: ExcelJS.Worksheet, columns: { header: string; key: string; width: number }[]) {
  sheet.columns = columns;

  // Freeze top row (Excelize: f.SetPanes)
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

  // Auto-filter across all columns (Excelize: f.AutoFilter)
  const lastColLetter = String.fromCharCode(64 + columns.length);
  sheet.autoFilter = `A1:${lastColLetter}1`;

  // Style Header Row
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: THEME.headerFill }
    };
    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: THEME.headerFont }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: '0F172A' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: 'thin', color: { argb: '334155' } }
    };
  });
}

/**
 * 1. Export Dedicated Transaction Ledger (Admin Only)
 */
export async function createTransactionLedgerWorkbook(
  transactions: TransactionLedger[],
  exportedByName: string = 'Admin Staff'
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ONT Network & Equipment Inventory System';
  wb.created = new Date();
  wb.modified = new Date();

  const sheet = wb.addWorksheet('Transaction Ledger', {
    properties: { tabColor: { argb: '7C3AED' } } // Purple tab
  });

  const columns = [
    { header: 'Txn ID', key: 'id', width: 18 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Direction', key: 'direction', width: 14 },
    { header: 'SKU Identifier', key: 'sku', width: 22 },
    { header: 'Equipment Model', key: 'model', width: 28 },
    { header: 'Asset ID (Serial)', key: 'assetId', width: 18 },
    { header: 'Qty', key: 'quantity', width: 10 },
    { header: 'Unit Cost (KES)', key: 'unitCost', width: 16 },
    { header: 'Total Value (KES)', key: 'totalCost', width: 18 },
    { header: 'Performed By', key: 'performedByName', width: 22 },
    { header: 'Role', key: 'performedByRole', width: 16 },
    { header: 'Cost Allocation', key: 'costType', width: 24 },
    { header: 'Task / WO Ref', key: 'taskId', width: 18 },
    { header: 'Site / Location', key: 'site', width: 26 },
    { header: 'Forensic Audit Notes', key: 'notes', width: 36 }
  ];

  styleWorksheetHeader(sheet, columns);

  // Populate data rows
  transactions.forEach((tx, idx) => {
    const row = sheet.addRow({
      id: tx.id,
      date: tx.date,
      direction: tx.direction,
      sku: tx.sku,
      model: tx.model || 'N/A',
      assetId: tx.assetId || '—',
      quantity: tx.quantity,
      unitCost: tx.unitCost,
      totalCost: tx.totalCost,
      performedByName: tx.performedByName || 'Staff',
      performedByRole: tx.performedByRole || 'Admin',
      costType: tx.costType,
      taskId: tx.taskId || '—',
      site: tx.site || 'Main Store',
      notes: tx.notes || ''
    });

    row.height = 20;

    // Apply Zebra striping and borders
    const isEven = idx % 2 === 1;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.border = {
        bottom: { style: 'thin', color: { argb: THEME.borderColor } },
        right: { style: 'thin', color: { argb: THEME.borderColor } },
        left: { style: 'thin', color: { argb: THEME.borderColor } }
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.zebraFill } };
      }

      // Format currency
      if (colNumber === 8 || colNumber === 9) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
      // Center direction and numbers
      if (colNumber === 3 || colNumber === 7) {
        cell.alignment = { horizontal: 'center' };
      }
      // Highlight direction
      if (colNumber === 3) {
        if (cell.value === 'Stock In') {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '166534' } }; // green
        } else {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '991B1B' } }; // red
        }
      }
    });
  });

  // Summary Row with Excel formulas (Excelize approach)
  if (transactions.length > 0) {
    const lastRowIndex = transactions.length + 1;
    const summaryRow = sheet.addRow({
      id: 'TOTAL AUDIT LEDGER',
      quantity: { formula: `SUM(G2:G${lastRowIndex})` },
      totalCost: { formula: `SUM(I2:I${lastRowIndex})` }
    });
    summaryRow.height = 24;
    summaryRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
      cell.border = {
        top: { style: 'medium', color: { argb: '0F172A' } },
        bottom: { style: 'double', color: { argb: '0F172A' } }
      };
      if (colNumber === 7) {
        cell.alignment = { horizontal: 'center' };
      }
      if (colNumber === 9) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
    });
  }

  return wb.xlsx.writeBuffer();
}

/**
 * 2. Export Dedicated Serialized Units Database
 */
export async function createSerializedUnitsWorkbook(
  units: SerializedUnit[]
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ONT Network & Equipment Inventory System';

  const sheet = wb.addWorksheet('Serialized Units Database', {
    properties: { tabColor: { argb: '06B6D4' } } // Cyan tab
  });

  const columns = [
    { header: 'Asset ID', key: 'assetId', width: 16 },
    { header: 'SKU Code', key: 'sku', width: 22 },
    { header: 'Device Model', key: 'model', width: 28 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Serial Number (S/N)', key: 'serialNumber', width: 24 },
    { header: 'MAC Address', key: 'macAddress', width: 20 },
    { header: 'Lifecycle Status', key: 'status', width: 16 },
    { header: 'Condition', key: 'condition', width: 14 },
    { header: 'Current Physical Location', key: 'currentLocation', width: 28 },
    { header: 'Custodian Personnel', key: 'currentCustodianName', width: 22 },
    { header: 'Operational / Maintenance Log', key: 'notes', width: 38 }
  ];

  styleWorksheetHeader(sheet, columns);

  units.forEach((u, idx) => {
    const row = sheet.addRow({
      assetId: u.assetId,
      sku: u.sku,
      model: u.model,
      category: u.category,
      serialNumber: u.serialNumber,
      macAddress: u.macAddress || 'N/A',
      status: u.status,
      condition: u.condition,
      currentLocation: u.currentLocation,
      currentCustodianName: u.currentCustodianName || 'Store Depot',
      notes: u.notes || ''
    });

    row.height = 20;
    const isEven = idx % 2 === 1;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.border = {
        bottom: { style: 'thin', color: { argb: THEME.borderColor } },
        right: { style: 'thin', color: { argb: THEME.borderColor } },
        left: { style: 'thin', color: { argb: THEME.borderColor } }
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.zebraFill } };
      }

      // Highlight status badge cells
      if (colNumber === 7) {
        cell.alignment = { horizontal: 'center' };
        if (cell.value === 'In Stock') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.statusInStock } };
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '166534' } };
        } else if (cell.value === 'Issued / Out') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.statusOut } };
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '075985' } };
        } else if (cell.value === 'Under Repair') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.statusRepair } };
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '92400E' } };
        } else if (cell.value === 'Decommissioned') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.statusDecomm } };
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '991B1B' } };
        }
      }

      // Center condition
      if (colNumber === 8) {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  return wb.xlsx.writeBuffer();
}

/**
 * 3. Export Master Offline Telecom ERP Report (Multi-Sheet)
 */
export async function createMasterReportWorkbook(data: {
  summary: StockSummaryItem[];
  serialized: SerializedUnit[];
  ledger: TransactionLedger[];
  tasks: Task[];
  issues: CustomerIssue[];
  requisitions: TechnicianRequisition[];
  role?: UserRole;
}): Promise<ExcelJS.Buffer> {
  const isAdmin = data.role === 'Admin';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ONT Network & Equipment Inventory System';

  // Sheet 1: Stock Summary & Valuation
  const wsSummary = wb.addWorksheet('Stock Summary', {
    properties: { tabColor: { argb: '10B981' } }
  });
  const summaryCols = [
    { header: 'SKU', key: 'sku', width: 22 },
    { header: 'Item / Model', key: 'model', width: 28 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Tracking', key: 'tracking', width: 14 },
    { header: 'Total In', key: 'totalIn', width: 12 },
    { header: 'Total Out', key: 'totalOut', width: 12 },
    { header: 'Net Balance', key: 'netRemaining', width: 14 },
    { header: 'Reorder Level', key: 'reorderLevel', width: 14 },
    { header: 'Status', key: 'status', width: 14 }
  ];
  if (isAdmin) {
    summaryCols.push(
      { header: 'Unit Cost (KES)', key: 'unitCost', width: 16 },
      { header: 'Stock Valuation (KES)', key: 'stockValue', width: 20 }
    );
  }
  styleWorksheetHeader(wsSummary, summaryCols);

  data.summary.forEach((s, idx) => {
    const rowObj: any = {
      sku: s.sku,
      model: s.model,
      category: s.category,
      tracking: s.isSerialized ? 'Serialized' : 'Bulk',
      totalIn: s.totalIn,
      totalOut: s.totalOut,
      netRemaining: s.netRemaining,
      reorderLevel: s.reorderLevel,
      status: s.status
    };
    if (isAdmin) {
      rowObj.unitCost = s.unitCost || 0;
      rowObj.stockValue = s.stockValue || 0;
    }
    const row = wsSummary.addRow(rowObj);
    row.height = 20;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 9 };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.zebraFill } };
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: THEME.borderColor } },
        right: { style: 'thin', color: { argb: THEME.borderColor } },
        left: { style: 'thin', color: { argb: THEME.borderColor } }
      };
      if (isAdmin && (colNumber === 10 || colNumber === 11)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
      if (colNumber >= 5 && colNumber <= 8) {
        cell.alignment = { horizontal: 'center' };
      }
      if (colNumber === 9) {
        cell.alignment = { horizontal: 'center' };
        if (cell.value === 'Low Stock' || cell.value === 'Out of Stock') {
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'DC2626' } };
        }
      }
    });
  });

  // Sheet 2: Serialized Units
  const wsSerial = wb.addWorksheet('Serialized Inventory', {
    properties: { tabColor: { argb: '06B6D4' } }
  });
  styleWorksheetHeader(wsSerial, [
    { header: 'Asset ID', key: 'assetId', width: 16 },
    { header: 'SKU', key: 'sku', width: 22 },
    { header: 'Model', key: 'model', width: 26 },
    { header: 'Serial Number', key: 'serialNumber', width: 24 },
    { header: 'MAC Address', key: 'macAddress', width: 20 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Condition', key: 'condition', width: 14 },
    { header: 'Location', key: 'currentLocation', width: 26 },
    { header: 'Custodian', key: 'currentCustodianName', width: 20 }
  ]);
  data.serialized.forEach((u, idx) => {
    const row = wsSerial.addRow({
      assetId: u.assetId,
      sku: u.sku,
      model: u.model,
      serialNumber: u.serialNumber,
      macAddress: u.macAddress || 'N/A',
      status: u.status,
      condition: u.condition,
      currentLocation: u.currentLocation,
      currentCustodianName: u.currentCustodianName || 'Store Depot'
    });
    row.height = 20;
    if (idx % 2 === 1) {
      row.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.zebraFill } };
      });
    }
  });

  // Sheet 3: Transaction Ledger (Strictly Admin Only)
  if (isAdmin) {
    const wsLedger = wb.addWorksheet('Audit Ledger', {
      properties: { tabColor: { argb: '8B5CF6' } }
    });
    styleWorksheetHeader(wsLedger, [
      { header: 'Txn ID', key: 'id', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Dir', key: 'direction', width: 12 },
      { header: 'SKU', key: 'sku', width: 22 },
      { header: 'Model', key: 'model', width: 26 },
      { header: 'Asset ID', key: 'assetId', width: 16 },
      { header: 'Qty', key: 'quantity', width: 10 },
      { header: 'Unit Cost', key: 'unitCost', width: 16 },
      { header: 'Total Cost', key: 'totalCost', width: 18 },
      { header: 'Performed By', key: 'performedByName', width: 20 },
      { header: 'Cost Type', key: 'costType', width: 22 },
      { header: 'Task Ref', key: 'taskId', width: 16 },
      { header: 'Site', key: 'site', width: 24 }
    ]);
    data.ledger.forEach((t, idx) => {
      const row = wsLedger.addRow({
        id: t.id,
        date: t.date,
        direction: t.direction,
        sku: t.sku,
        model: t.model || '',
        assetId: t.assetId || '—',
        quantity: t.quantity,
        unitCost: t.unitCost,
        totalCost: t.totalCost,
        performedByName: t.performedByName || 'Staff',
        costType: t.costType,
        taskId: t.taskId || '—',
        site: t.site || ''
      });
      row.height = 20;
      if (idx % 2 === 1) {
        row.eachCell((c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.zebraFill } };
        });
      }
      row.getCell(8).numFmt = '#,##0.00';
      row.getCell(9).numFmt = '#,##0.00';
    });
  }

  // Sheet 4: Tasks & Work Orders
  const wsTasks = wb.addWorksheet('Field Tasks', {
    properties: { tabColor: { argb: '3B82F6' } }
  });
  styleWorksheetHeader(wsTasks, [
    { header: 'Task ID', key: 'id', width: 16 },
    { header: 'Title', key: 'title', width: 32 },
    { header: 'Assignee', key: 'assigneeName', width: 20 },
    { header: 'Priority', key: 'priority', width: 14 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Required Stock', key: 'requiredSku', width: 22 },
    { header: 'Required Qty', key: 'requiredQty', width: 14 },
    { header: 'Site / Location', key: 'site', width: 24 }
  ]);
  data.tasks.forEach((task, idx) => {
    const row = wsTasks.addRow({
      id: task.id,
      title: task.title,
      assigneeName: task.assigneeName || 'Unassigned',
      priority: task.priority,
      status: task.status,
      requiredSku: task.requiredSku || 'None',
      requiredQty: task.requiredQty,
      site: task.site || '—'
    });
    row.height = 20;
    if (idx % 2 === 1) {
      row.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.zebraFill } };
      });
    }
  });

  return wb.xlsx.writeBuffer();
}
