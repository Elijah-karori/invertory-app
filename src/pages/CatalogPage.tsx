import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Coins,
  ShieldAlert,
  AlertTriangle,
  Barcode
} from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const { data: catalog = [], isLoading, refetch } = useQuery({
    queryKey: ['catalog', currentUser?.id],
    queryFn: () => api.getCatalog()
  });

  const categories = ['ALL', ...Array.from(new Set(catalog.map(c => c.category)))];

  const filtered = catalog.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      c.sku.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.manufacturer && c.manufacturer.toLowerCase().includes(q));

    const matchCat = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const formatMoney = (val?: number) => {
    return Number(val || 0).toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Telecom Item & Equipment Catalog</h2>
            <p className="text-xs text-slate-400">
              Technical specifications, reorder triggers, and ERP master records
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-2 text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Catalog</span>
        </button>
      </div>

      {/* Role Masking Notification if non-admin */}
      {!isAdmin && (
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span>Unit acquisition costs and financial valuations are masked for role <strong className="text-slate-200">{currentUser?.role}</strong>.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">RBAC Masked</span>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search SKU, Model, Manufacturer..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
          ))}
        </select>
      </div>

      {/* Catalog Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Equipment Model / Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Manufacturer</th>
                <th className="p-3 text-center">Tracking</th>
                <th className="p-3 text-center">Reorder Level</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3">Technical Specs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading catalog items...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No catalog items found.
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.sku} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-indigo-300">
                      {item.sku}
                    </td>
                    <td className="p-3 text-white font-medium">
                      {item.model}
                    </td>
                    <td className="p-3 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {item.manufacturer || 'Generic'}
                    </td>
                    <td className="p-3 text-center">
                      {item.isSerialized ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                          Serialized (S/N)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">Bulk Item</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-amber-400">
                      ≤ {item.reorderLevel} units
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      {isAdmin ? (
                        <span className="text-purple-300">{formatMoney(item.unitCost)}</span>
                      ) : (
                        <span className="text-slate-600 font-mono tracking-widest">••••••</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px] truncate max-w-xs" title={item.specifications}>
                      {item.specifications || 'Standard specifications'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
