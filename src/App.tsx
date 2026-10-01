import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { RoleGuard } from './components/RoleGuard.tsx';

// Pages
import { Dashboard } from './pages/Dashboard.tsx';
import { StockMovement } from './pages/StockMovement.tsx';
import { SerializedUnits } from './pages/SerializedUnits.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { TasksPage } from './pages/TasksPage.tsx';
import { CustomerSupport } from './pages/CustomerSupport.tsx';
import { RequisitionsPage } from './pages/RequisitionsPage.tsx';
import { AuditLedger } from './pages/AuditLedger.tsx';
import { DatabaseDocs } from './pages/DatabaseDocs.tsx';
import { UsersManagement } from './pages/UsersManagement.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
      retry: 1
    }
  }
});

export default function App() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* Sidebar Navigation */}
            <Sidebar
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
            />

            {/* Main View Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
              <Routes>
                {/* 1. Dashboard (All Users) */}
                <Route path="/" element={<Dashboard />} />

                {/* 2. Stock Movement (Admin & Store Manager) */}
                <Route
                  path="/movement"
                  element={
                    <RoleGuard allowedRoles={['Admin', 'Store Manager']}>
                      <StockMovement />
                    </RoleGuard>
                  }
                />

                {/* 3. Serialized Units (All Authenticated Roles) */}
                <Route path="/serialized" element={<SerializedUnits />} />

                {/* 4. Item Catalog (All Roles, unit costs masked for non-Admin) */}
                <Route path="/catalog" element={<CatalogPage />} />

                {/* 5. Tasks Management (All Roles, Tech views their assigned tasks) */}
                <Route path="/tasks" element={<TasksPage />} />

                {/* 6. Customer Support & Device Swaps (All Roles) */}
                <Route path="/support" element={<CustomerSupport />} />

                {/* 7. Requisitions (All Roles) */}
                <Route path="/requisitions" element={<RequisitionsPage />} />

                {/* 8. Audit Ledger (Strictly Admin Only) */}
                <Route
                  path="/ledger"
                  element={
                    <RoleGuard allowedRoles={['Admin']}>
                      <AuditLedger />
                    </RoleGuard>
                  }
                />

                {/* 9. Admin User Management (Strictly Admin Only) */}
                <Route
                  path="/users-management"
                  element={
                    <RoleGuard allowedRoles={['Admin']}>
                      <UsersManagement />
                    </RoleGuard>
                  }
                />

                {/* 10. Database Architecture & Migrations Blueprint */}
                <Route path="/database-docs" element={<DatabaseDocs />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* ISP Operations Footer */}
            <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>ONT Network & Equipment ERP • Core Version 2.4.0</span>
                <span>Relational Architecture • ACID Enforced • RBAC Policy Active</span>
              </div>
            </footer>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
}
