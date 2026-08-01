import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_BADGE, APPOINTMENT_TYPE_LABELS } from "@/types/appointment";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import { X, CalendarDays, Clock, User, Stethoscope, Loader2, CheckCircle2, XCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  appointment: Appointment;
  updating: boolean;
  onStatusChange: (status: AppointmentStatus) => void;
  onClose: () => void;
}

export default function AppointmentDetailModal({ appointment: apt, updating, onStatusChange, onClose }: Props) {
  const dateTime = new Date(apt.dateTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Detalle de Cita</h2>
              <p className="text-xs text-text-light">{APPOINTMENT_TYPE_LABELS[apt.appointmentType]}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-light hover:text-text transition-colors duration-200 motion-reduce:transition-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-text">{apt.patientName}</p>
              <p className="text-xs text-text-light">{apt.doctorName}</p>
            </div>
            <Badge variant={APPOINTMENT_STATUS_BADGE[apt.status]}>{APPOINTMENT_STATUS_LABELS[apt.status]}</Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-text">
              <Clock className="w-4 h-4 text-text-light flex-shrink-0" />
              <span className="capitalize">
                {dateTime.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text">
              <Clock className="w-4 h-4 text-text-light flex-shrink-0" />
              <span>
                {dateTime.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · {apt.durationMinutes} min
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text">
              <User className="w-4 h-4 text-text-light flex-shrink-0" />
              <span>Paciente: {apt.patientName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text">
              <Stethoscope className="w-4 h-4 text-text-light flex-shrink-0" />
              <span>Médico: {apt.doctorName}</span>
            </div>
          </div>

          <div className="rounded-xl bg-surface-dark/60 border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-text-light">Motivo</p>
            <p className="text-sm text-text">{apt.reason || "Sin motivo registrado"}</p>
            {apt.notes && (
              <>
                <p className="text-xs font-medium text-text-light pt-2">Notas</p>
                <p className="text-sm text-text">{apt.notes}</p>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {apt.status === "scheduled" && (
              <Button size="sm" variant="outline" className="gap-1.5 flex-1" disabled={updating} onClick={() => onStatusChange("confirmed")}>
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                Confirmar
              </Button>
            )}
            {(apt.status === "scheduled" || apt.status === "confirmed") && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" disabled={updating} onClick={() => onStatusChange("in_progress")}>
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-warning" />}
                  Iniciar
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" disabled={updating} onClick={() => onStatusChange("cancelled")}>
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
                  Cancelar
                </Button>
              </>
            )}
            {apt.status === "in_progress" && (
              <Button size="sm" className="gap-1.5 flex-1" disabled={updating} onClick={() => onStatusChange("completed")}>
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Completar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
