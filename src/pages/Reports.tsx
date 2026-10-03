import { useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { financialService } from "@/services/financialService";
import type { RevenueReport } from "@/services/financialService";
import { consultationService } from "@/services/consultationService";
import { patientService } from "@/services/patientService";
import { appointmentService } from "@/services/appointmentService";
import { invoiceService } from "@/services/invoiceService";
import { buildRipsPackage, downloadRipsJson, type RipsPackage } from "@/services/ripsService";
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
  FileCode,
  Copy,
  Check,
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
  const [activeTab, setActiveTab] = useState<"financial" | "rips">("financial");

  // Financial report state
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<"pdf" | "excel" | null>(null);
  const [exportResult, setExportResult] = useState<{ type: string; path: string } | null>(null);

  // RIPS state
  const [ripsStartDate, setRipsStartDate] = useState(monthStartStr());
  const [ripsEndDate, setRipsEndDate] = useState(todayStr());
  const [providerNit, setProviderNit] = useState("900123456-7");
  const [providerReps, setProviderReps] = useState("110010999901");
  const [fevNumber, setFevNumber] = useState("FEV-001");
  const [generatingRips, setGeneratingRips] = useState(false);
  const [ripsResult, setRipsResult] = useState<RipsPackage | null>(null);
  const [ripsCopied, setRipsCopied] = useState(false);
  const [ripsError, setRipsError] = useState("");

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
    if (!outDir) return;
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

  const generateRips = async () => {
    setGeneratingRips(true);
    setRipsError("");
    try {
      const [consults, pats, appts, invs] = await Promise.all([
        consultationService.getAll(),
        patientService.getAll(),
        appointmentService.getAll(),
        invoiceService.getAll(),
      ]);

      // Filter by date range
      const filteredConsults = consults.filter((c) => {
        const d = c.createdAt.slice(0, 10);
        return d >= ripsStartDate && d <= ripsEndDate;
      });

      if (filteredConsults.length === 0) {
        setRipsError("No se encontraron consultas registradas en el periodo seleccionado.");
        setRipsResult(null);
        return;
      }

      const pkg = buildRipsPackage({
        prestadorNitOrDocument: providerNit,
        prestadorCodigoReps: providerReps,
        facturaNumero: fevNumber,
        consultations: filteredConsults,
        patients: pats,
        appointments: appts,
        invoices: invs,
      });

      setRipsResult(pkg);
    } catch (err: any) {
      console.error(err);
      setRipsError(err?.message || "Error al compilar el RIPS JSON.");
    } finally {
      setGeneratingRips(false);
    }
  };

  const handleDownloadRips = () => {
    if (!ripsResult) return;
    downloadRipsJson(ripsResult, `RIPS_${providerNit}_${ripsStartDate}_${ripsEndDate}.json`);
  };

  const handleCopyRips = () => {
    if (!ripsResult) return;
    navigator.clipboard.writeText(JSON.stringify(ripsResult, null, 2));
    setRipsCopied(true);
    setTimeout(() => setRipsCopied(false), 2000);
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
          <h1 className="text-2xl font-bold text-text">Reportes y RIPS MinSalud</h1>
          <p className="text-sm text-text-light mt-1">
            Informes financieros y generación de RIPS JSON (Resolución 948 de 2026 de Colombia)
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("financial")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "financial"
              ? "bg-primary text-white shadow-sm"
              : "text-text-light hover:text-text hover:bg-surface-hover"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Reporte Financiero (PDF / Excel)
        </button>
        <button
          onClick={() => setActiveTab("rips")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "rips"
              ? "bg-primary text-white shadow-sm"
              : "text-text-light hover:text-text hover:bg-surface-hover"
          }`}
        >
          <FileCode className="w-4 h-4" /> RIPS JSON (MinSalud FEV)
        </button>
      </div>

      {activeTab === "financial" ? (
        <>
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
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {exportResult && (
                <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20 text-success-text text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      Archivo {exportResult.type === "pdf" ? "PDF" : "Excel"} generado correctamente
                    </p>
                    <p className="text-xs text-success-text truncate font-mono">{exportResult.path}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={openFile}>
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
                      <p className="text-2xl font-bold text-text tabular-nums">{fmt(report.totalRevenue)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Receipt className="w-6 h-6 text-primary" /></div>
                    <div>
                      <p className="text-sm text-text-light">Facturas Pagadas</p>
                      <p className="text-2xl font-bold text-text tabular-nums">{report.totalInvoices}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center"><Stethoscope className="w-6 h-6 text-secondary" /></div>
                    <div>
                      <p className="text-sm text-text-light">Médicos con Ingresos</p>
                      <p className="text-2xl font-bold text-text tabular-nums">{report.byDoctor.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* By Doctor Breakdown */}
              {report.byDoctor.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Ingresos por Médico</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-surface-dark/50">
                            <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Médico</th>
                            <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Facturas</th>
                            <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Total Generado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {report.byDoctor.map((d, idx) => (
                            <tr key={`${d.doctorName}-${idx}`} className="hover:bg-surface-dark/30 transition-colors">
                              <td className="px-6 py-3 text-sm font-medium text-text">{d.doctorName}</td>
                              <td className="px-6 py-3 text-sm text-text-light text-right tabular-nums">{d.invoiceCount}</td>
                              <td className="px-6 py-3 text-sm font-semibold text-text text-right tabular-nums">{fmt(d.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoices Table */}
              <Card>
                <CardHeader><CardTitle>Detalle de Facturas Pagadas</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-surface-dark/50">
                          <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Factura</th>
                          <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Paciente</th>
                          <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Médico</th>
                          <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Fecha</th>
                          <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Método</th>
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
                              <td className="px-6 py-3 text-sm font-semibold text-text text-right tabular-nums">{fmt(r.total)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      ) : (
        /* RIPS MinSalud Section */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" /> Generador RIPS JSON (Resolución 948 de 2026)
              </CardTitle>
              <p className="text-xs text-text-light">
                Genera el paquete RIPS en formato JSON estándar obligatorio como soporte de la Factura Electrónica de Venta (FEV) en salud para el MUV (Mecanismo Único de Validación) del Ministerio de Salud.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-light mb-1">NIT / Cédula del Prestador</label>
                  <input
                    type="text"
                    value={providerNit}
                    onChange={(e) => setProviderNit(e.target.value)}
                    className="form-input text-xs"
                    placeholder="900123456-7"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-light mb-1">Código REPS (Habilitación)</label>
                  <input
                    type="text"
                    value={providerReps}
                    onChange={(e) => setProviderReps(e.target.value)}
                    className="form-input text-xs"
                    placeholder="110010999901"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-light mb-1">Número Factura FEV</label>
                  <input
                    type="text"
                    value={fevNumber}
                    onChange={(e) => setFevNumber(e.target.value)}
                    className="form-input text-xs"
                    placeholder="FEV-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-light mb-1">Fecha Inicio Periodo</label>
                  <input
                    type="date"
                    value={ripsStartDate}
                    onChange={(e) => setRipsStartDate(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-light mb-1">Fecha Fin Periodo</label>
                  <input
                    type="date"
                    value={ripsEndDate}
                    onChange={(e) => setRipsEndDate(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={generateRips} disabled={generatingRips} className="gap-2">
                  {generatingRips ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {generatingRips ? "Compilando RIPS..." : "Compilar Paquete RIPS JSON"}
                </Button>
              </div>

              {ripsError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {ripsError}
                </div>
              )}
            </CardContent>
          </Card>

          {ripsResult && (
            <Card className="border-success/30">
              <CardHeader className="bg-success/5 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <CardTitle className="text-base">Paquete RIPS JSON Generado con Éxito</CardTitle>
                      <p className="text-xs text-text-light">
                        {ripsResult.usuarios.length} usuarios / pacientes incluidos para radicación ante MUV / MinSalud
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyRips} className="gap-1.5 text-xs">
                      {ripsCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      {ripsCopied ? "Copiado" : "Copiar JSON"}
                    </Button>
                    <Button size="sm" onClick={handleDownloadRips} className="gap-1.5 text-xs">
                      <Download className="w-3.5 h-3.5" /> Descargar Archivo JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-950 p-4 text-xs font-mono text-emerald-400">
                  <pre>{JSON.stringify(ripsResult, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
