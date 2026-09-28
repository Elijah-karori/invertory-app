import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Task, TaskPriority, TaskStatus } from '../models/types.ts';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  User,
  MapPin,
  FileText,
  Boxes,
  X,
  Search,
  Filter
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { currentUser, allUsers, isAdmin, isStoreManager, isFieldTech } = useAuth();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form state
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Normal');
  const [requiredSku, setRequiredSku] = useState('');
  const [requiredQty, setRequiredQty] = useState(1);
  const [site, setSite] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', currentUser?.id],
    queryFn: () => api.getTasks()
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api.getCatalog()
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.createTask(data),
    onSuccess: () => {
      setCreateModalOpen(false);
      setTitle('');
      setAssigneeId('');
      setRequiredSku('');
      setRequiredQty(1);
      setSite('');
      setReference('');
      setNotes('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create task');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      api.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setFormError('Task title is required');
      return;
    }

    createTaskMutation.mutate({
      title,
      assigneeId: assigneeId || null,
      priority,
      requiredSku: requiredSku || null,
      requiredQty: requiredSku ? Number(requiredQty) : 0,
      site,
      reference,
      notes
    });
  };

  const filteredTasks = tasks.filter(t => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      (t.assigneeName && t.assigneeName.toLowerCase().includes(q)) ||
      (t.site && t.site.toLowerCase().includes(q)) ||
      (t.reference && t.reference.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'Critical':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold';
      case 'High':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'Normal':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'Low':
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    }
  };

  const getStatusColor = (s: TaskStatus) => {
    switch (s) {
      case 'Awaiting Stock':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse';
      case 'Ready':
        return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
      case 'In Progress':
        return 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30';
      case 'Completed':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'Cancelled':
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
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Field Tasks & Work Orders</h2>
            <p className="text-xs text-slate-400">
              {isFieldTech
                ? 'Your assigned field installations, ONT swaps, and repair orders'
                : 'Dispatch tasks to field technicians and track stock dependencies'}
            </p>
          </div>
        </div>

        {(isAdmin || isStoreManager) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Task ID, title, site, reference..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'Assigned', 'Awaiting Stock', 'Ready', 'In Progress', 'Completed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg border text-xs font-mono transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            Loading field tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            No work order tasks found matching filter.
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {task.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${getPriorityColor(task.priority)}`}>
                    {task.priority} Priority
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                  {task.reference && (
                    <span className="text-[11px] font-mono text-slate-500">
                      Ref: {task.reference}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-white">{task.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Assigned: <strong className="text-slate-200">{task.assigneeName || 'Unassigned'}</strong></span>
                  </span>

                  {task.site && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{task.site}</span>
                    </span>
                  )}

                  {task.requiredSku && (
                    <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                      <Boxes className="w-3 h-3 text-cyan-400" />
                      <span>Requires: {task.requiredSku} × {task.requiredQty}</span>
                    </span>
                  )}
                </div>

                {task.notes && (
                  <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/80 mt-2 font-mono">
                    {task.notes}
                  </p>
                )}
              </div>

              {/* Task Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {(task.status === 'Assigned' || task.status === 'Ready') && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'In Progress' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Task</span>
                  </button>
                )}

                {task.status === 'In Progress' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'Completed' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                )}

                {task.status === 'Completed' && (
                  <span className="text-emerald-400 text-xs font-mono flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Finished
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Create Work Order Task</h3>
                <p className="text-xs text-slate-400">Assign technician and allocate equipment dependencies</p>
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
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Task Title / Objective
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. New FTTH Splicing & ONT Setup at Parklands"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Assign Field Personnel
                  </label>
                  <select
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as TaskPriority)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Required Equipment SKU
                  </label>
                  <select
                    value={requiredSku}
                    onChange={e => setRequiredSku(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- No Stock Dependency --</option>
                    {catalog.map(c => (
                      <option key={c.sku} value={c.sku}>
                        {c.sku} - {c.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Required Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={!requiredSku}
                    value={requiredQty}
                    onChange={e => setRequiredQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Customer / Site
                  </label>
                  <input
                    type="text"
                    value={site}
                    onChange={e => setSite(e.target.value)}
                    placeholder="Plot / Address"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Work Order / Ticket Ref
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="WO-9842 / TKT-4491"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Dispatch Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Specific optical power targets, splice points, etc."
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
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
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow"
                >
                  {createTaskMutation.isPending ? 'Assigning...' : 'Dispatch Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
