import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { api } from '../services/api.ts';
import {
  Network,
  LayoutDashboard,
  ArrowLeftRight,
  Barcode,
  Layers,
  CheckSquare,
  FileSpreadsheet,
  Headset,
  ClipboardList,
  Database,
  Download,
  UserCheck,
  ChevronDown,
  Lock,
  RefreshCw,
  Sun,
  Moon,
  Users
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { currentUser, allUsers, isAdmin, isStoreManager, isFieldTech, isSupport, switchUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleExport = async (type: 'master' | 'ledger' | 'serialized') => {
    try {
      setDownloading(true);
      setExportDropdownOpen(false);
      if (type === 'ledger') {
        await api.downloadLedgerExcel();
      } else if (type === 'serialized') {
        await api.downloadSerializedExcel();
      } else {
        await api.downloadMasterExcel();
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Store Manager':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Field Technician':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Support':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
        {/* Brand & Telecom Node Identifier */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
            <Network className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                ONT Network & Equipment Inventory System
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                v2.4 PostgreSQL ERP
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              ISP Core Ledger: <span className="text-slate-300">ACID Enforced</span>
              <span className="text-slate-600">|</span>
              Node: <span className="text-indigo-400 font-semibold">NBO-METRO-CORE-01</span>
            </p>
          </div>
        </div>

        {/* Right Section: Role Simulator & Global Export & Theme Toggle */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center justify-center"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Excelize-Compatible Excel Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              disabled={downloading}
              title="Export formatted Excel reports (.xlsx)"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
            >
              {downloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Excel Export</span>
              <ChevronDown className="w-3 h-3 text-emerald-400" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Excelize-Formatted Exports (.xlsx)
                </div>
                <div className="py-1 space-y-1">
                  <button
                    onClick={() => handleExport('master')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-emerald-300">Complete Master Archive</div>
                      <div className="text-[10px] text-slate-500">All tabs, formulas & styling</div>
                    </div>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleExport('ledger')}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-purple-300 flex items-center gap-1">
                          <span>Audit Ledger</span>
                          <Lock className="w-2.5 h-2.5 text-purple-400" />
                        </div>
                        <div className="text-[10px] text-slate-500">Forensics, unit & total costs</div>
                      </div>
                      <FileSpreadsheet className="w-4 h-4 text-purple-400 shrink-0" />
                    </button>
                  )}

                  <button
                    onClick={() => handleExport('serialized')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-cyan-300">Serialized Units DB</div>
                      <div className="text-[10px] text-slate-500">S/N, MAC, locations, statuses</div>
                    </div>
                    <Barcode className="w-4 h-4 text-cyan-400 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick RBAC Role / Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs transition"
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <div className="text-left">
                <div className="font-semibold text-slate-200 leading-tight">
                  {currentUser?.name || 'Select Staff'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Role: <span className={`px-1 py-0.2 rounded border text-[9px] ${getRoleBadgeColor(currentUser?.role)}`}>{currentUser?.role}</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Simulate Staff RBAC Clearance</p>
                  <p className="text-[10px] text-slate-500">Switch user to test permission masking & module visibility</p>
                </div>
                <div className="py-1 space-y-1">
                  {allUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        currentUser?.id === u.id ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getRoleBadgeColor(u.role)}`}>
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 flex items-center space-x-1 overflow-x-auto text-xs font-medium border-t border-slate-800/80 scrollbar-none">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </NavLink>

        {/* Stock Movement Form: Admin & Store Manager */}
        {(isAdmin || isStoreManager) && (
          <NavLink
            to="/movement"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`
            }
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Stock Movement</span>
          </NavLink>
        )}

        {/* Serialized Units Lifecycle */}
        <NavLink
          to="/serialized"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`
          }
        >
          <Barcode className="w-4 h-4" />
          <span>Serialized Units</span>
        </NavLink>

        {/* Item Catalog */}
        <NavLink
          to="/catalog"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`
          }
        >
          <Layers className="w-4 h-4" />
          <span>Item Catalog</span>
        </NavLink>

        {/* Tasks Management */}
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`
          }
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tasks & Work Orders</span>
        </NavLink>

        {/* Requisitions */}
        <NavLink
          to="/requisitions"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`
          }
        >
          <ClipboardList className="w-4 h-4" />
          <span>Requisitions</span>
        </NavLink>

        {/* Customer Support & Device Swaps */}
        <NavLink
          to="/support"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`
          }
        >
          <Headset className="w-4 h-4" />
          <span>Support & Swapping</span>
        </NavLink>

        {/* STRICTLY ADMIN ONLY: AUDIT LEDGER */}
        {isAdmin && (
          <NavLink
            to="/ledger"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
                isActive
                  ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                  : 'border-transparent text-purple-400/80 hover:text-purple-300 hover:bg-purple-900/10'
              }`
            }
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-400" />
            <span className="font-semibold">Audit Ledger (Admin)</span>
            <Lock className="w-3 h-3 text-purple-400/70" />
          </NavLink>
        )}

        {/* STRICTLY ADMIN ONLY: USER MANAGEMENT */}
        {isAdmin && (
          <NavLink
            to="/users-management"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
                isActive
                  ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                  : 'border-transparent text-purple-400/80 hover:text-purple-300 hover:bg-purple-900/10'
              }`
            }
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span className="font-semibold">User Admin</span>
            <Lock className="w-3 h-3 text-purple-400/70" />
          </NavLink>
        )}

        {/* Schema & Migrations Blueprint */}
        <NavLink
          to="/database-docs"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap transition border-b-2 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`
          }
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Schema & Migrations</span>
        </NavLink>
      </nav>
    </header>
  );
};
