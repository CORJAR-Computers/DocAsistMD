import { useState } from "react";
import { medicationService } from "@/services/medicationService";
import type { Medication, MovementType } from "@/types/medication";
import { X, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  medication: Medication;
  initialType?: MovementType;
  onClose: () => void;
  onSaved: () => void;
}

const REASONS_IN = [
  "Compra / Reposición",
  "Devolución",
  "Ajuste de inventario",
  "Transferencia",
  "Otro",
];

const REASONS_OUT = [
  "Dispensación a paciente",
  "Vencimiento",
  "Daño / Deterioro",
  "Ajuste de inventario",
  "Transferencia",
  "Merma",
  "Otro",
];

export default function StockMovementModal({ medication, initialType = "in", onClose, onSaved }: Props) {
  const [movementType, setMovementType] = useState<MovementType>(initialType);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isIn = movementType === "in";
  const reasons = isIn ? REASONS_IN : REASONS_OUT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    if (!reason) {
      setError("Seleccione un motivo para el movimiento.");
      return;
    }
    if (!isIn && quantity > medication.currentStock) {
      setError(`Stock insuficiente: disponible ${medication.currentStock}, solicitado ${quantity}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await medicationService.recordMovement({
        medicationId: medication.id,
        movementType,
        quantity,
        reason: reason || null,
        reference: reference || null,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Error al registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              {isIn ? (
                <ArrowDownToLine className="w-5 h-5 text-success" />
              ) : (
                <ArrowUpFromLine className="w-5 h-5 text-danger" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Movimiento de Inventario</h2>
              <p className="text-xs text-text-light">{medication.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-dark flex items-center justify-center text-text-light hover:text-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setMovementType("in"); setReason(""); }}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                isIn
                  ? "border-success bg-success/10 text-emerald-700 ring-2 ring-success/30"
                  : "border-border bg-white text-text-light hover:border-success/40"
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" /> Entrada
            </button>
            <button
              type="button"
              onClick={() => { setMovementType("out"); setReason(""); }}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                !isIn
                  ? "border-danger bg-danger/10 text-red-700 ring-2 ring-danger/30"
                  : "border-border bg-white text-text-light hover:border-danger/40"
              }`}
            >
              <ArrowUpFromLine className="w-4 h-4" /> Salida
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-dark/60 border border-border text-sm">
            <span className="text-text-light">Stock actual</span>
            <span className="font-semibold text-text">
              {medication.currentStock} <span className="text-xs font-normal text-text-light">(mín. {medication.minimumStock})</span>
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Cantidad *</label>
            <input
              type="number"
              min={1}
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              autoFocus
            />
            {!isIn && quantity > medication.currentStock && (
              <p className="mt-1 text-xs text-danger">Supera el stock disponible ({medication.currentStock}).</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Motivo *</label>
            <select className="form-input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Seleccione un motivo...</option>
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Referencia</label>
            <input
              className="form-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={isIn ? "Factura de compra N°..." : "N° de receta / orden..."}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              className={`flex-1 gap-2 ${isIn ? "bg-success text-white hover:bg-emerald-600" : "bg-danger text-white hover:bg-red-600"}`}
              disabled={saving || quantity <= 0}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isIn ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
              Registrar {isIn ? "Entrada" : "Salida"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
