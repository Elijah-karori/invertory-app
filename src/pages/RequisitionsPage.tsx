import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { TechnicianRequisition } from '../models/types.ts';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Boxes,
  User,
  X,
  RefreshCw,
  Search
} from 'lucide-react';

export const RequisitionsPage: React.FC = () => {
  const { currentUser, isAdmin, isStoreManager, isFieldTech } = useAuth();
  const queryClient = useQueryClient();

  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: requisitions = [], isLoading, refetch } = useQuery({
    queryKey: ['requisitions', currentUser?.id],
    queryFn: () => api.getRequisitions()
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api.getCatalog()
  });

  const createReqMutation = useMutation({
    mutationFn: (data: { sku: string; quantity: number; reason: string }) =>
      api.createRequisition(data.sku, data.quantity, data.reason),
    onSuccess: (res) => {
      setMsg({ type: 'success', text: `Requisition ${res.reqId} submitted successfully.` });
      setReqModalOpen(false);
      setSelectedSku('');
      setQuantity(1);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
    },
    onError: (err: any) => {
      setMsg({ type: 'error', text: err.message || 'Failed to submit requisition.' });
    }
  });

  const actionMutation = useMutation({
    mutationFn: ({ reqId, action }: { reqId: string; action: 'Approved' | 'Rejected' }) =>
      api.updateRequisitionAction(reqId, action),
    onSuccess: (res) => {
      setMsg({ type: 'success', text: `Requisition ${res.reqId} ${res.status}.` });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
    },
    onError: (err: any) => {
      setMsg({ type: 'error', text: err.message || 'Action failed.' });
    }
  });

  const handleReqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku || quantity < 1) {
      setMsg({ type: 'error', text: 'Select SKU and valid quantity.' });
      return;
    }

    createReqMutation.mutate({
      sku: selectedSku,
      quantity: Number(quantity),
      reason
    });
  };

  const filtered = requisitions.filter(r => {
    const q = searchTerm.toLowerCase();
    return (
      r.reqId.toLowerCase().includes(q) ||
      r.techName.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      (r.model && r.model.toLowerCase().includes(q)) ||
      (r.reason && r.reason.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: TechnicianRequisition['status']) => {
    switch (status) {
      case 'Approved - Ready':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'Pending Approval':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse';
      case 'Awaiting Stock':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'Rejected':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Technician Material Requisitions</h2>
            <p className="text-xs text-slate-400">
              Field personnel material requests, warehouse inventory checks, and manager sign-offs
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMsg(null);
            setReqModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New Material Requisition</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold ml-2">&times;</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Requisition, Tech, SKU..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={() => refetch()}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Requisitions List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            Loading requisitions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            No requisitions found.
          </div>
        ) : (
          filtered.map(req => (
            <div
              key={req.reqId}
              className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {req.reqId}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(req.status)}`}>
                    {req.status}
                  </span>
                </div>

                <div className="font-semibold text-white text-sm">
                  {req.model || req.sku} <span className="text-xs text-slate-400 font-mono">({req.sku})</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span>Requested By: <strong className="text-slate-200">{req.techName}</strong></span>
                  <span className="font-mono font-bold text-white">Qty: {req.quantity}</span>
                  {req.reason && <span>Reason: {req.reason}</span>}
                </div>
              </div>

              {/* Action buttons for Store Manager / Admin */}
              <div className="flex items-center gap-2">
                {req.status === 'Pending Approval' && (isAdmin || isStoreManager) ? (
                  <>
                    <button
                      onClick={() => actionMutation.mutate({ reqId: req.reqId, action: 'Approved' })}
                      disabled={actionMutation.isPending}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => actionMutation.mutate({ reqId: req.reqId, action: 'Rejected' })}
                      disabled={actionMutation.isPending}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] font-mono text-slate-500">
                    {req.approvedByName ? `Reviewed by ${req.approvedByName}` : 'Awaiting Review'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Requisition Modal */}
      {reqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">New Material Requisition</h3>
                <p className="text-xs text-slate-400">Request equipment or accessories from central warehouse</p>
              </div>
              <button onClick={() => setReqModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReqSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Item SKU Requested
                </label>
                <select
                  required
                  value={selectedSku}
                  onChange={e => setSelectedSku(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select SKU --</option>
                  {catalog.map(c => (
                    <option key={c.sku} value={c.sku}>
                      {c.sku} - {c.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Quantity Required
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Job Reference / Purpose
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Fiber deployment at Westlands, ticket replacement..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReqModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReqMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow"
                >
                  {createReqMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
