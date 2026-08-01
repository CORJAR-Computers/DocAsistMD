import { useState, useEffect } from "react";
import { medicationService } from "@/services/medicationService";
import type { InventoryMovement, MovementDetail } from "@/types/medication";
import { X, Loader2, RefreshCw, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  movementId: string;
  onClose: () => void;
}

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

const isReversal = (mv: InventoryMovement) => mv.origin === "reversion";

function MovementBadge({ mv }: { mv: InventoryMovement }) {
  if (isReversal(mv)) return <Badge variant="warning">Reversión</Badge>;
  if (mv.reversedAt) return <Badge variant="secondary">Reversado</Badge>;
  if (mv.origin === "receta") return <Badge variant="info">Dispensación</Badge>;
  return <Badge variant="secondary">Manual</Badge>;
}

function MovementFields({ mv }: { mv: InventoryMovement }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p className="text-xs text-text-light mb-0.5">Fecha</p>
        <p className="text-text font-medium">{fmtDateTime(mv.createdAt)}</p>
      </div>
      <div>
        <p className="text-xs text-text-light mb-0.5">Tipo</p>
        <Badge variant={mv.movementType === "in" ? "success" : "danger"}>
          {mv.movementType === "in" ? "Entrada" : "Salida"}
        </Badge>
      </div>
      <div>
        <p className="text-xs text-text-light mb-0.5">Cantidad</p>
        <p className={`font-semibold ${mv.movementType === "in" ? "text-success-text" : "text-danger-text"}`}>
          {mv.movementType === "in" ? "+" : "−"}{mv.quantity}
        </p>
      </div>
      <div>
        <p className="text-xs text-text-light mb-0.5">Origen</p>
        <MovementBadge mv={mv} />
      </div>
      <div>
        <p className="text-xs text-text-light mb-0.5">Motivo</p>
        <p className="text-text">{mv.reason || "—"}</p>
      </div>
      <div>
        <p className="text-xs text-text-light mb-0.5">Referencia</p>
        <p className="text-text font-mono text-xs break-all">{mv.reference || "—"}</p>
      </div>
      {mv.reversedAt && (
        <div className="sm:col-span-2">
          <p className="text-xs text-text-light mb-0.5">Reversado el</p>
          <p className="text-text">{fmtDateTime(mv.reversedAt)}</p>
        </div>
      )}
    </div>
  );
}

export default function MovementDetailModal({ movementId, onClose }: Props) {
  const [detail, setDetail] = useState<MovementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    medicationService
      .getMovementDetail(movementId)
      .then(setDetail)
      .catch((err: any) => setError(err?.message || "No se pudo cargar el detalle del movimiento."))
      .finally(() => setLoading(false));
  }, [movementId]);

  const mv = detail?.movement;
  const pair = detail?.reversalPair ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Detalle de Movimiento</h2>
              <p className="text-xs text-text-light">{mv?.medicationName ?? "..."}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-text-light hover:text-text transition-colors duration-200 motion-reduce:transition-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10 text-text-light">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando detalle...
            </div>
          ) : error ? (
            <div className="px-4 py-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
          ) : mv ? (
            <>
              {/* Main movement */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-text-light uppercase tracking-wide mb-3">
                  Movimiento
                </p>
                <MovementFields mv={mv} />
              </div>

              {/* Reversal pair */}
              <div className={`rounded-xl border p-4 ${pair ? "border-warning/30 bg-warning/5" : "border-border"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className={`w-4 h-4 ${pair ? "text-warning" : "text-text-muted"}`} />
                  <p className="text-xs font-semibold text-text-light uppercase tracking-wide">
                    Pareja de reversión
                  </p>
                </div>
                {pair ? (
                  <MovementFields mv={pair} />
                ) : (
                  <p className="text-sm text-text-muted">Este movimiento no tiene una reversión asociada.</p>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}
