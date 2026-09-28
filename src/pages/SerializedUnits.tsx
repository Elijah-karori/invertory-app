import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { SerializedUnit, AssetStatus, AssetCondition } from '../models/types.ts';
import {
  Barcode,
  Search,
  SlidersHorizontal,
  Cpu,
  UserCheck,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Ban,
  Edit,
  X,
  RefreshCw,
  Sparkles,
  Download,
  Camera,
  QrCode
} from 'lucide-react';
import { QrScannerModal } from '../components/QrScannerModal.tsx';

export const SerializedUnits: React.FC = () => {
  const { currentUser, allUsers, isAdmin, isStoreManager } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<SerializedUnit | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanNotification, setScanNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Edit form state
  const [editStatus, setEditStatus] = useState<AssetStatus>('In Stock');
  const [editCondition, setEditCondition] = useState<AssetCondition>('New');
  const [editLocation, setEditLocation] = useState('');
  const [editCustodianId, setEditCustodianId] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: units = [], isLoading, refetch } = useQuery({
    queryKey: ['serialized-units', statusFilter],
    queryFn: () => api.getSerializedUnits({ status: statusFilter !== 'all' ? statusFilter : undefined })
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ assetId, data }: { assetId: string; data: Partial<SerializedUnit> }) =>
      api.updateSerializedUnit(assetId, data),
    onSuccess: () => {
      setEditModalOpen(false);
      setSelectedUnit(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['serialized-units'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-ledger'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update serialized unit');
    }
  });

  const openEditModal = (unit: SerializedUnit) => {
    setSelectedUnit(unit);
    setEditStatus(unit.status);
    setEditCondition(unit.condition);
    setEditLocation(unit.currentLocation);
    setEditCustodianId(unit.currentCustodianId || '');
    setEditNotes('');
    setActionError(null);
    setEditModalOpen(true);
  };

  const handleScanSuccess = (scannedCode: string) => {
    setScannerOpen(false);
    const clean = scannedCode.trim().toUpperCase();
    const found = units.find(
      u =>
        u.serialNumber.trim().toUpperCase() === clean ||
        u.assetId.trim().toUpperCase() === clean ||
        (u.macAddress && u.macAddress.trim().toUpperCase() === clean)
    );

    if (found) {
      setScanNotification({
        message: `Optical scan matched device ${found.assetId} (${found.model} • S/N: ${found.serialNumber} • ${found.status}). Status editor opened.`,
        type: 'success'
      });
      openEditModal(found);
    } else {
      setSearchTerm(scannedCode);
      setScanNotification({
        message: `Scanned code "${scannedCode}" was not found in the current inventory. Filtered search table.`,
        type: 'info'
      });
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;

    // Disallow issuing assets that are not currently in stock
    if (selectedUnit.status !== 'In Stock' && editStatus === 'Issued / Out') {
      setActionError(`Cannot issue asset: Device is currently "${selectedUnit.status}". It must be returned to "In Stock" first.`);
      return;
    }

    updateUnitMutation.mutate({
      assetId: selectedUnit.assetId,
      data: {
        status: editStatus,
        condition: editCondition,
        currentLocation: editLocation,
        currentCustodianId: editCustodianId || null,
        notes: editNotes || undefined
      }
    });
  };

  // Quick Action: Send to Repair
  const handleSendToRepair = (unit: SerializedUnit) => {
    updateUnitMutation.mutate({
      assetId: unit.assetId,
      data: {
        status: 'Under Repair',
        condition: 'Faulty',
        currentLocation: 'RMA / Repair Bench',
        currentCustodianId: null,
        notes: `Marked for repair by ${currentUser?.name}`
      }
    });
  };

  // Quick Action: Decommission
  const handleDecommission = (unit: SerializedUnit) => {
    if (!confirm(`Are you sure you want to permanently decommission asset ${unit.assetId}?`)) return;
    updateUnitMutation.mutate({
      assetId: unit.assetId,
      data: {
        status: 'Decommissioned',
        currentLocation: 'E-Waste / Disposal Depot',
        currentCustodianId: null,
        notes: `Decommissioned by ${currentUser?.name}`
      }
    });
  };

  const filteredUnits = units.filter(u => {
    const q = searchTerm.toLowerCase();
    return (
      u.assetId.toLowerCase().includes(q) ||
      u.serialNumber.toLowerCase().includes(q) ||
      (u.macAddress && u.macAddress.toLowerCase().includes(q)) ||
      u.model.toLowerCase().includes(q) ||
      u.currentLocation.toLowerCase().includes(q) ||
      (u.currentCustodianName && u.currentCustodianName.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'In Stock':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'Issued / Out':
        return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
      case 'Under Repair':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'Decommissioned':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-600/20 text-cyan-400 rounded-xl border border-cyan-500/30">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Serialized Asset Lifecycle Tracking</h2>
              <p className="text-xs text-slate-400">
                Track Optical Network Terminals, Routers, OLT modules, and FATs by Serial Number (SN) & MAC
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-lg shadow-cyan-950/40"
            title="Scan ONT or Router QR Code / Barcode with Camera"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Device QR</span>
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-2 text-xs"
            title="Refresh Device List"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={async () => {
              try {
                await api.downloadSerializedExcel();
              } catch (e: any) {
                alert(`Export error: ${e.message}`);
              }
            }}
            title="Download formatted Serialized Units Database (.xlsx) with status styling and metadata"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Optical Scan Notification Banner */}
      {scanNotification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
            scanNotification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{scanNotification.message}</span>
          </div>
          <button
            onClick={() => setScanNotification(null)}
            className="text-slate-400 hover:text-white font-bold ml-2 text-base leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-96 flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search S/N, MAC, Asset ID, Model..."
            className="w-full pl-9 pr-24 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="absolute right-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] font-semibold rounded flex items-center gap-1 border border-slate-700 transition"
            title="Scan with camera"
          >
            <Camera className="w-3 h-3" />
            <span>Scan</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <div className="flex gap-1 overflow-x-auto text-xs">
            {['all', 'In Stock', 'Issued / Out', 'Under Repair', 'Decommissioned'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {st === 'all' ? 'All Units' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Serialized Units Datatable */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3">Asset ID</th>
                <th className="p-3">Serial Number (S/N)</th>
                <th className="p-3">MAC Address</th>
                <th className="p-3">Model & SKU</th>
                <th className="p-3 text-center">Lifecycle Status</th>
                <th className="p-3 text-center">Condition</th>
                <th className="p-3">Current Location</th>
                <th className="p-3">Custodian</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Querying serialized asset database...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No serialized units found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUnits.map(unit => (
                  <tr key={unit.assetId} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-cyan-300">
                      {unit.assetId}
                    </td>
                    <td className="p-3 font-mono text-slate-100 font-medium">
                      {unit.serialNumber}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {unit.macAddress || 'N/A'}
                    </td>
                    <td className="p-3">
                      <div className="text-slate-200 font-medium">{unit.model}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{unit.sku}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(unit.status)}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[11px] font-mono text-slate-300">
                        {unit.condition}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[160px]">{unit.currentLocation}</span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {unit.currentCustodianName ? (
                        <span className="text-indigo-300 font-medium">{unit.currentCustodianName}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {(isAdmin || isStoreManager) ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(unit)}
                            title="Edit Device Details & Location"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition border border-slate-700"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {unit.status !== 'Under Repair' && (
                            <button
                              onClick={() => handleSendToRepair(unit)}
                              title="Send to Repair Bench"
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded transition border border-amber-500/30"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {unit.status !== 'Decommissioned' && (
                            <button
                              onClick={() => handleDecommission(unit)}
                              title="Decommission Asset"
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition border border-rose-500/30"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Read Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Serialized Unit Modal */}
      {editModalOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Update Asset: {selectedUnit.assetId}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  S/N: {selectedUnit.serialNumber} • {selectedUnit.model}
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Lifecycle State
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as AssetStatus)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Issued / Out">Issued / Out</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Physical Condition
                  </label>
                  <select
                    value={editCondition}
                    onChange={e => setEditCondition(e.target.value as AssetCondition)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Faulty">Faulty</option>
                    <option value="Refurbished">Refurbished</option>
                    <option value="Not Recorded">Not Recorded</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Location / Sub-Station / Rack
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  placeholder="e.g. Main Store Rack B1, Customer Premise"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Assigned Custodian / Field Personnel
                </label>
                <select
                  value={editCustodianId}
                  onChange={e => setEditCustodianId(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- No Custodian (In Store) --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Maintenance / Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Reason for movement or inspection notes..."
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUnitMutation.isPending}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition shadow disabled:opacity-50"
                >
                  {updateUnitMutation.isPending ? 'Committing Changes...' : 'Save Asset Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="Scan Device QR / Barcode"
        description="Point camera at ONT or Router S/N barcode to immediately locate and edit device status"
      />
    </div>
  );
};
