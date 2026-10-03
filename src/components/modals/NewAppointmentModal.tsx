import { useState, useEffect } from "react";
import { appointmentService } from "@/services/appointmentService";
import { useAuthStore } from "@/stores/authStore";
import { patientService } from "@/services/patientService";
import { doctorService } from "@/services/doctorService";
import { X, CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/patient";
import type { Doctor } from "@/types/doctor";
import type { AppointmentType, CreateAppointmentInput } from "@/types/appointment";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  preselectedPatientId?: string;
  preselectedDateTime?: string;
}

export default function NewAppointmentModal({ onClose, onCreated, preselectedPatientId, preselectedDateTime }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [form, setForm] = useState<CreateAppointmentInput>({
    patientId: preselectedPatientId || "",
    doctorId: "",
    dateTime: preselectedDateTime || new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    durationMinutes: 30,
    appointmentType: "consultation" as AppointmentType,
    reason: "",
    notes: "",
  });

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    setLoading(true);
    Promise.all([patientService.getAll(), doctorService.getAll()])
      .then(([p, d]) => { setPatients(p); setDoctors(d); })
      .catch(() => setError("Error cargando datos."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.reason) {
      setError("Paciente, médico y motivo son requeridos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await appointmentService.create(form, useAuthStore.getState().user?.id);
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Error al crear la cita.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-linear-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Nueva Cita</h2>
              <p className="text-xs text-text-light">Agendar una cita médica</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-light hover:text-text transition-colors duration-200 motion-reduce:transition-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}
          {loading && <div className="text-center text-text-light text-sm py-4">Cargando datos...</div>}

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Paciente *</label>
            <select className="form-input" value={form.patientId} onChange={(e) => set("patientId", e.target.value)}>
              <option value="">Seleccionar paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.documentId}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Médico *</label>
            <select className="form-input" value={form.doctorId} onChange={(e) => set("doctorId", e.target.value)}>
              <option value="">Seleccionar médico...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} — {d.specialty}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Fecha y Hora *</label>
              <input type="datetime-local" className="form-input" value={form.dateTime} onChange={(e) => set("dateTime", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Duración (min)</label>
              <select className="form-input" value={form.durationMinutes} onChange={(e) => set("durationMinutes", parseInt(e.target.value))}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Tipo de Cita</label>
            <select className="form-input" value={form.appointmentType} onChange={(e) => set("appointmentType", e.target.value)}>
              <option value="consultation">Consulta</option>
              <option value="follow_up">Control / Seguimiento</option>
              <option value="procedure">Procedimiento</option>
              <option value="emergency">Urgencia</option>
              <option value="telemedicine">Telemedicina</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Motivo de Consulta *</label>
            <textarea className="form-input resize-none" rows={2} value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Describa el motivo de la cita..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Notas adicionales</label>
            <textarea className="form-input resize-none" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Observaciones opcionales..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving || loading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
              Agendar Cita
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
