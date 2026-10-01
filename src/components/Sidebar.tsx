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
  ChevronRight,
  Lock,
  RefreshCw,
  Sun,
  Moon,
  Users,
  Menu,
  X,
  Boxes,
  ShieldCheck,
  Wrench,
  HelpCircle,
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed
}) => {
  const { currentUser, allUsers, isAdmin, isStoreManager, switchUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [downloading, setDownloading] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Cascading dropdown open states
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    inventory: true,
    fieldSupport: true,
    admin: true
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
      isActive
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30 font-semibold'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100 selection:bg-indigo-500/30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Network className="w-5 h-5 animate-pulse" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5 leading-tight">
                ONT Network ERP
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">v2.4 PostgreSQL</p>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups Container */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-none">
        {/* GROUP 1: OVERVIEW & NOC */}
        <div>
          <button
            onClick={() => toggleGroup('overview')}
            className={`w-full flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 px-2 py-1 hover:text-slate-200 transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
              {!collapsed && <span>Overview & NOC</span>}
            </span>
            {!collapsed && (
              openGroups.overview ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            )}
          </button>

          {(openGroups.overview || collapsed) && (
            <div className="mt-1 space-y-1">
              <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)} title="Dashboard">
                <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-400" />
                {!collapsed && <span>Dashboard</span>}
              </NavLink>

              <NavLink to="/database-docs" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Schema & Migrations">
                <Database className="w-4 h-4 shrink-0 text-cyan-400" />
                {!collapsed && <span>Schema & Blueprint</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* GROUP 2: INVENTORY & WAREHOUSE */}
        <div>
          <button
            onClick={() => toggleGroup('inventory')}
            className={`w-full flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 px-2 py-1 hover:text-slate-200 transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              {!collapsed && <span>Inventory & Warehouse</span>}
            </span>
            {!collapsed && (
              openGroups.inventory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            )}
          </button>

          {(openGroups.inventory || collapsed) && (
            <div className="mt-1 space-y-1">
              {(isAdmin || isStoreManager) && (
                <NavLink to="/movement" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Stock Movement">
                  <ArrowLeftRight className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!collapsed && <span>Stock Movement</span>}
                </NavLink>
              )}

              <NavLink to="/serialized" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Serialized Units">
                <Barcode className="w-4 h-4 shrink-0 text-cyan-400" />
                {!collapsed && <span>Serialized Units</span>}
              </NavLink>

              <NavLink to="/catalog" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Item Catalog">
                <Layers className="w-4 h-4 shrink-0 text-purple-400" />
                {!collapsed && <span>Item Catalog</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* GROUP 3: FIELD & SUPPORT */}
        <div>
          <button
            onClick={() => toggleGroup('fieldSupport')}
            className={`w-full flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 px-2 py-1 hover:text-slate-200 transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              {!collapsed && <span>Field & Customer Operations</span>}
            </span>
            {!collapsed && (
              openGroups.fieldSupport ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            )}
          </button>

          {(openGroups.fieldSupport || collapsed) && (
            <div className="mt-1 space-y-1">
              <NavLink to="/tasks" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Tasks & Work Orders">
                <CheckSquare className="w-4 h-4 shrink-0 text-blue-400" />
                {!collapsed && <span>Tasks & Work Orders</span>}
              </NavLink>

              <NavLink to="/requisitions" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Requisitions">
                <ClipboardList className="w-4 h-4 shrink-0 text-indigo-400" />
                {!collapsed && <span>Requisitions</span>}
              </NavLink>

              <NavLink to="/support" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Support & Swapping">
                <Headset className="w-4 h-4 shrink-0 text-amber-400" />
                {!collapsed && <span>Support & Swapping</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* GROUP 4: ADMIN GOVERNANCE (STRICTLY ADMIN ONLY) */}
        {isAdmin && (
          <div>
            <button
              onClick={() => toggleGroup('admin')}
              className={`w-full flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-wider text-purple-400 px-2 py-1 hover:text-purple-300 transition ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                {!collapsed && <span>Admin Governance</span>}
              </span>
              {!collapsed && (
                openGroups.admin ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {(openGroups.admin || collapsed) && (
              <div className="mt-1 space-y-1">
                <NavLink to="/ledger" className={navLinkClass} onClick={() => setMobileOpen(false)} title="Audit Ledger">
                  <FileSpreadsheet className="w-4 h-4 shrink-0 text-purple-400" />
                  {!collapsed && <span className="flex items-center justify-between w-full">Audit Ledger <Lock className="w-3 h-3" /></span>}
                </NavLink>

                <NavLink to="/users-management" className={navLinkClass} onClick={() => setMobileOpen(false)} title="User Admin">
                  <Users className="w-4 h-4 shrink-0 text-purple-400" />
                  {!collapsed && <span className="flex items-center justify-between w-full">User Admin <Lock className="w-3 h-3" /></span>}
                </NavLink>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls: User Persona & Theme & Export */}
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40">
        {/* Quick Theme Toggle & Excel Export */}
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center justify-center flex-1"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            {!collapsed && <span className="text-xs ml-1.5">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
          </button>

          {/* Excel Export Menu */}
          <div className="relative flex-1">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              disabled={downloading}
              className="w-full flex items-center justify-center space-x-1.5 p-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
              title="Export Excel Reports"
            >
              {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {!collapsed && <span>Export</span>}
            </button>

            {exportDropdownOpen && (
              <div className="absolute bottom-12 left-0 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in">
                <div className="px-3 py-1 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                  Excel Reports (.xlsx)
                </div>
                <div className="py-1 space-y-1">
                  <button
                    onClick={() => handleExport('master')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition flex items-center justify-between"
                  >
                    <span>Master Report</span>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleExport('ledger')}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition flex items-center justify-between"
                    >
                      <span>Audit Ledger</span>
                      <Lock className="w-3 h-3 text-purple-400" />
                    </button>
                  )}
                  <button
                    onClick={() => handleExport('serialized')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 transition flex items-center justify-between"
                  >
                    <span>Serialized DB</span>
                    <Barcode className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Persona Switcher */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-full flex items-center space-x-2 p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs transition"
          >
            <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            {!collapsed && (
              <div className="text-left flex-1 truncate">
                <div className="font-semibold text-slate-200 truncate">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{currentUser?.role}</div>
              </div>
            )}
            {!collapsed && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </button>

          {userDropdownOpen && (
            <div className="absolute bottom-12 left-0 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in">
              <div className="px-3 py-1.5 border-b border-slate-800">
                <p className="text-[10px] font-bold uppercase text-slate-400">Switch Persona (RBAC)</p>
              </div>
              <div className="py-1 space-y-1">
                {allUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                      currentUser?.id === u.id ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Top Mobile Bar */}
      <div className="md:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center text-slate-100">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="font-bold text-xs text-white">ONT Network ERP</span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:block sticky top-0 h-screen transition-all duration-300 z-40 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          ></div>
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
