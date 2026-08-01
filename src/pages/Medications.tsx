import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { medicationService } from "@/services/medicationService";
import type { Medication, InventoryMovement, MovementType } from "@/types/medication";
import { Pill, Plus, AlertTriangle, Loader2, ArrowDownToLine, ArrowUpFromLine, History, Package, CalendarClock } from "lucide-react";
import NewMedicationModal from "@/components/modals/NewMedicationModal";
import StockMovementModal from "@/components/modals/StockMovementModal";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
};

const EXPIRY_DAYS = 90;

type Tab = "inventory" | "movements";

export default function Medications() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lowStock, setLowStock] = useState<Medication[]>([]);
  const [expiring, setExpiring] = useState<Medication[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementFilter, setMovementFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [movementFor, setMovementFor] = useState<{ medication: Medication; type: MovementType } | null>(null);

  const loadMedications = () => {
    setLoading(true);
    medicationService
      .getAll()
      .then(setMedications)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Low stock comes from the backend command get_low_stock_medications (authoritative)
  const loadLowStock = () => {
    medicationService
      .getLowStock()
      .then(setLowStock)
      .catch(console.error);
  };

  // Expiring/expired medications come from the backend command get_expiring_medications
  const loadExpiring = () => {
    medicationService
      .getExpiring(EXPIRY_DAYS)
      .then(setExpiring)
      .catch(console.error);
  };

  const loadMovements = (medicationId?: string) => {
    setLoadingMovements(true);
    medicationService
      .getMovements(medicationId)
      .then(setMovements)
      .catch(console.error)
      .finally(() => setLoadingMovements(false));
  };

  useEffect(() => {
    loadMedications();
    loadLowStock();
    loadExpiring();
  }, []);

  useEffect(() => {
    if (tab === "movements") loadMovements(movementFilter || undefined);
  }, [tab, movementFilter]);

  // Sort low-stock items by urgency (most critical first)
  const lowStockSorted = useMemo(
    () => lowStock.slice().sort((a, b) => a.currentStock - b.currentStock),
    [lowStock]
  );

  const expired = useMemo(() => expiring.filter((m) => new Date(m.expiryDate!) < new Date()), [expiring]);

  const stockState = (m: Medication): "ok" | "low" | "out" => {
    if (m.currentStock <= 0) return "out";
    if (m.currentStock <= m.minimumStock) return "low";
    return "ok";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Inventario</h1>
          <p className="text-sm text-text-light mt-1">
            {medications.length} medicamentos · {lowStock.length} con stock bajo · {Math.max(expiring.length - expired.length, 0)} por vencer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" /> Nuevo Medicamento
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab("inventory")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "inventory"
              ? "border-primary text-primary"
              : "border-transparent text-text-light hover:text-text"
          )}
        >
          <Package className="w-4 h-4" /> Inventario
        </button>
        <button
          onClick={() => setTab("movements")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "movements"
              ? "border-primary text-primary"
              : "border-transparent text-text-light hover:text-text"
          )}
        >
          <History className="w-4 h-4" /> Movimientos
          {!movementFilter && movements.length > 0 && <Badge variant="secondary" className="ml-1">{movements.length}</Badge>}
        </button>
      </div>

      {/* Low stock alert (backend getLowStock) with quick restock */}
      {tab === "inventory" && lowStock.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {lowStock.length} medicamento(s) con stock bajo o agotado
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockSorted.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg bg-white border border-warning/30"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text truncate max-w-[160px]">{m.name}</p>
                        <p className="text-[10px] text-text-light">
                          Stock:{" "}
                          <span className={cn("font-semibold", m.currentStock <= 0 ? "text-red-600" : "text-amber-700")}>
                            {m.currentStock}
                          </span>{" "}
                          / mín. {m.minimumStock}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-700 border-success/30 hover:bg-success/10"
                        onClick={() => setMovementFor({ medication: m, type: "in" })}
                        title={`Registrar entrada de ${m.name}`}
                      >
                        <ArrowDownToLine className="w-3 h-3" /> Entrada
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiry alerts */}
      {tab === "inventory" && expiring.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {expired.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{expired.length} medicamento(s) VENCIDOS</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {expired.map((m) => `${m.name} (${fmtDate(m.expiryDate)})`).join(", ")}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Registre una salida por "Vencimiento" para retirarlos del stock activo.
                  </p>
                </div>
              </div>
            )}
            {expiring.filter((m) => new Date(m.expiryDate!) >= new Date()).length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <CalendarClock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    {expiring.length - expired.length} medicamento(s) por vencer en {EXPIRY_DAYS} días
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {expiring
                      .filter((m) => new Date(m.expiryDate!) >= new Date())
                      .map((m) => `${m.name} (${fmtDate(m.expiryDate)})`)
                      .join(", ")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inventory tab */}
      {tab === "inventory" && (
        loading ? (
          <Card><CardContent className="flex items-center justify-center gap-3 p-12 text-text-light">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando inventario...
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-dark/50">
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Medicamento</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Stock</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Vencimiento</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Precio</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Proveedor</th>
                      <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Movimientos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {medications.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-light">No hay medicamentos registrados</td>
                      </tr>
                    ) : (
                      medications.map((med) => {
                        const state = stockState(med);
                        const isExpiring = med.expiryDate && new Date(med.expiryDate) <= new Date(Date.now() + EXPIRY_DAYS * 86400000);
                        return (
                          <tr key={med.id} className="hover:bg-surface-dark/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Pill className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-text">{med.name}</p>
                                  <p className="text-xs text-text-light">{med.activeIngredient} · {med.presentation}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Badge variant={state === "out" ? "danger" : state === "low" ? "warning" : "success"}>
                                  {med.currentStock} / {med.minimumStock}
                                </Badge>
                                {state === "low" && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {med.expiryDate ? (
                                <Badge variant={isExpiring ? "warning" : "default"}>
                                  {fmtDate(med.expiryDate)}
                                </Badge>
                              ) : (
                                <span className="text-sm text-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-text">{fmt(med.unitPrice)}</td>
                            <td className="px-6 py-4 text-sm text-text-light">{med.supplier || "—"}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-700 border-success/30 hover:bg-success/10"
                                  onClick={() => setMovementFor({ medication: med, type: "in" })}
                                  title="Registrar entrada"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" /> Entrada
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-700 border-danger/30 hover:bg-danger/10"
                                  onClick={() => setMovementFor({ medication: med, type: "out" })}
                                  title="Registrar salida"
                                >
                                  <ArrowUpFromLine className="w-3.5 h-3.5" /> Salida
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Movements tab */}
      {tab === "movements" && (
        <Card>
          <CardContent className="p-0">
            {/* Filter by medication (backend supports medication_id) */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-text-light" />
                <label className="text-xs font-medium text-text-light">Filtrar por medicamento:</label>
                <select className="form-input max-w-[240px]" value={movementFilter} onChange={(e) => setMovementFilter(e.target.value)}>
                  <option value="">Todos los medicamentos</option>
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <Badge variant="secondary">{movements.length} movimiento(s)</Badge>
            </div>
            {loadingMovements ? (
              <div className="flex items-center justify-center gap-3 p-12 text-text-light">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando movimientos...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-dark/50">
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Fecha</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Medicamento</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Tipo</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Cantidad</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Motivo</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-light">
                          No hay movimientos registrados. Use "Entrada" o "Salida" en un medicamento.
                        </td>
                      </tr>
                    ) : (
                      movements.map((mv) => (
                        <tr key={mv.id} className="hover:bg-surface-dark/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-text-light whitespace-nowrap">
                            {new Date(mv.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Pill className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <p className="text-sm font-medium text-text">{mv.medicationName}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={mv.movementType === "in" ? "success" : "danger"}>
                              {mv.movementType === "in" ? "Entrada" : "Salida"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-sm font-semibold",
                              mv.movementType === "in" ? "text-emerald-700" : "text-red-700"
                            )}>
                              {mv.movementType === "in" ? "+" : "−"}{mv.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-light">{mv.reason || "—"}</td>
                          <td className="px-6 py-4 text-sm text-text-muted">{mv.reference || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showCreateModal && (
        <NewMedicationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadMedications(); loadLowStock(); loadExpiring(); }}
        />
      )}
      {movementFor && (
        <StockMovementModal
          medication={movementFor.medication}
          initialType={movementFor.type}
          onClose={() => setMovementFor(null)}
          onSaved={() => { setMovementFor(null); loadMedications(); loadLowStock(); loadExpiring(); loadMovements(movementFilter || undefined); }}
        />
      )}
    </div>
  );
}
