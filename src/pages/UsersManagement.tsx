import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { RoleGuard } from '../components/RoleGuard.tsx';
import { User, UserRole } from '../models/types.ts';
import {
  Users,
  UserPlus,
  Shield,
  Lock,
  Mail,
  Building,
  RefreshCw,
  Edit,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Field Technician');
  const [department, setDepartment] = useState('Operations');

  const [editRole, setEditRole] = useState<UserRole>('Field Technician');
  const [editDepartment, setEditDepartment] = useState('');

  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getUsers()
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { name: string; email: string; role: UserRole; department?: string }) =>
      api.createUser(data),
    onSuccess: (newUser) => {
      setFormMsg({ type: 'success', text: `Staff account created for ${newUser.name} (${newUser.id}).` });
      setCreateModalOpen(false);
      setName('');
      setEmail('');
      setDepartment('Operations');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      setFormMsg({ type: 'error', text: err.message || 'Failed to create user.' });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, role, department }: { id: string; role: UserRole; department?: string }) =>
      api.updateUserRole(id, role, department),
    onSuccess: (updated) => {
      setFormMsg({ type: 'success', text: `Updated ${updated.name}'s role to ${updated.role}.` });
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      setFormMsg({ type: 'error', text: err.message || 'Failed to update user.' });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setFormMsg({ type: 'error', text: 'Name and Email are required.' });
      return;
    }
    createUserMutation.mutate({ name, email, role, department });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    updateUserMutation.mutate({ id: editUser.id, role: editRole, department: editDepartment });
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'Admin':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'Store Manager':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'Field Technician':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'Support':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    }
  };

  return (
    <RoleGuard allowedRoles={['Admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Staff & RBAC Administration</h2>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  <Lock className="w-3 h-3" /> Admin Protected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage system users, assign roles (Admin, Store Manager, Field Tech, Support), and govern access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormMsg(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition shadow"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Staff</span>
            </button>

            <button
              onClick={() => refetch()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Refresh Users List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {formMsg && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
              formMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {formMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{formMsg.text}</span>
            </div>
            <button onClick={() => setFormMsg(null)} className="font-bold ml-2">&times;</button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Staff Name & Email</th>
                  <th className="p-3">Department</th>
                  <th className="p-3 text-center">Assigned Role</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Loading users list...
                    </td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-purple-300">
                      {u.id}
                    </td>
                    <td className="p-3">
                      <div className="text-white font-medium">{u.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {u.email}
                      </div>
                    </td>
                    <td className="p-3 text-slate-300 flex items-center gap-1.5 mt-1">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>{u.department || 'Operations'}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setEditUser(u);
                          setEditRole(u.role);
                          setEditDepartment(u.department || 'Operations');
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition border border-slate-700"
                        title="Edit User Role"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Register Staff User</h3>
                  <p className="text-xs text-slate-400">Add team member and set RBAC role permissions</p>
                </div>
                <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="john.doe@ontnetwork.isp"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Admin">Admin (Full Access & Cost Metrics)</option>
                    <option value="Store Manager">Store Manager (Warehouse & Movements)</option>
                    <option value="Field Technician">Field Technician (Tasks & Requisitions)</option>
                    <option value="Support">Support (Customer Swaps & Tickets)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. Field Engineering, NOC, Logistics"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                  />
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
                    disabled={createUserMutation.isPending}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow"
                  >
                    {createUserMutation.isPending ? 'Registering...' : 'Register User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Update Role: {editUser.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{editUser.id} • {editUser.email}</p>
                </div>
                <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    System Clearance Role
                  </label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Field Technician">Field Technician</option>
                    <option value="Support">Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow"
                  >
                    {updateUserMutation.isPending ? 'Updating...' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};
