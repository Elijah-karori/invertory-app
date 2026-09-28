import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { RoleGuard } from '../components/RoleGuard.tsx';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Lock,
  Tag
} from 'lucide-react';

export const AuditLedger: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [costTypeFilter, setCostTypeFilter] = useState('ALL');

  const { data: ledger = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-ledger'],
    queryFn: () => api.getAuditLedger()
  });

  const handleDownloadExcel = async () => {
    try {
      await api.downloadExcelReport();
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    }
  };

  const formatMoney = (val: number) => {
    return val.toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0
    });
  };

  const filteredLedger = ledger.filter(tx => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      tx.id.toLowerCase().includes(q) ||
      tx.sku.toLowerCase().includes(q) ||
      (tx.model && tx.model.toLowerCase().includes(q)) ||
      (tx.assetId && tx.assetId.toLowerCase().includes(q)) ||
      (tx.performedByName && tx.performedByName.toLowerCase().includes(q)) ||
      (tx.taskId && tx.taskId.toLowerCase().includes(q)) ||
      (tx.site && tx.site.toLowerCase().includes(q)) ||
      (tx.notes && tx.notes.toLowerCase().includes(q));

    const matchesDirection = directionFilter === 'ALL' || tx.direction === directionFilter;
    const matchesCostType = costTypeFilter === 'ALL' || tx.costType === costTypeFilter;

    return matchesSearch && matchesDirection && matchesCostType;
  });

  // Calculate totals
  const totalVolume = filteredLedger.reduce((acc, tx) => acc + tx.quantity, 0);
  const totalSpend = filteredLedger
    .filter(tx => tx.direction === 'Stock In')
    .reduce((acc, tx) => acc + tx.totalCost, 0);
  const totalIssued = filteredLedger
    .filter(tx => tx.direction === 'Stock Out')
    .reduce((acc, tx) => acc + tx.totalCost, 0);

  const costTypes = ['ALL', ...Array.from(new Set(ledger.map(t => t.costType)))];

  return (
    <RoleGuard allowedRoles={['Admin']}>
      <div className="space-y-6">
        {/* Header & Export */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Immutable Audit Transaction Ledger</h2>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  <Lock className="w-3 h-3" /> Admin Protected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Complete forensic record of all Stock In and Stock Out movements with financial costing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                try {
                  await api.downloadLedgerExcel();
                } catch (e: any) {
                  alert(`Export error: ${e.message}`);
                }
              }}
              title="Download formatted Transaction Ledger spreadsheet with formulas and auto-filter"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition shadow"
            >
              <Download className="w-4 h-4" />
              <span>Export Ledger (.xlsx)</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              title="Download complete multi-sheet offline telecom report"
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Master Report</span>
            </button>
          </div>
        </div>

        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Total Filtered Transactions</p>
            <h4 className="text-2xl font-bold font-mono text-white mt-1">
              {filteredLedger.length} <span className="text-xs text-slate-500 font-normal">({totalVolume} items)</span>
            </h4>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Stock In Capital Intake</p>
            <h4 className="text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-5 h-5 text-emerald-400" />
              {formatMoney(totalSpend)}
            </h4>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Stock Out Consumed Value</p>
            <h4 className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-5 h-5 text-amber-400" />
              {formatMoney(totalIssued)}
            </h4>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search Txn ID, SKU, Task, Site, User..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Directions</option>
              <option value="Stock In">Stock In (+)</option>
              <option value="Stock Out">Stock Out (-)</option>
            </select>

            <select
              value={costTypeFilter}
              onChange={e => setCostTypeFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              {costTypes.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Cost Types' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Txn ID & Date</th>
                  <th className="p-3 text-center">Dir</th>
                  <th className="p-3">SKU & Model</th>
                  <th className="p-3">Asset ID</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Total Cost</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3">Cost Type & Task</th>
                  <th className="p-3">Site & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
                      Loading ledger entries...
                    </td>
                  </tr>
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No ledger transactions found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map(tx => {
                    const isIn = tx.direction === 'Stock In';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <div className="font-mono font-bold text-purple-300">{tx.id}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {tx.date}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              isIn
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {tx.direction}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-200">{tx.model || tx.sku}</div>
                          <div className="text-[10px] font-mono text-slate-500">{tx.sku}</div>
                        </td>
                        <td className="p-3 font-mono text-cyan-300 text-[11px]">
                          {tx.assetId || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {tx.quantity}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          {formatMoney(tx.unitCost)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-purple-300">
                          {formatMoney(tx.totalCost)}
                        </td>
                        <td className="p-3">
                          <div className="text-slate-300 font-medium">{tx.performedByName || 'Staff'}</div>
                          <div className="text-[10px] text-slate-500">{tx.performedByRole}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                            {tx.costType}
                          </span>
                          {tx.taskId && (
                            <div className="text-[10px] font-mono text-indigo-400 mt-1">
                              Ref: {tx.taskId}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-slate-300 text-[11px] truncate max-w-[180px]">{tx.site || 'Main Store'}</div>
                          {tx.notes && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={tx.notes}>
                              {tx.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};
