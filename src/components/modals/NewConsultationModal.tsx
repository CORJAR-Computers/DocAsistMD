import { useState, useEffect, useMemo } from "react";
import { appointmentService } from "@/services/appointmentService";
import { medicationService } from "@/services/medicationService";
import { consultationService } from "@/services/consultationService";
import { useAuthStore } from "@/stores/authStore";
import {
  X, ClipboardList, Loader2, Plus, Trash2, Search,
  Activity, Scale, Stethoscope, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/types/appointment";
import type { Medication } from "@/types/medication";
import { searchCie10, TIPOS_DIAGNOSTICO_RIPS } from "@/lib/colombiaMedicalCatalog";
import { calculateBmi, formatVitalSignsString, type VitalSignsData } from "@/lib/vitals";

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

  // Structured vital signs
  const [vitals, setVitals] = useState<VitalSignsData>({
    systolic: "",
    diastolic: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    weightKg: "",
    heightCm: "",
  });

  const [form, setForm] = useState({
    appointmentId: preselectedAppointmentId || "",
    vitalSigns: "",
    symptoms: "",
    diagnosis: "",
    cie10Code: "",
    treatmentPlan: "",
    clinicalNotes: "",
  });

  // CIE-10 search state
  const [cieSearch, setCieSearch] = useState("");
  const [showCieSuggestions, setShowCieSuggestions] = useState(false);
  const [tipoDiagnostico, setTipoDiagnostico] = useState<string>("1"); // 1: Impresión, 2: Nuevo, 3: Repetido

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const updateVital = (field: keyof VitalSignsData, val: string) => {
    const updated = { ...vitals, [field]: val };
    setVitals(updated);
    const formatted = formatVitalSignsString(updated);
    set("vitalSigns", formatted);
  };

  const bmiResult = useMemo(() => calculateBmi(vitals.weightKg, vitals.heightCm), [vitals.weightKg, vitals.heightCm]);

  const cieSuggestions = useMemo(() => {
    if (!cieSearch.trim()) return [];
    return searchCie10(cieSearch).slice(0, 6);
  }, [cieSearch]);

  useEffect(() => {
    setLoading(true);
    Promise.all([appointmentService.getAll(), medicationService.getAll()])
      .then(([a, m]) => {
        setAppointments(a.filter(ap => ap.status === "in_progress" || ap.status === "scheduled" || ap.status === "confirmed"));
        setMedications(m);
      })
      .catch(() => setError("Error cargando datos."))
      .finally(() => setLoading(false));
  }, []);

  const addPrescription = () => {
    setPrescriptions((prev) => [
      ...prev,
      { medicationId: "", quantity: 1, dosage: "", frequency: "1 vez al día", duration: "7 días", instructions: "" }
    ]);
  };

  const removePrescription = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const setPrescrField = (index: number, field: keyof PrescriptionItem, value: string | number) => {
    setPrescriptions((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSelectCie10 = (code: string, name: string) => {
    set("cie10Code", code);
    set("diagnosis", name);
    setShowCieSuggestions(false);
    setCieSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.appointmentId) {
      setError("Debe seleccionar una cita.");
      return;
    }
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
      setError(`Verifique la fórmula médica antes de registrar:\n• ${problems.join("\n• ")}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const consultation = await consultationService.create(form);
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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-linear-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Registrar Consulta Médica</h2>
              <p className="text-xs text-text-light">Historia clínica según Res. 1995 y RIPS (Colombia)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-light hover:text-text transition-colors duration-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20 whitespace-pre-line">{error}</div>}

          {/* Cita seleccionada */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Cita Médica *</label>
            <select className="form-input" value={form.appointmentId} onChange={(e) => set("appointmentId", e.target.value)} required>
              <option value="">Seleccionar cita...</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patientName} — Dr. {a.doctorName} ({new Date(a.dateTime).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })})
                </option>
              ))}
            </select>
            {selectedAppointment && (
              <p className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
                <span className="font-medium text-text">Paciente:</span> {selectedAppointment.patientName} | <span className="font-medium text-text">Médico:</span> Dr. {selectedAppointment.doctorName}
              </p>
            )}
          </div>

          {/* Signos Vitales Estructurados y Calculadora de IMC */}
          <div className="p-4 rounded-xl border border-border bg-surface-dark/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text flex items-center gap-1.5 uppercase tracking-wide">
                <Activity className="w-3.5 h-3.5 text-primary" /> Signos Vitales & Antropometría
              </span>
              {bmiResult && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-light font-medium">IMC: <strong className="text-text tabular-nums">{bmiResult.bmi} kg/m²</strong></span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${bmiResult.badgeClass}`}>
                    {bmiResult.category}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-text-muted mb-1">PA Sistólica (mmHg)</label>
                <input
                  type="number"
                  className="form-input text-xs tabular-nums"
                  placeholder="120"
                  value={vitals.systolic}
                  onChange={(e) => updateVital("systolic", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted mb-1">PA Diastólica (mmHg)</label>
                <input
                  type="number"
                  className="form-input text-xs tabular-nums"
                  placeholder="80"
                  value={vitals.diastolic}
                  onChange={(e) => updateVital("diastolic", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Frec. Cardíaca (lpm)</label>
                <input
                  type="number"
                  className="form-input text-xs tabular-nums"
                  placeholder="72"
                  value={vitals.heartRate}
                  onChange={(e) => updateVital("heartRate", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input text-xs tabular-nums"
                  placeholder="36.5"
                  value={vitals.temperature}
                  onChange={(e) => updateVital("temperature", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Saturación SpO2 (%)</label>
                <input
                  type="number"
                  className="form-input text-xs tabular-nums"
                  placeholder="98"
                  value={vitals.oxygenSaturation}
                  onChange={(e) => updateVital("oxygenSaturation", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Frec. Resp. (rpm)</label>
                <input
                  type="number"
                  className="form-input text-xs tabular-nums"
                  placeholder="16"
                  value={vitals.respiratoryRate}
                  onChange={(e) => updateVital("respiratoryRate", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input text-xs tabular-nums"
                  placeholder="70"
                  value={vitals.weightKg}
                  onChange={(e) => updateVital("weightKg", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Talla (cm)</label>
                <input
                  type="number"
                  className="form-input text-xs tabular-nums"
                  placeholder="175"
                  value={vitals.heightCm}
                  onChange={(e) => updateVital("heightCm", e.target.value)}
                />
              </div>
            </div>

            {form.vitalSigns && (
              <p className="text-[11px] text-text-muted bg-surface/60 p-2 rounded-lg border border-border/50">
                <strong>Resumen clínico:</strong> {form.vitalSigns}
              </p>
            )}
          </div>

          {/* Síntomas / Motivo de consulta */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Motivo de Consulta y Enfermedad Actual *</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.symptoms}
              onChange={(e) => set("symptoms", e.target.value)}
              placeholder="Describa el motivo de consulta, evolución y sintomatología..."
              required
            />
          </div>

          {/* Diagnóstico Asistido con Catálogo CIE-10 (Colombia) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-light flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-secondary" /> Diagnóstico y Código CIE-10 (Norma Minsalud)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar en catálogo CIE-10..."
                  value={cieSearch}
                  onChange={(e) => {
                    setCieSearch(e.target.value);
                    setShowCieSuggestions(true);
                  }}
                  onFocus={() => setShowCieSuggestions(true)}
                  className="h-7 text-xs px-2.5 rounded-md border border-border bg-surface-dark text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-56"
                />
                {showCieSuggestions && cieSuggestions.length > 0 && (
                  <div className="absolute right-0 top-8 z-30 w-80 bg-surface border border-border rounded-xl shadow-xl p-1.5 space-y-1">
                    <p className="text-[10px] font-semibold text-text-muted px-2 py-1 uppercase tracking-wider">Resultados CIE-10</p>
                    {cieSuggestions.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelectCie10(item.code, item.name)}
                        className="w-full text-left p-2 rounded-lg hover:bg-surface-hover text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-text truncate mr-2">{item.name}</span>
                        <span className="font-mono text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">{item.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  className="form-input"
                  value={form.diagnosis}
                  onChange={(e) => set("diagnosis", e.target.value)}
                  placeholder="Diagnóstico clínico (ej. Hipertensión arterial esencial)"
                  required
                />
              </div>
              <div>
                <input
                  className="form-input font-mono uppercase"
                  value={form.cie10Code}
                  onChange={(e) => set("cie10Code", e.target.value.toUpperCase())}
                  placeholder="CIE-10 (ej. I10)"
                  maxLength={7}
                  required
                />
              </div>
              <div>
                <select
                  className="form-input text-xs"
                  value={tipoDiagnostico}
                  onChange={(e) => setTipoDiagnostico(e.target.value)}
                >
                  {TIPOS_DIAGNOSTICO_RIPS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Plan de Tratamiento */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Conducta y Plan de Tratamiento</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.treatmentPlan}
              onChange={(e) => set("treatmentPlan", e.target.value)}
              placeholder="Conducta médica, paraclínicos solicitados, recomendaciones dietarias y estilo de vida..."
            />
          </div>

          {/* Notas Clínicas */}
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Evolución y Notas Clínicas</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.clinicalNotes}
              onChange={(e) => set("clinicalNotes", e.target.value)}
              placeholder="Observaciones de evolución o antecedentes relevantes..."
            />
          </div>

          {/* Fórmula Médica (Decreto 2200 de 2005) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-semibold text-text uppercase tracking-wide">Fórmula Médica (DCI)</label>
                <p className="text-[11px] text-text-muted">Cumple Decreto 2200/2005 de Colombia</p>
              </div>
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addPrescription}>
                <Plus className="w-3 h-3" /> Agregar Medicamento
              </Button>
            </div>

            {prescriptions.length === 0 && (
              <p className="text-xs text-text-muted py-3 text-center border border-dashed border-border rounded-lg">
                Sin medicamentos en la fórmula médica
              </p>
            )}

            <div className="space-y-3">
              {prescriptions.map((rx, i) => (
                <div key={i} className="p-3 rounded-xl border border-border bg-surface-dark/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-light">Prescripción #{i + 1}</span>
                    <button type="button" onClick={() => removePrescription(i)} className="text-danger hover:text-danger/80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className="form-input text-sm"
                      value={rx.medicationId}
                      onChange={(e) => setPrescrField(i, "medicationId", e.target.value)}
                      required
                    >
                      <option value="">Seleccionar medicamento del inventario...</option>
                      {medications.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.activeIngredient} - {m.presentation}) — Stock: {m.currentStock}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="form-input text-sm tabular-nums"
                      placeholder="Cantidad a dispensar"
                      value={rx.quantity}
                      onChange={(e) => setPrescrField(i, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="form-input text-xs"
                      placeholder="Dosis (ej. 500mg)"
                      value={rx.dosage}
                      onChange={(e) => setPrescrField(i, "dosage", e.target.value)}
                      required
                    />
                    <input
                      className="form-input text-xs"
                      placeholder="Frecuencia (ej. Cada 8 horas)"
                      value={rx.frequency}
                      onChange={(e) => setPrescrField(i, "frequency", e.target.value)}
                      required
                    />
                    <input
                      className="form-input text-xs"
                      placeholder="Duración (ej. 7 días)"
                      value={rx.duration}
                      onChange={(e) => setPrescrField(i, "duration", e.target.value)}
                      required
                    />
                  </div>
                  <input
                    className="form-input text-xs"
                    placeholder="Instrucciones al paciente (ej. Tomar con las comidas con abundante agua)"
                    value={rx.instructions}
                    onChange={(e) => setPrescrField(i, "instructions", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              Guardar Consulta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
