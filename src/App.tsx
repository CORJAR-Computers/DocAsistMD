import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import Settings from "@/pages/Settings";
import { useAuthStore } from "@/stores/authStore";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  const { isAuthenticated, initAuth } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initAuth().finally(() => setInitializing(false));
  }, [initAuth]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F2B3D] via-[#1B6B93] to-[#4FC0D0]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-sm">Cargando DocAsistMD...</p>
        </div>
      </div>
    );
  }

  return (
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
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/new" element={<PatientForm />} />
            <Route path="/patients/:id/edit" element={<PatientForm />} />
            <Route path="/patients/:id/history" element={<PatientHistory />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/consultations" element={<Consultations />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/billing/:id" element={<InvoiceDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
