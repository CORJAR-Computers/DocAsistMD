import { useState, useEffect } from "react";
import { invoiceService } from "@/services/invoiceService";
import { useAuthStore } from "@/stores/authStore";
import { patientService } from "@/services/patientService";
import { appointmentService } from "@/services/appointmentService";
import { X, Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/patient";
import type { Appointment } from "@/types/appointment";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

export default function NewInvoiceModal({ onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [form, setForm] = useState({
    patientId: "",
    appointmentId: "",
    subtotal: 80000,
    taxRate: 0.19,
    paymentMethod: "cash",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  });

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    setLoading(true);
    Promise.all([patientService.getAll(), appointmentService.getAll()])
      .then(([p, a]) => { setPatients(p); setAppointments(a); })
      .catch(() => setError("Error cargando datos."))
      .finally(() => setLoading(false));
  }, []);

  const taxAmount = form.subtotal * form.taxRate;
  const total = form.subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      setError("Debe seleccionar un paciente.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await invoiceService.create(
        {
          patientId: form.patientId,
          appointmentId: form.appointmentId || null,
          subtotal: form.subtotal,
          taxRate: form.taxRate,
          taxAmount,
          total,
          paymentMethod: form.paymentMethod,
          dueDate: form.dueDate,
        },
        useAuthStore.getState().user?.id
      );
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Error al crear la factura.");
    } finally {
      setSaving(false);
    }
  };

  const patientAppointments = appointments.filter((a) => a.patientId === form.patientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Nueva Factura</h2>
              <p className="text-xs text-text-light">Registrar cobro de servicio</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-dark flex items-center justify-center text-text-light hover:text-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Paciente *</label>
            <select className="form-input" value={form.patientId} onChange={(e) => { set("patientId", e.target.value); set("appointmentId", ""); }}>
              <option value="">Seleccionar paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.documentId}</option>
              ))}
            </select>
          </div>

          {form.patientId && (
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Cita Asociada (opcional)</label>
              <select className="form-input" value={form.appointmentId} onChange={(e) => set("appointmentId", e.target.value)}>
                <option value="">Sin cita asociada</option>
                {patientAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    Dr. {a.doctorName} — {new Date(a.dateTime).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Subtotal (COP)</label>
              <input
                type="number"
                className="form-input"
                value={form.subtotal}
                onChange={(e) => set("subtotal", parseFloat(e.target.value) || 0)}
                min={0}
                step={1000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">IVA</label>
              <select className="form-input" value={form.taxRate} onChange={(e) => set("taxRate", parseFloat(e.target.value))}>
                <option value={0}>0% — Exento</option>
                <option value={0.05}>5%</option>
                <option value={0.19}>19% — Estándar</option>
              </select>
            </div>
          </div>

          {/* Total preview */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
            <div className="flex justify-between text-sm text-text-light">
              <span>Subtotal:</span><span>{fmt(form.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-text-light">
              <span>IVA ({(form.taxRate * 100).toFixed(0)}%):</span><span>{fmt(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-text border-t border-primary/10 pt-1 mt-1">
              <span>Total:</span><span className="text-primary">{fmt(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Método de Pago</label>
              <select className="form-input" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="insurance">Seguro Médico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Fecha de Vencimiento</label>
              <input type="date" className="form-input" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving || loading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Crear Factura
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
