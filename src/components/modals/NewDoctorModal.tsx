import { useState } from "react";
import { apiCall } from "@/services/api";
import { X, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateDoctorInput {
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  phone: string;
  email: string;
  scheduleStart: string;
  scheduleEnd: string;
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewDoctorModal({ onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CreateDoctorInput>({
    firstName: "",
    lastName: "",
    specialty: "",
    licenseNumber: "",
    phone: "",
    email: "",
    scheduleStart: "08:00",
    scheduleEnd: "17:00",
  });

  const set = (field: keyof CreateDoctorInput, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.specialty || !form.licenseNumber || !form.phone) {
      setError("Los campos marcados con * son requeridos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiCall("create_doctor", { input: form });
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Error al crear el médico.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Nuevo Médico</h2>
              <p className="text-xs text-text-light">Registra un médico en el sistema</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-dark flex items-center justify-center text-text-light hover:text-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Nombre *</label>
              <input className="form-input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Carlos" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Apellido *</label>
              <input className="form-input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Mendez" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Especialidad *</label>
            <select className="form-input" value={form.specialty} onChange={(e) => set("specialty", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option>Medicina General</option>
              <option>Pediatría</option>
              <option>Cardiología</option>
              <option>Dermatología</option>
              <option>Ginecología</option>
              <option>Neurología</option>
              <option>Ortopedia</option>
              <option>Oftalmología</option>
              <option>Psiquiatría</option>
              <option>Endocrinología</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Número de Licencia / Tarjeta Profesional *</label>
            <input className="form-input font-mono" value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} placeholder="MED-12345" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Teléfono *</label>
              <input className="form-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+57 300 123 4567" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="medico@consultorio.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Inicio Turno</label>
              <input type="time" className="form-input" value={form.scheduleStart} onChange={(e) => set("scheduleStart", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Fin Turno</label>
              <input type="time" className="form-input" value={form.scheduleEnd} onChange={(e) => set("scheduleEnd", e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Registrar Médico
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
