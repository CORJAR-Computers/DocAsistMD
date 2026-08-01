import { useState, useEffect } from "react";
import { appointmentService } from "@/services/appointmentService";
import { medicationService } from "@/services/medicationService";
import { consultationService } from "@/services/consultationService";
import { useAuthStore } from "@/stores/authStore";
import { X, ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/types/appointment";
import type { Medication } from "@/types/medication";

interface PrescriptionItem {
  medicationId: string;
  quantity: number;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
  preselectedAppointmentId?: string;
}

export default function NewConsultationModal({ onClose, onCreated, preselectedAppointmentId }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);

  const [form, setForm] = useState({
    appointmentId: preselectedAppointmentId || "",
    vitalSigns: "",
    symptoms: "",
    diagnosis: "",
    cie10Code: "",
    treatmentPlan: "",
    clinicalNotes: "",
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    setLoading(true);
    Promise.all([appointmentService.getAll(), medicationService.getAll()])
      .then(([a, m]) => {
        // Only show in-progress or scheduled appointments
        setAppointments(a.filter(ap => ap.status === "in_progress" || ap.status === "scheduled" || ap.status === "confirmed"));
        setMedications(m);
      })
      .catch(() => setError("Error cargando datos."))
      .finally(() => setLoading(false));
  }, []);

  const addPrescription = () => {
    setPrescriptions((prev) => [...prev, { medicationId: "", quantity: 1, dosage: "", frequency: "1 vez al día", duration: "7 días", instructions: "" }]);
  };

  const removePrescription = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const setPrescrField = (index: number, field: keyof PrescriptionItem, value: string | number) => {
    setPrescriptions((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.appointmentId) {
      setError("Debe seleccionar una cita.");
      return;
    }
    // Pre-validate dispensed quantities BEFORE creating anything to avoid
    // partial state (consultation created + some prescriptions dispensed
    // but the batch failing mid-way).
    const problems: string[] = [];
    for (const rx of prescriptions) {
      if (!rx.medicationId) continue;
      const m = medications.find((x) => x.id === rx.medicationId);
      if (!m) continue;
      if (!rx.quantity || rx.quantity < 1) {
        problems.push(`${m.name}: cantidad debe ser mayor que cero`);
      } else if (rx.quantity > m.currentStock) {
        problems.push(`${m.name}: stock insuficiente (disponible ${m.currentStock}, solicitado ${rx.quantity})`);
      }
    }
    if (problems.length > 0) {
      setError(`Verifique la formula medica antes de registrar:\n• ${problems.join("\n• ")}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const consultation = await consultationService.create(form);
      // Create prescriptions (each one dispenses from inventory atomically)
      for (const rx of prescriptions) {
        if (rx.medicationId && rx.dosage && rx.frequency) {
          await consultationService.createPrescription({
            consultationId: consultation.id,
            medicationId: rx.medicationId,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions || undefined,
            quantity: rx.quantity,
          }, useAuthStore.getState().user?.id);
        }
      }
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Error al registrar la consulta.");
    } finally {
      setSaving(false);
    }
  };

  const selectedAppointment = appointments.find((a) => a.id === form.appointmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Registrar Consulta</h2>
              <p className="text-xs text-text-light">Historia clínica y fórmula médica</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-light hover:text-text transition-colors duration-200 motion-reduce:transition-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20 whitespace-pre-line">{error}</div>}

          {/* Appointment selection */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Cita *</label>
            <select className="form-input" value={form.appointmentId} onChange={(e) => set("appointmentId", e.target.value)}>
              <option value="">Seleccionar cita...</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patientName} — Dr. {a.doctorName} ({new Date(a.dateTime).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })})
                </option>
              ))}
            </select>
            {selectedAppointment && (
              <p className="text-xs text-text-muted mt-1">Paciente: {selectedAppointment.patientName} | Médico: Dr. {selectedAppointment.doctorName}</p>
            )}
          </div>

          {/* Vital Signs */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Signos Vitales</label>
            <input className="form-input" value={form.vitalSigns} onChange={(e) => set("vitalSigns", e.target.value)} placeholder="PA: 120/80, FC: 72bpm, Temp: 36.5°C, SpO2: 98%" />
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Síntomas / Motivo de Consulta</label>
            <textarea className="form-input resize-none" rows={2} value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} placeholder="Describa los síntomas del paciente..." />
          </div>

          {/* Diagnosis */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-light mb-1">Diagnóstico</label>
              <input className="form-input" value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} placeholder="Ej. Hipertensión arterial esencial" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Código CIE-10</label>
              <input className="form-input font-mono uppercase" value={form.cie10Code} onChange={(e) => set("cie10Code", e.target.value.toUpperCase())} placeholder="I10" maxLength={7} />
            </div>
          </div>

          {/* Treatment Plan */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Plan de Tratamiento</label>
            <textarea className="form-input resize-none" rows={2} value={form.treatmentPlan} onChange={(e) => set("treatmentPlan", e.target.value)} placeholder="Indique el plan de tratamiento..." />
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Notas Clínicas</label>
            <textarea className="form-input resize-none" rows={2} value={form.clinicalNotes} onChange={(e) => set("clinicalNotes", e.target.value)} placeholder="Observaciones adicionales del médico..." />
          </div>

          {/* Prescriptions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-light uppercase tracking-wide">Fórmula Médica</label>
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addPrescription}>
                <Plus className="w-3 h-3" /> Agregar Medicamento
              </Button>
            </div>

            {prescriptions.length === 0 && (
              <p className="text-xs text-text-muted py-3 text-center border border-dashed border-border rounded-lg">
                Sin medicamentos en la fórmula
              </p>
            )}

            <div className="space-y-3">
              {prescriptions.map((rx, i) => (
                <div key={i} className="p-3 rounded-xl border border-border bg-surface-dark/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-light">Medicamento {i + 1}</span>
                    <button type="button" onClick={() => removePrescription(i)} className="text-danger hover:text-danger/80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    className="form-input text-sm"
                    value={rx.medicationId}
                    onChange={(e) => setPrescrField(i, "medicationId", e.target.value)}
                  >
                    <option value="">Seleccionar medicamento...</option>
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.concentration} — {m.presentation} (Stock: {m.currentStock})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <label className="block text-xs text-text-muted mb-1">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        className="form-input text-sm"
                        value={rx.quantity}
                        onChange={(e) => setPrescrField(i, "quantity", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    {(() => {
                      const m = rx.medicationId ? medications.find((x) => x.id === rx.medicationId) : undefined;
                      if (!m) return null;
                      const exceeds = rx.quantity > m.currentStock || rx.quantity < 1;
                      return (
                        <p className={`text-xs mt-4 ${exceeds ? "text-danger font-medium" : "text-text-muted"}`}>
                          Stock disponible: {m.currentStock}
                          {exceeds && " — excede el stock!"}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Dosis</label>
                      <input className="form-input text-sm" value={rx.dosage} onChange={(e) => setPrescrField(i, "dosage", e.target.value)} placeholder="1 tableta" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Frecuencia</label>
                      <select className="form-input text-sm" value={rx.frequency} onChange={(e) => setPrescrField(i, "frequency", e.target.value)}>
                        <option>Cada 8 horas</option>
                        <option>Cada 12 horas</option>
                        <option>1 vez al día</option>
                        <option>2 veces al día</option>
                        <option>3 veces al día</option>
                        <option>Según necesidad</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Duración</label>
                      <input className="form-input text-sm" value={rx.duration} onChange={(e) => setPrescrField(i, "duration", e.target.value)} placeholder="7 días" />
                    </div>
                  </div>
                  <input className="form-input text-sm" value={rx.instructions} onChange={(e) => setPrescrField(i, "instructions", e.target.value)} placeholder="Instrucciones especiales (opcional)" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving || loading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              Registrar Consulta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
