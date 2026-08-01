import { useState, useEffect } from "react";
import {
  Users,
  CalendarDays,
  Receipt,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  Pill,
  Stethoscope,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiCall } from "@/services/api";
import { medicationService } from "@/services/medicationService";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABELS } from "@/types/appointment";
import type { Appointment } from "@/types/appointment";
import type { Patient } from "@/types/patient";
import type { Invoice } from "@/types/billing";
import type { Medication } from "@/types/medication";

const STATUS_VARIANTS: Record<string, "success" | "info" | "warning" | "secondary" | "danger"> = {
  scheduled: "info",
  confirmed: "success",
  in_progress: "warning",
  completed: "secondary",
  cancelled: "danger",
  no_show: "secondary",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const EXPIRY_DAYS = 90;

const fmtShortDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

export default function Dashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [lowStock, setLowStock] = useState<Medication[]>([]);
  const [expiring, setExpiring] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [appts, pats, invoices, low, exp] = await Promise.all([
          apiCall<Appointment[]>("get_appointments"),
          apiCall<Patient[]>("get_patients"),
          apiCall<Invoice[]>("get_invoices"),
          medicationService.getLowStock(),
          medicationService.getExpiring(EXPIRY_DAYS),
        ]);
        setAppointments(appts);
        setPatients(pats);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const revenue = invoices
          .filter((i) => i.status === "paid" && new Date(i.createdAt) >= monthStart)
          .reduce((sum, i) => sum + i.total, 0);
        setMonthlyRevenue(revenue);
        setLowStock(low);
        setExpiring(exp);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments
    .filter((a) => a.dateTime.startsWith(today))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  const recentPatients = [...patients]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 5);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const unconfirmedTomorrow = appointments.filter(
    (a) => a.dateTime.startsWith(tomorrow) && a.status === "scheduled"
  ).length;

  const stats = [
    { title: "Pacientes Activos", value: loading ? "..." : patients.length.toLocaleString("es-CO"), icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { title: "Citas Hoy", value: loading ? "..." : todayAppointments.length.toString(), icon: CalendarDays, color: "text-secondary", bg: "bg-secondary/10" },
    { title: "Facturacion del Mes", value: loading ? "..." : fmt(monthlyRevenue), icon: Receipt, color: "text-success", bg: "bg-success/10" },
    { title: "Stock Bajo", value: loading ? "..." : lowStock.length.toString(), icon: Pill, color: "text-warning", bg: "bg-warning/10" },
  ];

  const expired = expiring.filter((m) => m.expiryDate && new Date(m.expiryDate) < new Date());
  const expiringSoon = expiring.filter((m) => m.expiryDate && new Date(m.expiryDate) >= new Date());
  const lowStockSorted = [...lowStock].sort((a, b) => a.currentStock - b.currentStock);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-medium text-text-light truncate">{stat.title}</p>
                  <p className="text-2xl font-bold text-text mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex-shrink-0 ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Citas de Hoy</CardTitle>
              <Badge variant="info">{todayAppointments.length} citas</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-text-light text-sm">Cargando citas de hoy...</div>
              ) : todayAppointments.length === 0 ? (
                <div className="py-8 text-center text-text-light text-sm">No hay citas programadas para hoy</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {todayAppointments.map((apt) => {
                    const statusInfo = STATUS_VARIANTS[apt.status] || "secondary";
                    return (
                      <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-dark/50 transition-colors">
                        <div className="text-sm font-mono font-semibold text-primary w-12">
                          {new Date(apt.dateTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">{apt.patientName}</p>
                          <p className="text-xs text-text-light truncate">
                            <Stethoscope className="w-3 h-3 inline mr-1" />
                            {apt.doctorName}
                          </p>
                        </div>
                        <Badge variant={statusInfo}>{APPOINTMENT_STATUS_LABELS[apt.status] || apt.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Patients */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Acciones Rapidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button onClick={() => navigate('/patients/new')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary transition-colors text-sm font-medium">
                <UserPlus className="w-4 h-4 flex-shrink-0" /> Nuevo Paciente
              </button>
              <button onClick={() => navigate('/appointments')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors text-sm font-medium">
                <CalendarDays className="w-4 h-4 flex-shrink-0" /> Agendar Cita
              </button>
              <button onClick={() => navigate('/consultations')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-success/5 hover:bg-success/10 text-emerald-600 transition-colors text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Registrar Consulta
              </button>
              <button onClick={() => navigate('/appointments')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-warning/5 hover:bg-warning/10 text-amber-600 transition-colors text-sm font-medium">
                <CalendarDays className="w-4 h-4 flex-shrink-0" /> Ver Agenda Completa
              </button>
            </CardContent>
          </Card>

          {/* Recent Patients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Pacientes Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-text-light py-4">Cargando...</p>
              ) : recentPatients.length === 0 ? (
                <p className="text-sm text-text-light py-4">No hay pacientes registrados</p>
              ) : (
                <div className="space-y-3">
                  {recentPatients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}/history`)}
                      className="w-full flex items-center gap-3 text-left hover:bg-surface-dark/50 rounded-lg p-1.5 -m-1.5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {p.firstName?.[0]}{p.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-text-light truncate">{p.documentId}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="success" className="text-[10px]">Activo</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts Section */}
      {(unconfirmedTomorrow > 0 || lowStock.length > 0 || expiring.length > 0) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {unconfirmedTomorrow > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-800 truncate">Recordatorio: {unconfirmedTomorrow} citas sin confirmar para manana</p>
                  <p className="text-xs text-amber-600 truncate">Utilice el modulo de Citas para confirmar o cancelar</p>
                </div>
              </div>
            )}

            {/* Low stock alerts (backend get_low_stock_medications) */}
            {lowStock.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">{lowStock.length} medicamento(s) con stock bajo o agotado</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lowStockSorted.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-danger/25 text-xs">
                        <Pill className="w-3 h-3 text-danger" />
                        <span className="font-medium text-text truncate max-w-[150px]">{m.name}</span>
                        <span className="text-text-light">
                          <span className={cn("font-semibold", m.currentStock <= 0 ? "text-red-600" : "text-amber-700")}>{m.currentStock}</span>/
                          {m.minimumStock}
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-red-600 mt-2">Revise el inventario para reabastecer</p>
                </div>
              </div>
            )}

            {/* Expired medications */}
            {expired.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">{expired.length} medicamento(s) VENCIDOS</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {expired.map((m) => `${m.name} (${m.expiryDate ? fmtShortDate(m.expiryDate) : ""})`).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Expiring soon */}
            {expiringSoon.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <CalendarClock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800">
                    {expiringSoon.length} medicamento(s) por vencer en {EXPIRY_DAYS} dias
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {expiringSoon.map((m) => `${m.name} (${m.expiryDate ? fmtShortDate(m.expiryDate) : ""})`).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {(lowStock.length > 0 || expiring.length > 0) && (
              <button
                onClick={() => navigate('/medications')}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
              >
                Ver inventario completo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
