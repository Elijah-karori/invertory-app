import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { ItemCatalog } from '../models/types.ts';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Coins,
  ShieldAlert,
  AlertTriangle,
  Barcode,
  Plus,
  X
} from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { currentUser, isAdmin, isStoreManager } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form state
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('XPON/ONT');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [unitCost, setUnitCost] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(3);
  const [isSerialized, setIsSerialized] = useState(true);
  const [specifications, setSpecifications] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: catalog = [], isLoading, refetch } = useQuery({
    queryKey: ['catalog', currentUser?.id],
    queryFn: () => api.getCatalog()
  });

  const addCatalogItemMutation = useMutation({
    mutationFn: (data: Omit<ItemCatalog, 'createdAt' | 'updatedAt'>) => api.addCatalogItem(data),
    onSuccess: () => {
      setCreateModalOpen(false);
      setSku('');
      setModel('');
      setManufacturer('');
      setUnitCost(0);
      setReorderLevel(3);
      setSpecifications('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to add catalog item.');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !model.trim() || !category.trim()) {
      setFormError('SKU, Model, and Category are required.');
      return;
    }

    addCatalogItemMutation.mutate({
      sku: sku.trim().toUpperCase(),
      category: category.trim(),
      model: model.trim(),
      manufacturer: manufacturer.trim() || 'Generic',
      unitCost: Number(unitCost) || 0,
      reorderLevel: Number(reorderLevel) || 3,
      isSerialized,
      specifications: specifications.trim()
    });
  };

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

        <div className="flex items-center gap-2">
          {(isAdmin || isStoreManager) && (
            <button
              onClick={() => {
                setFormError(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add Catalog Item</span>
            </button>
          )}

          <button
            onClick={() => refetch()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Catalog</span>
          </button>
        </div>
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
      {/* Create Catalog Item Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Add New Catalog SKU</h3>
                <p className="text-xs text-slate-400">Register new telecom equipment, cabling, or passive splitters</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    SKU Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="e.g. SKU-ONT-HG8145X"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="XPON/ONT">XPON/ONT</option>
                    <option value="Wireless Router">Wireless Router</option>
                    <option value="Enterprise Router">Enterprise Router</option>
                    <option value="FAT Box">FAT Box</option>
                    <option value="Passive Optics">Passive Optics</option>
                    <option value="Fiber Cable">Fiber Cable</option>
                    <option value="Copper Cable">Copper Cable</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Equipment Model / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="e.g. OptiXstar HG8145X6"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={e => setManufacturer(e.target.value)}
                    placeholder="Huawei, TP-Link, Generic..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Unit Cost (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Reorder Trigger
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderLevel}
                    onChange={e => setReorderLevel(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Tracking Type
                  </label>
                  <select
                    value={isSerialized ? 'true' : 'false'}
                    onChange={e => setIsSerialized(e.target.value === 'true')}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="true">Serialized (S/N)</option>
                    <option value="false">Bulk / Material</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Technical Specifications
                </label>
                <textarea
                  rows={2}
                  value={specifications}
                  onChange={e => setSpecifications(e.target.value)}
                  placeholder="Ports, Wi-Fi standard, optical power range, warranty info..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCatalogItemMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow"
                >
                  {addCatalogItemMutation.isPending ? 'Registering...' : 'Save Catalog Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
