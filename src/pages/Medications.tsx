import { useState, useEffect, useMemo } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { medicationService } from "@/services/medicationService";
import { useAuthStore } from "@/stores/authStore";
import { pickExportFolder } from "@/lib/exportDialog";
import type { Medication, InventoryMovement, MovementType } from "@/types/medication";
import { Pill, Plus, AlertTriangle, Loader2, ArrowDownToLine, ArrowUpFromLine, History, Package, CalendarClock, X, Undo2, Eye, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import NewMedicationModal from "@/components/modals/NewMedicationModal";
import StockMovementModal from "@/components/modals/StockMovementModal";
import MovementDetailModal from "@/components/modals/MovementDetailModal";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
};

// Compensating "in" movements registered automatically when a dispense is
// undone (reason "Reversión de dispensación") — classified by the backend as
// origin "reversion" with an exact-match CASE, so the badge always agrees
// with the origin filter.
const isReversalMovement = (mv: InventoryMovement) => mv.origin === "reversion";

const EXPIRY_DAYS = 90;

type Tab = "inventory" | "movements";

export default function Medications() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lowStock, setLowStock] = useState<Medication[]>([]);
  const [expiring, setExpiring] = useState<Medication[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementFilter, setMovementFilter] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<"" | MovementType>("");
  const [originFilter, setOriginFilter] = useState<"" | "receta" | "manual" | "reversion">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [movementFor, setMovementFor] = useState<{ medication: Medication; type: MovementType } | null>(null);
  const [detailMovementId, setDetailMovementId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "excel" | null>(null);
  const [exportResult, setExportResult] = useState<{ format: "csv" | "excel"; path: string } | null>(null);
  const [exportError, setExportError] = useState("");

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

  const loadMovements = () => {
    setLoadingMovements(true);
    medicationService
      .getMovements({
        medicationId: movementFilter || undefined,
        movementType: movementTypeFilter || undefined,
        origin: originFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then(setMovements)
      .catch(console.error)
      .finally(() => setLoadingMovements(false));
  };

  const hasMovementFilters = !!(movementFilter || movementTypeFilter || originFilter || dateFrom || dateTo);

  const clearMovementFilters = () => {
    setMovementFilter("");
    setMovementTypeFilter("");
    setOriginFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const exportMovements = async (format: "csv" | "excel") => {
    let outDir: string | null = null;
    try {
      outDir = await pickExportFolder();
    } catch (err: any) {
      console.error(err);
      setExportError(err?.message || "No se pudo abrir el selector de carpeta.");
      return;
    }
    if (!outDir) return; // usuario canceló el selector
    setExporting(format);
    setExportError("");
    setExportResult(null);
    try {
      const path = await medicationService.exportMovements(
        format,
        {
          medicationId: movementFilter || undefined,
          movementType: movementTypeFilter || undefined,
          origin: originFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        outDir
      );
      setExportResult({ format, path });
    } catch (err: any) {
      console.error(err);
      setExportError(err?.message || "No se pudo exportar los movimientos.");
    } finally {
      setExporting(null);
    }
  };

  const openExport = async () => {
    if (!exportResult) return;
    try {
      await openPath(exportResult.path);
    } catch (err) {
      console.error(err);
      setExportError("No se pudo abrir el archivo generado.");
    }
  };

  const undoDispense = async (mv: InventoryMovement) => {
    if (!window.confirm(`¿Deshacer la dispensación de ${mv.quantity} unidad(es) de "${mv.medicationName}"? Se restablecerá el stock, se registrará una entrada de reversión y el movimiento quedará marcado como reversado (la receta se conserva).`)) {
      return;
    }
    setUndoingId(mv.id);
    try {
      await medicationService.undoDispense(mv.id, useAuthStore.getState().user?.id);
      loadMovements();
      loadMedications();
      loadLowStock();
      loadExpiring();
    } catch (err) {
      console.error(err);
      alert("No se pudo deshacer la dispensación.");
    } finally {
      setUndoingId(null);
    }
  };

  useEffect(() => {
    loadMedications();
    loadLowStock();
    loadExpiring();
  }, []);

  useEffect(() => {
    if (tab === "movements") loadMovements();
  }, [tab, movementFilter, movementTypeFilter, originFilter, dateFrom, dateTo]);

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
          {!hasMovementFilters && movements.length > 0 && <Badge variant="secondary" className="ml-1">{movements.length}</Badge>}
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

      {/* Movements export banner */}
      {tab === "movements" && exportError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {exportError}
        </div>
      )}
      {tab === "movements" && exportResult && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Archivo {exportResult.format === "excel" ? "Excel" : "CSV"} generado correctamente</p>
            <p className="text-xs text-emerald-600 truncate font-mono">{exportResult.path}</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-shrink-0" onClick={openExport}>
            <FileText className="w-3 h-3" /> Abrir
          </Button>
        </div>
      )}

      {/* Movements tab */}
      {tab === "movements" && (
        <Card>
          <CardContent className="p-0">
            {/* Combined filters: medication + type + origin + date range (backend supports all) */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 border-b border-border">
              <div className="flex flex-wrap items-center gap-2">
                <History className="w-4 h-4 text-text-light" />
                <select className="form-input max-w-[200px]" value={movementFilter} onChange={(e) => setMovementFilter(e.target.value)} title="Filtrar por medicamento">
                  <option value="">Todos los medicamentos</option>
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <select className="form-input max-w-[150px]" value={movementTypeFilter} onChange={(e) => setMovementTypeFilter(e.target.value as "" | MovementType)} title="Filtrar por tipo">
                  <option value="">Entradas y salidas</option>
                  <option value="in">Solo entradas</option>
                  <option value="out">Solo salidas</option>
                </select>
                <select className="form-input max-w-[170px]" value={originFilter} onChange={(e) => setOriginFilter(e.target.value as "" | "receta" | "manual" | "reversion")} title="Filtrar por origen">
                  <option value="">Todos los orígenes</option>
                  <option value="receta">Dispensación</option>
                  <option value="manual">Manual</option>
                  <option value="reversion">Reversión</option>
                </select>
                <input
                  type="date"
                  className="form-input max-w-[150px]"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title="Desde"
                />
                <span className="text-text-muted text-xs">a</span>
                <input
                  type="date"
                  className="form-input max-w-[150px]"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title="Hasta"
                />
                {hasMovementFilters && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearMovementFilters}>
                    <X className="w-3 h-3" /> Limpiar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{movements.length} movimiento(s)</Badge>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportMovements("csv")} disabled={exporting !== null} title="Exportar a CSV">
                  {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-primary" />}
                  CSV
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportMovements("excel")} disabled={exporting !== null} title="Exportar a Excel">
                  {exporting === "excel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-success" />}
                  Excel
                </Button>
              </div>
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
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Origen</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Cantidad</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Motivo</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Referencia</th>
                      <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-text-light">
                          No hay movimientos registrados. Use "Entrada" o "Salida" en un medicamento.
                        </td>
                      </tr>
                    ) : (
                      movements.map((mv) => (
                        <tr key={mv.id} className={cn("hover:bg-surface-dark/30 transition-colors", mv.reversedAt && "opacity-60")}>
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
                            {isReversalMovement(mv) ? (
                              <Badge variant="warning" title="Entrada compensatoria registrada automáticamente al deshacer una dispensación · stock restablecido">
                                Reversión
                              </Badge>
                            ) : mv.reversedAt ? (
                              <Badge variant="secondary" title={`Revertido el ${new Date(mv.reversedAt).toLocaleString("es-CO")} · stock restablecido y entrada de reversión registrada`}>
                                Reversado
                              </Badge>
                            ) : (
                              <Badge variant={mv.origin === "receta" ? "info" : "secondary"} title={mv.origin === "receta" ? "Salida automática al dispensar en una receta" : "Registrado manualmente en inventario"}>
                                {mv.origin === "receta" ? "Dispensación" : "Manual"}
                              </Badge>
                            )}
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
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-text-light hover:text-text"
                                onClick={() => setDetailMovementId(mv.id)}
                                title="Ver detalle del movimiento y su reversión asociada"
                              >
                                <Eye className="w-3.5 h-3.5" /> Detalle
                              </Button>
                              {mv.origin === "receta" && !mv.reversedAt && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs text-warning border-warning/30 hover:bg-warning/10"
                                  onClick={() => undoDispense(mv)}
                                  disabled={undoingId === mv.id}
                                  title="Deshacer dispensación: reabastece el stock, registra una entrada de reversión y marca el movimiento como reversado"
                                >
                                  {undoingId === mv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                                  Deshacer
                                </Button>
                              )}
                            </div>
                          </td>
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
          onSaved={() => { setMovementFor(null); loadMedications(); loadLowStock(); loadExpiring(); loadMovements(); }}
        />
      )}
      {detailMovementId && (
        <MovementDetailModal
          movementId={detailMovementId}
          onClose={() => setDetailMovementId(null)}
        />
      )}
    </div>
  );
}
