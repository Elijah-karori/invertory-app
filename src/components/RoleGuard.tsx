import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../models/types.ts';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, fallback }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-mono tracking-wider">VERIFYING CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900/90 border border-rose-500/30 rounded-2xl shadow-2xl backdrop-blur-sm text-center">
        <div className="inline-flex p-4 bg-rose-500/10 text-rose-400 rounded-2xl mb-4 border border-rose-500/20">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Access Restricted (RBAC Policy)</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Your current security clearance (<span className="text-rose-400 font-semibold">{currentUser?.role || 'Guest'}</span>) does not allow access to this telecom module. This view requires one of:
        </p>
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {allowedRoles.map(r => (
            <span key={r} className="px-3 py-1 bg-slate-800 border border-slate-700 text-xs font-mono rounded-lg text-indigo-300">
              {r}
            </span>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
