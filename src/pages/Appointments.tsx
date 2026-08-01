import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppointmentStore } from "@/stores/appointmentStore";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_TYPE_LABELS } from "@/types/appointment";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Filter, Loader2 } from "lucide-react";

const hours = Array.from({ length: 10 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

export default function Appointments() {
  const {
    isLoading,
    selectedDate,
    selectedStatus,
    fetchAppointments,
    setSelectedDate,
    setSelectedStatus,
    getFilteredAppointments,
  } = useAppointmentStore();

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filtered = getFilteredAppointments();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Agenda de Citas</h1>
          <p className="text-sm text-text-light mt-1">Gestione las citas del consultorio</p>
        </div>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Nueva Cita</Button>
      </div>

      {/* Date & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split("T")[0]);
              }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{selectedDate}</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split("T")[0]);
              }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={selectedStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedStatus("all")}>Todas</Button>
              <Button variant={selectedStatus === "scheduled" ? "default" : "outline"} size="sm" onClick={() => setSelectedStatus("scheduled")}>Programadas</Button>
              <Button variant={selectedStatus === "confirmed" ? "default" : "outline"} size="sm" onClick={() => setSelectedStatus("confirmed")}>Confirmadas</Button>
              <Button variant={selectedStatus === "in_progress" ? "default" : "outline"} size="sm" onClick={() => setSelectedStatus("in_progress")}>En Curso</Button>
              <Button variant={selectedStatus === "completed" ? "default" : "outline"} size="sm" onClick={() => setSelectedStatus("completed")}>Completadas</Button>
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
          {isLoading ? (
            <div className="p-12 text-center text-text-light">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Cargando citas...
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
