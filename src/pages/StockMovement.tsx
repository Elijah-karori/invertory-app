import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { MovementDirection, CostType, StockMovementPayload } from '../models/types.ts';
import {
  ArrowLeftRight,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  AlertCircle,
  Barcode,
  Layers,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  Camera
} from 'lucide-react';
import { QrScannerModal } from '../components/QrScannerModal.tsx';

export const StockMovement: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<MovementDirection>('Stock In');
  const [itemType, setItemType] = useState<'bulk' | 'serialized'>('bulk');
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [costType, setCostType] = useState<CostType>('Procurement / Stock In');
  const [taskId, setTaskId] = useState('');
  const [site, setSite] = useState('Main Store');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Queries
  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api.getCatalog()
  });

  const { data: serializedUnits = [] } = useQuery({
    queryKey: ['serialized-all'],
    queryFn: () => api.getSerializedUnits()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks()
  });

  // Automatically update cost type when direction changes
  useEffect(() => {
    if (direction === 'Stock In') {
      setCostType('Procurement / Stock In');
      setSite('Main Store');
    } else {
      setCostType('Installation');
      setSite('');
    }
  }, [direction]);

  // Serialized asset filter based on movement direction
  const eligibleUnits = serializedUnits.filter(u => {
    if (direction === 'Stock Out') {
      return u.status === 'In Stock';
    } else {
      return u.status === 'Issued / Out' || u.status === 'Under Repair';
    }
  });

  // Selected catalog item
  const activeCatalogItem = catalog.find(c => c.sku === selectedSku);

  // When asset is selected in serialized mode, auto-fill SKU
  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    const unit = serializedUnits.find(u => u.assetId === assetId);
    if (unit) {
      setSelectedSku(unit.sku);
      setQuantity(1);
    }
  };

  const handleScanSuccess = (code: string) => {
    setScannerOpen(false);
    const clean = code.trim().toUpperCase();
    const found = eligibleUnits.find(
      u =>
        u.serialNumber.trim().toUpperCase() === clean ||
        u.assetId.trim().toUpperCase() === clean ||
        (u.macAddress && u.macAddress.trim().toUpperCase() === clean)
    );
    if (found) {
      handleAssetSelect(found.assetId);
      setMessage({
        type: 'success',
        text: `Optical QR Scan: Selected ${found.assetId} (${found.model} - S/N: ${found.serialNumber})`
      });
    } else {
      setMessage({
        type: 'error',
        text: `Scanned code "${code}" was not found among currently ${direction === 'Stock Out' ? 'available In Stock' : 'eligible'} units.`
      });
    }
  };

  // Stock Movement Mutation
  const movementMutation = useMutation({
    mutationFn: (payload: StockMovementPayload) => api.executeStockMovement(payload),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: data.message });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['serialized-all'] });
      queryClient.invalidateQueries({ queryKey: ['audit-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Reset form
      setQuantity(1);
      setSelectedAssetId('');
      setNotes('');
      setTaskId('');
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.message || 'Transaction failed.' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedSku) {
      setMessage({ type: 'error', text: 'Please select an item SKU.' });
      return;
    }

    if (itemType === 'serialized' && !selectedAssetId) {
      setMessage({ type: 'error', text: 'Please select a specific serialized unit.' });
      return;
    }

    const payload: StockMovementPayload = {
      direction,
      sku: selectedSku,
      assetId: itemType === 'serialized' ? selectedAssetId : undefined,
      quantity: Number(quantity),
      costType,
      site: site || (direction === 'Stock In' ? 'Main Store' : 'Customer Site'),
      taskId: taskId || undefined,
      notes
    };

    movementMutation.mutate(payload);
  };

  // Estimate financial value if Admin
  const estimatedCost = (activeCatalogItem?.unitCost || 0) * (quantity || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Record Stock Movement</h2>
              <p className="text-xs text-slate-400">
                Execute atomic Stock In or Stock Out transactions with immutable ledger commit
              </p>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {message && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-start gap-3 text-xs font-medium ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            )}
            <div className="leading-relaxed">{message.text}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Movement Direction Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Transaction Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('Stock In')}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  direction === 'Stock In'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Stock In (+) [Receiving / Restock]</span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('Stock Out')}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  direction === 'Stock Out'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                <span>Stock Out (-) [Issue / Consumption]</span>
              </button>
            </div>
          </div>

          {/* Item Tracking Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Inventory Category Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setItemType('bulk');
                  setSelectedAssetId('');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                  itemType === 'bulk'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Bulk / Material Stock (Cables, Splitters, Adapters)</span>
              </button>

              <button
                type="button"
                onClick={() => setItemType('serialized')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                  itemType === 'serialized'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Barcode className="w-4 h-4" />
                <span>Serialized Unit (ONT, Router, OLT Card, FAT)</span>
              </button>
            </div>
          </div>

          {/* Serialized Unit Picker (When Serialized Mode Selected) */}
          {itemType === 'serialized' ? (
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Select Serialized Asset ({direction === 'Stock Out' ? 'Available In Stock' : 'Out / Recovered'})
                </label>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition"
                  title="Scan ONT S/N QR or barcode with camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan QR / S/N</span>
                </button>
              </div>
              <select
                value={selectedAssetId}
                onChange={e => handleAssetSelect(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Choose Serialized Device --</option>
                {eligibleUnits.map(u => (
                  <option key={u.assetId} value={u.assetId}>
                    {u.assetId} - {u.model} (S/N: {u.serialNumber} | MAC: {u.macAddress || 'N/A'}) - [{u.status}]
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-cyan-400/80">
                {direction === 'Stock Out'
                  ? 'Enforcing Rule: Only devices currently marked "In Stock" are eligible for dispatch.'
                  : 'Select the device returning to inventory (custodian will be cleared automatically).'}
              </p>
            </div>
          ) : (
            /* Bulk SKU Picker */
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Item SKU
              </label>
              <select
                value={selectedSku}
                onChange={e => setSelectedSku(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Select Item SKU from Catalog --</option>
                {catalog.map(c => (
                  <option key={c.sku} value={c.sku}>
                    {c.sku} - {c.model} ({c.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Model Display & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Equipment Model / Name
              </label>
              <input
                type="text"
                readOnly
                value={activeCatalogItem?.model || ''}
                placeholder="Auto-populated model"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Quantity {itemType === 'serialized' ? '(Fixed to 1 for serial tracking)' : ''}
              </label>
              <input
                type="number"
                min="1"
                disabled={itemType === 'serialized'}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Cost Type & Task / Ticket Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Cost Allocation Category
              </label>
              <select
                value={costType}
                onChange={e => setCostType(e.target.value as CostType)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Procurement / Stock In">Procurement / Stock In</option>
                <option value="Installation">Installation (FTTH / Enterprise)</option>
                <option value="Replacement">Replacement (Faulty / SLA Swap)</option>
                <option value="Repair">Repair / Service Bench</option>
                <option value="Internal Use">Internal Use / Testing</option>
                <option value="Transfer">Inter-Warehouse Transfer</option>
                <option value="Adjustment">Audit / Inventory Adjustment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Link to Task / Work Order ID
              </label>
              <select
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- No Direct Task Link --</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id}: {t.title} [{t.status}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Site / Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Site / Target Destination / Reference</span>
            </label>
            <input
              type="text"
              value={site}
              onChange={e => setSite(e.target.value)}
              placeholder="e.g. Main Store Rack B, Westlands Plot 14, Kilimani POP"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Transaction Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Audit Ledger Notes</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Specify dispatch notes, invoice ref, PO number, or technician receiving remarks..."
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            ></textarea>
          </div>

          {/* Admin Cost Preview */}
          {isAdmin && activeCatalogItem && (
            <div className="bg-purple-950/20 border border-purple-500/30 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-purple-300">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span>
                  Admin Cost Valuation: <strong>KES {activeCatalogItem.unitCost.toLocaleString()}</strong> × {quantity}
                </span>
              </div>
              <span className="font-mono font-bold text-purple-300 text-sm">
                KES {estimatedCost.toLocaleString()}
              </span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={movementMutation.isPending}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg ${
              direction === 'Stock In'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
            } disabled:opacity-50`}
          >
            {movementMutation.isPending ? (
              <span>Executing Atomic Ledger Commit...</span>
            ) : (
              <span>Commit {direction} Transaction</span>
            )}
          </button>
        </form>
      </div>

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="Scan Serialized Unit QR / Barcode"
        description="Aim at the ONT or Router S/N barcode to select it for stock movement"
      />
    </div>
  );
};
