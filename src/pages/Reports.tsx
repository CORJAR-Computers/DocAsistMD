import { useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { financialService } from "@/services/financialService";
import type { RevenueReport } from "@/services/financialService";
import { pickExportFolder } from "@/lib/exportDialog";
import { PAYMENT_METHOD_LABELS } from "@/types/billing";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  DollarSign,
  Receipt,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const todayStr = () => new Date().toISOString().slice(0, 10);

const monthStartStr = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

export default function Reports() {
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<"pdf" | "excel" | null>(null);
  const [exportResult, setExportResult] = useState<{ type: string; path: string } | null>(null);

  const loadReport = async () => {
    if (!startDate || !endDate) {
      setError("Seleccione las fechas de inicio y fin del periodo.");
      return;
    }
    if (startDate > endDate) {
      setError("La fecha de inicio no puede ser posterior a la de fin.");
      return;
    }
    setLoading(true);
    setError("");
    setExportResult(null);
    try {
      const rep = await financialService.getRevenueReport(startDate, endDate);
      setReport(rep);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  const exportFile = async (kind: "pdf" | "excel") => {
    let outDir: string | null = null;
    try {
      outDir = await pickExportFolder();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo abrir el selector de carpeta.");
      return;
    }
    if (!outDir) return; // usuario canceló el selector
    setGenerating(kind);
    setError("");
    setExportResult(null);
    try {
      const path =
        kind === "pdf"
          ? await financialService.generatePdf(startDate, endDate, outDir)
          : await financialService.generateExcel(startDate, endDate, outDir);
      setExportResult({ type: kind, path });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo generar el archivo.");
    } finally {
      setGenerating(null);
    }
  };

  const openFile = async () => {
    if (!exportResult) return;
    try {
      await openPath(exportResult.path);
    } catch (err) {
      console.error(err);
      setError("No se pudo abrir el archivo generado.");
    }
  };

  const methodLabel = (m: string | null) => {
    if (!m) return "—";
    const labels = PAYMENT_METHOD_LABELS as Record<string, string>;
    return labels[m] ?? m;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Reportes Financieros</h1>
          <p className="text-sm text-text-light mt-1">Ingresos por periodo y por medico</p>
        </div>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Desde</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light mb-1">Hasta</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button className="gap-2" onClick={loadReport} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {loading ? "Generando..." : "Generar Reporte"}
              </Button>
              {report && (
                <>
                  <Button variant="outline" className="gap-2" onClick={() => exportFile("pdf")} disabled={generating !== null}>
                    {generating === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-danger" />}
                    {generating === "pdf" ? "Generando..." : "PDF"}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => exportFile("excel")} disabled={generating !== null}>
                    {generating === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-success" />}
                    {generating === "excel" ? "Generando..." : "Excel"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {exportResult && (
            <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  Archivo {exportResult.type === "pdf" ? "PDF" : "Excel"} generado correctamente
                </p>
                <p className="text-xs text-emerald-600 truncate font-mono">{exportResult.path}</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-shrink-0" onClick={openFile}>
                <FileText className="w-3 h-3" /> Abrir
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="flex items-center justify-center gap-3 p-12 text-text-light">
          <Loader2 className="w-5 h-5 animate-spin" /> Calculando ingresos del periodo...
        </CardContent></Card>
      ) : !report ? (
        <Card><CardContent className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-light">Seleccione un periodo y presione "Generar Reporte"</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="w-6 h-6 text-success" /></div>
                <div>
                  <p className="text-sm text-text-light">Total Ingresos</p>
                  <p className="text-2xl font-bold text-text">{fmt(report.totalRevenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Receipt className="w-6 h-6 text-primary" /></div>
                <div>
                  <p className="text-sm text-text-light">Facturas Pagadas</p>
                  <p className="text-2xl font-bold text-text">{report.totalInvoices}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center"><Stethoscope className="w-6 h-6 text-secondary" /></div>
                <div>
                  <p className="text-sm text-text-light">Medicos con Ingresos</p>
                  <p className="text-2xl font-bold text-text">{report.byDoctor.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By doctor */}
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-base font-semibold text-text">Ingresos por Medico</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-dark/50">
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Medico</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Facturas</th>
                      <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.byDoctor.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-text-light">Sin ingresos en el periodo</td></tr>
                    ) : (
                      report.byDoctor.map((d) => (
                        <tr key={d.doctorName} className="hover:bg-surface-dark/30 transition-colors">
                          <td className="px-6 py-3.5 text-sm font-medium text-text">{d.doctorName}</td>
                          <td className="px-6 py-3.5 text-sm text-text-light">{d.invoiceCount}</td>
                          <td className="px-6 py-3.5 text-sm font-semibold text-text text-right">{fmt(d.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detail */}
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-semibold text-text">Detalle de Facturas</h3>
                <Badge variant="info">{report.rows.length} facturas</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-dark/50">
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Factura</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Paciente</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Medico</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Fecha</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Metodo</th>
                      <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.rows.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-text-light">No hay facturas pagadas en el periodo</td></tr>
                    ) : (
                      report.rows.map((r) => (
                        <tr key={r.invoiceId} className="hover:bg-surface-dark/30 transition-colors">
                          <td className="px-6 py-3 text-sm font-mono text-primary font-medium">
                            {r.invoiceId.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-6 py-3 text-sm text-text">{r.patientName}</td>
                          <td className="px-6 py-3 text-sm text-text-light">{r.doctorName || "—"}</td>
                          <td className="px-6 py-3 text-sm text-text-light">
                            {r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("es-CO") : "—"}
                          </td>
                          <td className="px-6 py-3 text-sm text-text-light">{methodLabel(r.paymentMethod)}</td>
                          <td className="px-6 py-3 text-sm font-semibold text-text text-right">{fmt(r.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Export hint */}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Download className="w-3.5 h-3.5" />
            Use los botones PDF o Excel para exportar el reporte del periodo actual.
          </div>
        </>
      )}
    </div>
  );
}
