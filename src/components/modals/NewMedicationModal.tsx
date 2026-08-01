import { useState } from "react";
import { medicationService } from "@/services/medicationService";
import { X, Pill, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY_FORM = {
  name: "",
  activeIngredient: "",
  presentation: "Tableta",
  concentration: "",
  currentStock: 0,
  minimumStock: 10,
  unitPrice: 0,
  expiryDate: "",
  supplier: "",
};

export default function NewMedicationModal({ onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.activeIngredient || !form.presentation) {
      setError("Nombre, principio activo y presentación son requeridos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await medicationService.create({
        ...form,
        concentration: form.concentration || null,
        expiryDate: form.expiryDate || null,
        supplier: form.supplier || null,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Error al crear el medicamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pill className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Nuevo Medicamento</h2>
              <p className="text-xs text-text-light">Registrar medicamento en el inventario</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-light hover:text-text transition-colors duration-200 motion-reduce:transition-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Nombre *</label>
              <input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acetaminofén" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Principio Activo *</label>
              <input className="form-input" value={form.activeIngredient} onChange={(e) => set("activeIngredient", e.target.value)} placeholder="Paracetamol" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Presentación *</label>
              <select className="form-input" value={form.presentation} onChange={(e) => set("presentation", e.target.value)}>
                <option>Tableta</option>
                <option>Cápsula</option>
                <option>Jarabe</option>
                <option>Solución inyectable</option>
                <option>Crema / Ungüento</option>
                <option>Suspensión</option>
                <option>Gotas</option>
                <option>Inhalador</option>
                <option>Supositorio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Concentración</label>
              <input className="form-input" value={form.concentration} onChange={(e) => set("concentration", e.target.value)} placeholder="500 mg" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Stock Inicial</label>
              <input type="number" min={0} className="form-input" value={form.currentStock} onChange={(e) => set("currentStock", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Stock Mínimo</label>
              <input type="number" min={0} className="form-input" value={form.minimumStock} onChange={(e) => set("minimumStock", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Precio Unitario</label>
              <input type="number" min={0} className="form-input" value={form.unitPrice} onChange={(e) => set("unitPrice", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Fecha de Vencimiento</label>
              <input type="date" className="form-input" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Proveedor</label>
              <input className="form-input" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Distribuidora..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pill className="w-4 h-4" />}
              Registrar Medicamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
