import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  Boxes,
  AlertTriangle,
  ClipboardList,
  Cpu,
  Coins,
  TrendingDown,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { currentUser, isAdmin, isStoreManager } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', currentUser?.id],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 15000
  });

  const { data: summary = [], isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['stock-summary', currentUser?.id],
    queryFn: () => api.getStockSummary(),
    refetchInterval: 15000
  });

  const handleRefresh = () => {
    refetchStats();
    refetchSummary();
  };

  const formatMoney = (val?: number) => {
    return Number(val || 0).toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0
    });
  };

  const categories = ['ALL', ...Array.from(new Set(summary.map(s => s.category)))];

  const filteredSummary = summary.filter(item => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Operational Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">ISP Network Operations Center</h2>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Workspace: <strong className="text-slate-200">{currentUser?.name}</strong> • Role: <strong className="text-indigo-300">{currentUser?.role}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {(isAdmin || isStoreManager) && (
            <Link
              to="/movement"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition shadow-sm"
            >
              <span>+ Record Movement</span>
            </Link>
          )}
          <button
            onClick={handleRefresh}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CORE OPERATIONAL KPIS (VISIBLE TO ALL ROLES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Stock Units */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Units In Stock</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {statsLoading ? '...' : stats?.totalUnitsInStock}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Catalog SKUs: <strong className="text-slate-300 font-mono">{stats?.totalSkus}</strong></span>
            <span className="text-emerald-400 flex items-center font-medium">Available</span>
          </div>
        </div>

        {/* KPI 2: Serialized Units Out */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Serial Units Deployed</p>
              <h3 className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {statsLoading ? '...' : stats?.totalUnitsOut}
              </h3>
            </div>
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <Link to="/serialized" className="hover:text-cyan-300 transition flex items-center gap-1">
              <span>View Deployed Units</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-slate-500 font-mono">Issued / Out</span>
          </div>
        </div>

        {/* KPI 3: Low Stock Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Low Stock SKUs</p>
              <h3 className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {statsLoading ? '...' : stats?.lowStockItemsCount}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="text-amber-400/90 font-medium">Below reorder trigger</span>
            <span className="font-mono text-slate-500">Action required</span>
          </div>
        </div>

        {/* KPI 4: Active Field Tasks */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Work Orders</p>
              <h3 className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                {statsLoading ? '...' : stats?.activeTasksCount}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Awaiting Stock: <strong className="text-amber-400 font-mono">{stats?.awaitingStockTasksCount}</strong></span>
            <Link to="/tasks" className="text-indigo-400 hover:text-indigo-300">View Queue →</Link>
          </div>
        </div>
      </div>

      {/* STRICTLY ADMIN-ONLY FINANCIAL VALUATION & EXPENDITURE METRICS */}
      {isAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                Financial Operations & Valuation Ledger (Admin Exclusive)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              STRICT_FINANCIAL_CLEARANCE: GRANTED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Stock Valuation */}
            <div className="bg-slate-900/90 border border-purple-500/30 p-4 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-300/80">Inventory Valuation</p>
              <h4 className="text-2xl font-bold font-mono text-purple-300 mt-1">
                {statsLoading ? '...' : formatMoney(stats?.totalStockValue)}
              </h4>
              <p className="text-[11px] text-slate-400 mt-2">
                Capital asset value stored in warehouse & remote racks
              </p>
            </div>

            {/* Procurement / Stock In Spend */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Procurement Spend</p>
              <h4 className="text-2xl font-bold font-mono text-slate-200 mt-1 flex items-center gap-1.5">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                {statsLoading ? '...' : formatMoney(stats?.stockInSpend)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">
                Cumulative capital spent on stock receipts & PO intake
              </p>
            </div>

            {/* Issued / Consumption Cost */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Issued Stock Cost</p>
              <h4 className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-center gap-1.5">
                <ArrowDownRight className="w-5 h-5 text-amber-400" />
                {statsLoading ? '...' : formatMoney(stats?.stockOutCost)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">
                Material consumed on FTTH installations & field tickets
              </p>
            </div>

            {/* Equipment Replacement & Swap Cost */}
            <div className="bg-slate-900/90 border border-rose-500/30 p-4 rounded-xl shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">Replacement / Swap Cost</p>
              <h4 className="text-2xl font-bold font-mono text-rose-400 mt-1 flex items-center gap-1.5">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                {statsLoading ? '...' : formatMoney(stats?.replacementCost)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">
                Cost of equipment replaced due to faulty customer ONT/router swaps
              </p>
            </div>
          </div>

          {/* Cost Allocation by Type */}
          {stats?.costByType && stats.costByType.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Issued Capital Allocation By Cost Type
                </h4>
                <Link to="/ledger" className="text-xs text-purple-400 hover:text-purple-300 font-mono">
                  Full Audit Ledger →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.costByType.map(c => (
                  <div key={c.type} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-start text-xs">
                      <span className="font-medium text-slate-300">{c.type}</span>
                      <span className="font-mono text-purple-400 font-semibold">{formatMoney(c.cost)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      Qty: {c.qty} units
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Financial Masking Banner for Non-Admins */
        <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>Financial & Unit Cost masking active for <strong className="text-slate-300">{currentUser?.role}</strong> role.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">RBAC Mask: ON</span>
        </div>
      )}

      {/* STOCK SUMMARY DATATABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Table Filter Toolbar */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Stock Level Summary</h3>
            <p className="text-xs text-slate-400">Real-time inventory balances and threshold alerts</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search SKU or Model..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Datatable */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3">SKU Identifier</th>
                <th className="p-3">Equipment Model / Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Tracking</th>
                <th className="p-3 text-right">In</th>
                <th className="p-3 text-right">Out</th>
                <th className="p-3 text-right">Net Qty</th>
                <th className="p-3 text-center">Status</th>
                {isAdmin && (
                  <>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Valuation</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {summaryLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Fetching inventory state...
                  </td>
                </tr>
              ) : filteredSummary.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 8} className="p-8 text-center text-slate-400">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                filteredSummary.map(item => {
                  const isLow = item.status === 'Low Stock';
                  const isOut = item.status === 'Out of Stock';

                  return (
                    <tr key={item.sku} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-medium text-indigo-300">
                        {item.sku}
                      </td>
                      <td className="p-3 text-slate-200 font-medium">
                        {item.model}
                      </td>
                      <td className="p-3 text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.isSerialized ? (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                            SN Tracked
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[10px]">Bulk</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-400">
                        +{item.totalIn}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-400">
                        -{item.totalOut}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white text-sm">
                        {item.netRemaining}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            isOut
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <>
                          <td className="p-3 text-right font-mono text-slate-300">
                            {formatMoney(item.unitCost)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-purple-300">
                            {formatMoney(item.stockValue)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
