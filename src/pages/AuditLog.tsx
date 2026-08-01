import { useState, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auditService } from "@/services/auditService";
import { authService } from "@/services/authService";
import { pickExportFolder } from "@/lib/exportDialog";
import { AUDIT_ACTION_LABELS, AUDIT_TABLE_LABELS } from "@/types/audit";
import type { AuditLogEntry } from "@/types/audit";
import type { User } from "@/types/auth";
import { ScrollText, Loader2, RefreshCw, ChevronDown, ChevronUp, UserX, X, FileSpreadsheet, FileText, FileDown, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [50, 100, 200];

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 12)}…` : id);

const tryParseJson = (s: string): string | null => {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return null;
  }
};

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tableFilter, setTableFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<"csv" | "excel" | "pdf" | null>(null);
  const [exportResult, setExportResult] = useState<{ format: "csv" | "excel" | "pdf"; path: string } | null>(null);
  const loadToken = useRef(0);

  const buildArgs = (offset: number) => ({
    tableName: tableFilter || undefined,
    userId: userFilter || undefined,
    action: actionFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: pageSize,
    offset,
  });

  const load = () => {
    const token = ++loadToken.current;
    setLoading(true);
    setError("");
    auditService
      .getAuditLog(buildArgs(0))
      .then((page) => {
        if (token !== loadToken.current) return;
        setEntries(page);
        setHasMore(page.length === pageSize);
      })
      .catch((err: any) => {
        if (token !== loadToken.current) return;
        setError(err?.message || "No se pudo cargar el log de auditoría.");
      })
      .finally(() => {
        if (token === loadToken.current) setLoading(false);
      });
  };

  const loadMore = () => {
    if (loadingMore) return;
    const token = loadToken.current;
    setLoadingMore(true);
    auditService
      .getAuditLog(buildArgs(entries.length))
      .then((page) => {
        if (token !== loadToken.current) return;
        setEntries((prev) => [...prev, ...page]);
        setHasMore(page.length === pageSize);
      })
      .catch((err: any) => {
        if (token !== loadToken.current) return;
        setError(err?.message || "No se pudieron cargar más eventos.");
      })
      // Solo hay una loadMore en vuelo a la vez (guard `if (loadingMore)`),
      // así que el finally resetea incondicionalmente para evitar que
      // loadingMore quede pegado en true si cambia el token por un filtro.
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    load();
  }, [tableFilter, userFilter, actionFilter, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    authService.getUsers().then(setUsers).catch(console.error);
  }, []);

  const hasFilters = !!(tableFilter || userFilter || actionFilter || dateFrom || dateTo);

  const clearFilters = () => {
    setTableFilter("");
    setUserFilter("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const exportFile = async (format: "csv" | "excel" | "pdf") => {
    let outDir: string | null = null;
    try {
      outDir = await pickExportFolder();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo abrir el selector de carpeta.");
      return;
    }
    if (!outDir) return; // usuario canceló el selector
    setExporting(format);
    setError("");
    setExportResult(null);
    try {
      const path = await auditService.exportLog(
        format,
        {
          tableName: tableFilter || undefined,
          userId: userFilter || undefined,
          action: actionFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        outDir
      );
      setExportResult({ format, path });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo exportar el log de auditoría.");
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
      setError("No se pudo abrir el archivo generado.");
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        (e.userName ?? "").toLowerCase().includes(q) ||
        (AUDIT_ACTION_LABELS[e.action] ?? e.action).toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.tableName.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const actionBadge = (action: string) => {
    const label = AUDIT_ACTION_LABELS[action] ?? action;
    // Inventario
    if (action === "dispensar_medicamento") return <Badge variant="info">{label}</Badge>;
    if (action === "reversar_dispensacion") return <Badge variant="warning">{label}</Badge>;
    if (action === "registrar_entrada") return <Badge variant="success">{label}</Badge>;
    if (action === "registrar_salida") return <Badge variant="danger">{label}</Badge>;
    // Pacientes / Citas / Facturas
    if (action.startsWith("crear_")) return <Badge variant="success">{label}</Badge>;
    if (action.startsWith("editar_")) return <Badge variant="info">{label}</Badge>;
    if (action.startsWith("eliminar_")) return <Badge variant="danger">{label}</Badge>;
    return <Badge variant="secondary">{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Log de Auditoría</h1>
          <p className="text-sm text-text-light mt-1">
            {entries.length} evento(s) cargados · pacientes, citas, facturas e inventario con usuario y fecha
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar usuario o acción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            className="form-input max-w-[90px]"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            title="Eventos por página"
          >
            {PAGE_SIZES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <Button variant="outline" size="icon" onClick={load} title="Refrescar" disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Export banner */}
      {exportResult && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Archivo {exportResult.format === "excel" ? "Excel" : exportResult.format === "pdf" ? "PDF" : "CSV"} generado correctamente</p>
            <p className="text-xs text-emerald-600 truncate font-mono">{exportResult.path}</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-shrink-0" onClick={openExport}>
            <FileText className="w-3 h-3" /> Abrir
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ScrollText className="w-4 h-4 text-text-light" />
            <select className="form-input max-w-[190px]" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} title="Filtrar por tabla">
              <option value="">Todas las tablas</option>
              {Object.entries(AUDIT_TABLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select className="form-input max-w-[200px]" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} title="Filtrar por usuario">
              <option value="">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
            <select className="form-input max-w-[190px]" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} title="Filtrar por acción">
              <option value="">Todas las acciones</option>
              {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
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
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                <X className="w-3 h-3" /> Limpiar
              </Button>
            )}
            <span className="ml-auto text-xs text-text-muted">{filtered.length} resultado(s)</span>
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportFile("csv")} disabled={exporting !== null} title="Exportar a CSV">
                {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-primary" />}
                CSV
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportFile("excel")} disabled={exporting !== null} title="Exportar a Excel">
                {exporting === "excel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-success" />}
                Excel
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportFile("pdf")} disabled={exporting !== null} title="Exportar a PDF">
                {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 text-danger" />}
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-text-light">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando auditoría...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 px-4 py-3 m-4 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <ScrollText className="w-12 h-12 text-text-muted mx-auto mb-3" />
              {entries.length === 0 ? (
                <>
                  <p className="text-text-light">No hay eventos de auditoría registrados</p>
                  <p className="text-xs text-text-muted mt-1">Las operaciones sobre pacientes, citas, facturas e inventario se registrarán aquí automáticamente</p>
                </>
              ) : (
                <>
                  <p className="text-text-light">Sin coincidencias en las páginas cargadas</p>
                  <p className="text-xs text-text-muted mt-1">
                    {hasMore
                      ? "Pulsa \"Cargar más\" para revisar eventos más antiguos o ajusta el buscador"
                      : "No hay más eventos para cargar; ajusta el buscador o los filtros"}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-dark/50">
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Fecha</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Usuario</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Acción</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Tabla</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Registro</th>
                    <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((e) => (
                    <AuditRow key={e.id} entry={e} expanded={expanded.has(e.id)} onToggle={() => toggleExpand(e.id)} badge={actionBadge(e.action)} shortId={shortId} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && hasMore && (
            <div className="flex items-center justify-center gap-3 p-4 border-t border-border">
              <Button variant="outline" size="sm" className="gap-2" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Cargar más
              </Button>
              <span className="text-xs text-text-muted">{entries.length} cargados</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditRow({
  entry: e,
  expanded,
  onToggle,
  badge,
  shortId,
}: {
  entry: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
  badge: ReactNode;
  shortId: (id: string) => string;
}) {
  const hasChanges = e.oldValues || e.newValues;
  return (
    <>
      <tr className="hover:bg-surface-dark/30 transition-colors">
        <td className="px-6 py-4 text-sm text-text-light whitespace-nowrap">{fmtDateTime(e.createdAt)}</td>
        <td className="px-6 py-4">
          {e.userName ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                {e.userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-text">{e.userName}</span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
              <UserX className="w-3.5 h-3.5" /> Sin usuario
            </span>
          )}
        </td>
        <td className="px-6 py-4">{badge}</td>
        <td className="px-6 py-4 text-sm text-text-light">{AUDIT_TABLE_LABELS[e.tableName] ?? e.tableName}</td>
        <td className="px-6 py-4 text-sm font-mono text-text-muted">{e.recordId ? shortId(e.recordId) : "—"}</td>
        <td className="px-6 py-4 text-right">
          {hasChanges ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-text-light hover:text-text" onClick={onToggle}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Ocultar" : "Ver"}
            </Button>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-dark/30">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {e.oldValues && (
                <div>
                  <p className="text-xs font-semibold text-text-light uppercase tracking-wide mb-1.5">Antes</p>
                  <pre className="text-xs text-text bg-white border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {tryParseJson(e.oldValues) ?? e.oldValues}
                  </pre>
                </div>
              )}
              {e.newValues && (
                <div>
                  <p className="text-xs font-semibold text-text-light uppercase tracking-wide mb-1.5">Después</p>
                  <pre className="text-xs text-text bg-white border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {tryParseJson(e.newValues) ?? e.newValues}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
