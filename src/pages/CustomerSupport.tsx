import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { CustomerIssue, SwapDevicePayload } from '../models/types.ts';
import {
  Headset,
  RefreshCw,
  Plus,
  Repeat,
  CheckCircle,
  AlertTriangle,
  User,
  Barcode,
  X,
  Search,
  ArrowRight,
  Camera,
  ScanLine
} from 'lucide-react';
import { QrScannerModal } from '../components/QrScannerModal.tsx';

export const CustomerSupport: React.FC = () => {
  const { currentUser, allUsers } = useAuth();
  const queryClient = useQueryClient();

  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Swap form state
  const [customerName, setCustomerName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [issueCategory, setIssueCategory] = useState('Faulty ONT / Router');
  const [assignedTechId, setAssignedTechId] = useState('');
  const [oldDeviceSN, setOldDeviceSN] = useState('');
  const [newDeviceSN, setNewDeviceSN] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scannerTarget, setScannerTarget] = useState<'old' | 'new' | 'search' | null>(null);

  const handleScanSuccess = (code: string) => {
    const clean = code.trim();
    if (scannerTarget === 'old') {
      setOldDeviceSN(clean);
    } else if (scannerTarget === 'new') {
      const match = availableReplacements.find(
        u =>
          u.serialNumber.trim().toUpperCase() === clean.toUpperCase() ||
          u.assetId.trim().toUpperCase() === clean.toUpperCase()
      );
      if (match) {
        setNewDeviceSN(match.serialNumber);
      } else {
        setNewDeviceSN(clean);
      }
    } else if (scannerTarget === 'search') {
      setSearchTerm(clean);
    }
    setScannerTarget(null);
  };

  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ['issues'],
    queryFn: () => api.getIssues()
  });

  const { data: serialized = [] } = useQuery({
    queryKey: ['serialized-all'],
    queryFn: () => api.getSerializedUnits()
  });

  // Only In Stock units can be issued as replacements
  const availableReplacements = serialized.filter(u => u.status === 'In Stock');

  const swapMutation = useMutation({
    mutationFn: (payload: SwapDevicePayload) => api.swapCustomerDevice(payload),
    onSuccess: (res) => {
      setStatusMsg({ type: 'success', text: res.message });
      setSwapModalOpen(false);
      setCustomerName('');
      setAccountNumber('');
      setOldDeviceSN('');
      setNewDeviceSN('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['serialized-all'] });
      queryClient.invalidateQueries({ queryKey: ['serialized-units'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-ledger'] });
    },
    onError: (err: any) => {
      setStatusMsg({ type: 'error', text: err.message || 'Swap operation failed.' });
    }
  });

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !issueCategory) {
      setStatusMsg({ type: 'error', text: 'Customer name and issue category are required.' });
      return;
    }

    swapMutation.mutate({
      customerName,
      accountNumber,
      issueCategory,
      assignedTechId: assignedTechId || undefined,
      oldDeviceSN,
      newDeviceSN,
      notes
    });
  };

  const filteredIssues = issues.filter(i => {
    const q = searchTerm.toLowerCase();
    return (
      i.ticketId.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      (i.accountNumber && i.accountNumber.toLowerCase().includes(q)) ||
      i.issueCategory.toLowerCase().includes(q) ||
      (i.oldDeviceSN && i.oldDeviceSN.toLowerCase().includes(q)) ||
      (i.newDeviceSN && i.newDeviceSN.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-600/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Headset className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Customer Support & Equipment Swaps</h2>
            <p className="text-xs text-slate-400">
              Manage client trouble tickets and execute atomic ONT / Router hardware replacements
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setStatusMsg(null);
            setSwapModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition shadow"
        >
          <Repeat className="w-4 h-4" />
          <span>Log Issue & Swap Device</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="font-bold ml-2">&times;</button>
        </div>
      )}

      {/* Search Bar with Camera QR Scanner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-96 flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Ticket, Customer, S/N..."
            className="w-full pl-9 pr-24 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="button"
            onClick={() => setScannerTarget('search')}
            className="absolute right-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-semibold rounded flex items-center gap-1 border border-slate-700 transition"
            title="Scan ticket device QR"
          >
            <Camera className="w-3 h-3" />
            <span>Scan S/N</span>
          </button>
        </div>

        <button
          onClick={() => refetch()}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            Loading customer tickets...
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            No support tickets recorded.
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div
              key={issue.ticketId}
              className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {issue.ticketId}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                    {issue.issueCategory}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      issue.status === 'Resolved'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {issue.status}
                  </span>
                </div>

                <div className="font-semibold text-white text-sm">
                  {issue.customerName} {issue.accountNumber ? `(${issue.accountNumber})` : ''}
                </div>

                {/* Device Swap Info */}
                {(issue.oldDeviceSN !== 'N/A' || issue.newDeviceSN !== 'N/A') && (
                  <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="text-rose-400">Old: {issue.oldDeviceSN}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-emerald-400">New Issued: {issue.newDeviceSN}</span>
                  </div>
                )}

                {issue.notes && (
                  <p className="text-xs text-slate-400">{issue.notes}</p>
                )}
              </div>

              <div className="text-right text-xs text-slate-400 font-mono">
                <div>Assigned: {issue.assignedTechName || 'Support Pool'}</div>
                <div className="text-[10px] text-slate-500 mt-1">{issue.createdAt.split('T')[0]}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Equipment Swap & Ticket Logging Modal */}
      {swapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Log Ticket & Execute ONT Swap</h3>
                <p className="text-xs text-slate-400">
                  Swapping old device for new device updates serial statuses & writes to ledger atomically
                </p>
              </div>
              <button onClick={() => setSwapModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSwapSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. John Doe / Villa 4"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Account # / Sub ID
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="ACC-99214"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Issue Category
                  </label>
                  <select
                    value={issueCategory}
                    onChange={e => setIssueCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Faulty ONT / Router">Faulty ONT / Router</option>
                    <option value="No Optical Link">No Optical Link</option>
                    <option value="High Loss / Splice Needed">High Loss / Splice Needed</option>
                    <option value="Wi-Fi / Password Reset">Wi-Fi / Password Reset</option>
                    <option value="Equipment Damage">Equipment Damage</option>
                    <option value="Upgrade Request">Upgrade Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Assigned Technician
                  </label>
                  <select
                    value={assignedTechId}
                    onChange={e => setAssignedTechId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hardware Swap Inputs */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Hardware Replacement Parameters</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold uppercase text-slate-400">
                      Old Device Serial Number (Faulty Asset)
                    </label>
                    <button
                      type="button"
                      onClick={() => setScannerTarget('old')}
                      className="text-amber-400 hover:text-amber-300 text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500/50 transition"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan S/N</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={oldDeviceSN}
                    onChange={e => setOldDeviceSN(e.target.value)}
                    placeholder="e.g. 4857544378B44123 or INV-ONT-0005"
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">Will be marked 'Under Repair / Faulty'</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold uppercase text-slate-400">
                      New Replacement Device (Must be "In Stock")
                    </label>
                    <button
                      type="button"
                      onClick={() => setScannerTarget('new')}
                      className="text-emerald-400 hover:text-emerald-300 text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-emerald-500/50 transition"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan S/N</span>
                    </button>
                  </div>
                  <select
                    value={newDeviceSN}
                    onChange={e => setNewDeviceSN(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select In-Stock Replacement Device --</option>
                    {availableReplacements.map(u => (
                      <option key={u.assetId} value={u.serialNumber}>
                        {u.serialNumber} ({u.model} - {u.assetId})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500">Will be issued and recorded as 'Replacement' Stock Out</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Details of optical power levels, physical inspection, root cause..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSwapModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={swapMutation.isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow disabled:opacity-50"
                >
                  {swapMutation.isPending ? 'Executing Swap...' : 'Commit Swap & Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerTarget !== null}
        onClose={() => setScannerTarget(null)}
        onScanSuccess={handleScanSuccess}
        title={
          scannerTarget === 'old'
            ? 'Scan Faulty Device QR / Barcode'
            : scannerTarget === 'new'
            ? 'Scan Replacement Device QR / Barcode'
            : 'Scan Device S/N to Filter Tickets'
        }
        description={
          scannerTarget === 'old'
            ? 'Aim at the recovered ONT S/N to mark it for repair bench'
            : scannerTarget === 'new'
            ? 'Aim at fresh replacement ONT S/N to issue to customer'
            : 'Point at serial number barcode on device or work order'
        }
      />
    </div>
  );
};
