import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_TYPE_LABELS } from "@/types/appointment";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import NewAppointmentModal from "@/components/modals/NewAppointmentModal";

const mockAppointments: Appointment[] = [
  { id: "1", patientId: "1", patientName: "Maria Garcia", doctorId: "1", doctorName: "Dr. Mendez", dateTime: "2026-08-01T08:00:00", durationMinutes: 30, status: "confirmed", type: "consultation", reason: "Dolor de cabeza persistente", notes: "", createdAt: "", updatedAt: "" },
  { id: "2", patientId: "2", patientName: "Carlos Lopez", doctorId: "1", doctorName: "Dr. Mendez", dateTime: "2026-08-01T08:30:00", durationMinutes: 30, status: "scheduled", type: "follow_up", reason: "Control hipertension", notes: "", createdAt: "", updatedAt: "" },
  { id: "3", patientId: "3", patientName: "Ana Rodriguez", doctorId: "2", doctorName: "Dra. Torres", dateTime: "2026-08-01T09:00:00", durationMinutes: 45, status: "in_progress", type: "emergency", reason: "Dolor abdominal agudo", notes: "", createdAt: "", updatedAt: "" },
  { id: "4", patientId: "4", patientName: "Pedro Sanchez", doctorId: "1", doctorName: "Dr. Mendez", dateTime: "2026-08-01T09:30:00", durationMinutes: 30, status: "scheduled", type: "consultation", reason: "Chequeo general", notes: "", createdAt: "", updatedAt: "" },
  { id: "5", patientId: "5", patientName: "Laura Diaz", doctorId: "2", doctorName: "Dra. Torres", dateTime: "2026-08-01T10:00:00", durationMinutes: 60, status: "confirmed", type: "procedure", reason: "Curacion de herida", notes: "", createdAt: "", updatedAt: "" },
  { id: "6", patientId: "1", patientName: "Maria Garcia", doctorId: "1", doctorName: "Dr. Mendez", dateTime: "2026-08-01T11:00:00", durationMinutes: 30, status: "completed", type: "consultation", reason: "Seguimiento", notes: "", createdAt: "", updatedAt: "" },
  { id: "7", patientId: "2", patientName: "Carlos Lopez", doctorId: "2", doctorName: "Dra. Torres", dateTime: "2026-08-01T14:00:00", durationMinutes: 30, status: "scheduled", type: "telemedicine", reason: "Consulta virtual", notes: "", createdAt: "", updatedAt: "" },
  { id: "8", patientId: "3", patientName: "Ana Rodriguez", doctorId: "1", doctorName: "Dr. Mendez", dateTime: "2026-08-01T14:30:00", durationMinutes: 30, status: "cancelled", type: "consultation", reason: "Reschedule", notes: "", createdAt: "", updatedAt: "" },
];

const hours = Array.from({ length: 10 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);

  const filtered = mockAppointments.filter((a) => {
    const statusMatch = filterStatus === "all" || a.status === filterStatus;
    return statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Agenda de Citas</h1>
          <p className="text-sm text-text-light mt-1">Gestione las citas del consultorio</p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nueva Cita</Button>
      </div>

      {/* Date & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{selectedDate}</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("all")}>Todas</Button>
              <Button variant={filterStatus === "scheduled" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("scheduled")}>Programadas</Button>
              <Button variant={filterStatus === "confirmed" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("confirmed")}>Confirmadas</Button>
              <Button variant={filterStatus === "in_progress" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("in_progress")}>En Curso</Button>
              <Button variant={filterStatus === "completed" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("completed")}>Completadas</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule View */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Horario del Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {hours.map((hour) => {
              const hourAppointments = filtered.filter((a) => a.dateTime.includes(`T${hour.split(":")[0]}:`));
              return (
                <div key={hour} className="flex gap-4 min-h-[60px]">
                  <div className="w-16 flex-shrink-0 pt-2 text-sm font-mono text-text-light">{hour}</div>
                  <div className="flex-1 border-t border-border/50 pt-1 space-y-1">
                    {hourAppointments.length > 0 ? (
                      hourAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 cursor-pointer hover:shadow-sm transition-all ${APPOINTMENT_STATUS_COLORS[apt.status].split(" ")[0]}`}
                        >
                          <Clock className="w-3.5 h-3.5 text-text-light flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text truncate">{apt.patientName}</span>
                              <Badge variant={apt.status === "confirmed" ? "success" : apt.status === "in_progress" ? "warning" : apt.status === "cancelled" ? "danger" : "info"} className="text-[10px]">
                                {APPOINTMENT_STATUS_LABELS[apt.status]}
                              </Badge>
                            </div>
                            <p className="text-xs text-text-light">{apt.doctorName} - {APPOINTMENT_TYPE_LABELS[apt.type]} - {apt.durationMinutes} min</p>
                          </div>
                          <p className="text-xs text-text-light flex-shrink-0">{apt.reason}</p>
                        </div>
                      ))
                    ) : (
                      <div className="h-10 flex items-center px-3 text-xs text-text-muted">Sin citas</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {showModal && (
        <NewAppointmentModal
          onClose={() => setShowModal(false)}
          onCreated={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
