import { useEffect } from "react";
import {
  Users,
  CalendarDays,
  Receipt,
  Clock,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePatientStore } from "@/stores/patientStore";
import { useAppointmentStore } from "@/stores/appointmentStore";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS } from "@/types/appointment";

const statusLabels: Record<string, { label: string; variant: "success" | "info" | "warning" | "secondary" | "danger" }> = {
  confirmed: { label: "Confirmada", variant: "success" },
  scheduled: { label: "Programada", variant: "info" },
  in_progress: { label: "En Curso", variant: "warning" },
  completed: { label: "Completada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "danger" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { patients, isLoading: patientsLoading, fetchPatients } = usePatientStore();
  const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentStore();

  useEffect(() => {
    fetchPatients();
    fetchAppointments();
  }, [fetchPatients, fetchAppointments]);

  const isLoading = patientsLoading || appointmentsLoading;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter((a) => a.dateTime.startsWith(todayStr));
  const recentPatients = patients.slice(-5).reverse();

  const stats = [
    { title: "Pacientes Activos", value: patients.length.toString(), icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { title: "Citas Hoy", value: todayAppointments.length.toString(), icon: CalendarDays, color: "text-secondary", bg: "bg-secondary/10" },
    { title: "Total Citas", value: appointments.length.toString(), icon: Receipt, color: "text-success", bg: "bg-success/10" },
    { title: "Citas Pendientes", value: appointments.filter(a => a.status === "scheduled" || a.status === "confirmed").length.toString(), icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
  ];

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
                  <p className="text-2xl font-bold text-text mt-1">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : stat.value}
                  </p>
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
              {appointmentsLoading ? (
                <div className="p-8 text-center text-text-light">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Cargando citas...
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {todayAppointments.length === 0 ? (
                    <p className="text-center text-text-light py-8">No hay citas para hoy</p>
                  ) : (
                    todayAppointments.map((apt) => {
                      const statusInfo = statusLabels[apt.status] || statusLabels.scheduled;
                      const time = apt.dateTime.split("T")[1]?.substring(0, 5) || "";
                      return (
                        <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-dark/50 transition-colors">
                          <div className="text-sm font-mono font-semibold text-primary w-12">
                            {time}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">{apt.patientName}</p>
                            <p className="text-xs text-text-light truncate">{apt.doctorName} - {APPOINTMENT_TYPE_LABELS[apt.type]}</p>
                          </div>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                      );
                    })
                  )}
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
                <Clock className="w-4 h-4 flex-shrink-0" /> Ver Agenda Completa
              </button>
            </CardContent>
          </Card>

          {/* Recent Patients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Pacientes Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {patientsLoading ? (
                <div className="p-4 text-center text-text-light">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPatients.length === 0 ? (
                    <p className="text-center text-text-light text-sm py-4">No hay pacientes</p>
                  ) : (
                    recentPatients.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-text-light truncate">{p.documentType} {p.documentId}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-text-light">{new Date(p.createdAt).toLocaleDateString("es-CO")}</p>
                          <Badge variant="success" className="text-[10px]">Activo</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-800 truncate">Recordatorio: {appointments.filter(a => a.status === "scheduled").length} citas sin confirmar</p>
              <p className="text-xs text-amber-600 truncate">Utilice el modulo de Citas para enviar recordatorios automaticos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
