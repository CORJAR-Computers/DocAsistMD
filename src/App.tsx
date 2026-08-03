import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import MainLayout from "@/layouts/MainLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import PatientForm from "@/pages/PatientForm";
import PatientHistory from "@/pages/PatientHistory";
import Appointments from "@/pages/Appointments";
import Doctors from "@/pages/Doctors";
import Consultations from "@/pages/Consultations";
import Medications from "@/pages/Medications";
import Billing from "@/pages/Billing";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Reports from "@/pages/Reports";
import AuditLog from "@/pages/AuditLog";
import Settings from "@/pages/Settings";
import { useAuthStore } from "@/stores/authStore";
import { canAccess, type ModuleKey } from "@/lib/permissions";
import type { UserRole } from "@/types/auth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Toaster from "@/components/ui/toaster";
import "./index.css";
import "./dark-mode.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

/** Guard de ruta por módulo: redirige al dashboard si el rol no tiene acceso. */
function RequireModule({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role as UserRole, module)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const { isAuthenticated, initAuth } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initAuth().finally(() => setInitializing(false));
  }, [initAuth]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-sidebar via-[#1B6B93] to-secondary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-sm">Cargando DocAsistMD...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" replace /> : <Login />
            } />
            <Route element={
              isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<RequireModule module="patients"><Patients /></RequireModule>} />
              <Route path="/patients/new" element={<RequireModule module="patients"><PatientForm /></RequireModule>} />
              <Route path="/patients/:id/edit" element={<RequireModule module="patients"><PatientForm /></RequireModule>} />
              <Route path="/patients/:id/history" element={<RequireModule module="patients"><PatientHistory /></RequireModule>} />
              <Route path="/appointments" element={<RequireModule module="appointments"><Appointments /></RequireModule>} />
              <Route path="/doctors" element={<RequireModule module="doctors"><Doctors /></RequireModule>} />
              <Route path="/consultations" element={<RequireModule module="consultations"><Consultations /></RequireModule>} />
              <Route path="/medications" element={<RequireModule module="medications"><Medications /></RequireModule>} />
              <Route path="/billing" element={<RequireModule module="billing"><Billing /></RequireModule>} />
              <Route path="/billing/:id" element={<RequireModule module="billing"><InvoiceDetail /></RequireModule>} />
              <Route path="/reports" element={<RequireModule module="reports"><Reports /></RequireModule>} />
              <Route path="/audit" element={<RequireModule module="audit"><AuditLog /></RequireModule>} />
              <Route path="/settings" element={<RequireModule module="settings"><Settings /></RequireModule>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
