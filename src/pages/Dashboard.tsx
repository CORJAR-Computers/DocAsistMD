import {
  Users,
  CalendarDays,
  Receipt,
  Clock,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  { title: "Pacientes Activos", value: "1,247", change: "+12%", icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { title: "Citas Hoy", value: "18", change: "+3%", icon: CalendarDays, color: "text-secondary", bg: "bg-secondary/10" },
  { title: "Facturacion Mensual", value: "$45,230", change: "+8%", icon: Receipt, color: "text-success", bg: "bg-success/10" },
  { title: "Tasa Asistencia", value: "92%", change: "+2%", icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
];

const todayAppointments = [
  { id: 1, time: "08:00", patient: "Maria Garcia", doctor: "Dr. Mendez", type: "Consulta", status: "confirmed" },
  { id: 2, time: "08:30", patient: "Carlos Lopez", doctor: "Dr. Mendez", type: "Seguimiento", status: "scheduled" },
  { id: 3, time: "09:00", patient: "Ana Rodriguez", doctor: "Dra. Torres", type: "Urgencia", status: "in_progress" },
  { id: 4, time: "09:30", patient: "Pedro Martinez", doctor: "Dr. Mendez", type: "Consulta", status: "scheduled" },
  { id: 5, time: "10:00", patient: "Laura Sanchez", doctor: "Dra. Torres", type: "Procedimiento", status: "confirmed" },
  { id: 6, time: "10:30", patient: "Roberto Diaz", doctor: "Dr. Mendez", type: "Consulta", status: "completed" },
  { id: 7, time: "11:00", patient: "Carmen Vega", doctor: "Dra. Torres", type: "Telemedicina", status: "scheduled" },
];

const recentPatients = [
  { name: "Maria Garcia", doc: "CC 1.234.567", lastVisit: "Hoy", status: "Activo" },
  { name: "Carlos Lopez", doc: "CC 7.890.123", lastVisit: "Ayer", status: "Activo" },
  { name: "Ana Rodriguez", doc: "CE 4.567.890", lastVisit: "Hoy", status: "Activo" },
  { name: "Pedro Martinez", doc: "CC 2.345.678", lastVisit: "Hace 3 dias", status: "Activo" },
  { name: "Laura Sanchez", doc: "CC 9.012.345", lastVisit: "Hace 1 semana", status: "Inactivo" },
];

const statusLabels: Record<string, { label: string; variant: "success" | "info" | "warning" | "secondary" | "danger" }> = {
  confirmed: { label: "Confirmada", variant: "success" },
  scheduled: { label: "Programada", variant: "info" },
  in_progress: { label: "En Curso", variant: "warning" },
  completed: { label: "Completada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "danger" },
};

export default function Dashboard() {
  const navigate = useNavigate();

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
                  <p className="text-xs text-success mt-1 flex items-center gap-1 flex-wrap">
                    <TrendingUp className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{stat.change} vs mes anterior</span>
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
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {todayAppointments.map((apt) => {
                  const statusInfo = statusLabels[apt.status] || statusLabels.scheduled;
                  return (
                    <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-dark/50 transition-colors">
                      <div className="text-sm font-mono font-semibold text-primary w-12">
                        {apt.time}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{apt.patient}</p>
                        <p className="text-xs text-text-light truncate">{apt.doctor} - {apt.type}</p>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                  );
                })}
              </div>
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
              <button onClick={() => alert('Registrar consulta en desarrollo')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-success/5 hover:bg-success/10 text-emerald-600 transition-colors text-sm font-medium">
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
              <div className="space-y-3">
                {recentPatients.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {p.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{p.name}</p>
                      <p className="text-xs text-text-light truncate">{p.doc}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-text-light">{p.lastVisit}</p>
                      <Badge variant={p.status === "Activo" ? "success" : "secondary"} className="text-[10px]">
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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
              <p className="text-sm font-medium text-amber-800 truncate">Recordatorio: 3 citas sin confirmar para manana</p>
              <p className="text-xs text-amber-600 truncate">Utilice el modulo de Citas para enviar recordatorios automaticos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
