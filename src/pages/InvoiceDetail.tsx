import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { openPath } from "@tauri-apps/plugin-opener";
import { invoiceService } from "@/services/invoiceService";
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/types/billing";
import type { InvoiceDetail } from "@/types/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Printer,
  Download,
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle2,
  X,
  FileText,
  User,
  Stethoscope,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
  cancelled: "secondary",
};

const STATUS_DOT: Record<string, string> = {
  paid: "bg-success",
  pending: "bg-warning",
  overdue: "bg-danger",
  cancelled: "bg-gray-400",
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [pdfPath, setPdfPath] = useState("");

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError("");
    invoiceService
      .getDetail(id)
      .then(setInvoice)
      .catch((err) => { console.error(err); setError("Error al cargar la factura."); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const downloadPdf = async () => {
    if (!id) return;
    setGenerating(true);
    setError("");
    try {
      const path = await invoiceService.generatePdf(id);
      setPdfPath(path);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo generar el PDF. Verifique que existan fuentes del sistema.");
    } finally {
      setGenerating(false);
    }
  };

  const openPdf = async () => {
    if (!pdfPath) return;
    setOpening(true);
    try {
      await openPath(pdfPath);
    } catch (err) {
      console.error(err);
      setError("No se pudo abrir el PDF.");
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-text-light">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando factura...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
        <p className="text-text-light">Factura no encontrada</p>
        <Button className="mt-4" onClick={() => navigate("/billing")}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Toolbar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/billing")} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text">Detalle de Factura</h1>
            <p className="text-sm text-text-light">Comprobante {invoice.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button className="gap-2" onClick={downloadPdf} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generating ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="no-print flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {pdfPath && (
        <div className="no-print flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">PDF generado correctamente</p>
            <p className="text-xs text-emerald-600 truncate font-mono">{pdfPath}</p>
          </div>
          <Button
            variant="outline" size="sm" className="h-7 gap-1 text-xs flex-shrink-0"
            onClick={openPdf} disabled={opening}
          >
            {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Abrir
          </Button>
        </div>
      )}

      {/* Printable receipt */}
      <Card className="print-area">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">DocAsistMD</h2>
                <p className="text-xs text-text-light">Consultorio Medico</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-text">FACTURA</p>
              <p className="text-xs font-mono text-primary font-medium">{invoice.id.slice(0, 8).toUpperCase()}</p>
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[invoice.status] || "bg-gray-400"}`} />
                <Badge variant={STATUS_BADGE[invoice.status] || "secondary"}>
                  {PAYMENT_STATUS_LABELS[invoice.status]}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates / payment */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
            <div>
              <p className="text-xs text-text-light">Emision</p>
              <p className="text-sm font-medium text-text">
                {new Date(invoice.createdAt).toLocaleDateString("es-CO")}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-light">Vencimiento</p>
              <p className="text-sm font-medium text-text">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("es-CO") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-light">Metodo de pago</p>
              <p className="text-sm font-medium text-text">
                {invoice.paymentMethod ? PAYMENT_METHOD_LABELS[invoice.paymentMethod] : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-light">Pagada el</p>
              <p className="text-sm font-medium text-text">
                {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("es-CO") : "—"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Patient */}
          <div className="py-4">
            <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Datos del Paciente
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-text-light">Nombre</p>
                <p className="text-sm font-semibold text-text">{invoice.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-text-light">Documento</p>
                <p className="text-sm text-text font-mono">{invoice.patientDocument || "—"}</p>
              </div>
              {invoice.patientPhone && (
                <div>
                  <p className="text-xs text-text-light">Telefono</p>
                  <p className="text-sm text-text">{invoice.patientPhone}</p>
                </div>
              )}
              {invoice.patientEmail && (
                <div>
                  <p className="text-xs text-text-light">Email</p>
                  <p className="text-sm text-text">{invoice.patientEmail}</p>
                </div>
              )}
              {invoice.patientAddress && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-text-light">Direccion</p>
                  <p className="text-sm text-text">{invoice.patientAddress}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Appointment */}
          {invoice.doctorName && (
            <div className="py-4">
              <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Consulta
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-light">Medico</p>
                  <p className="text-sm text-text">Dr. {invoice.doctorName}</p>
                </div>
                <div>
                  <p className="text-xs text-text-light">Fecha de consulta</p>
                  <p className="text-sm text-text">
                    {invoice.appointmentDateTime
                      ? new Date(invoice.appointmentDateTime).toLocaleString("es-CO")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Amounts */}
          <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex justify-between text-sm text-text-light py-1">
              <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-text-light py-1">
              <span>IVA ({(invoice.taxRate * 100).toFixed(0)}%)</span><span>{fmt(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-base font-bold text-text border-t border-primary/10 pt-3 mt-1">
              <span>TOTAL</span>
              <span className="text-lg text-primary">{fmt(invoice.total)}</span>
            </div>
          </div>

          <p className="text-center text-xs text-text-muted mt-6">
            Este documento es un comprobante electronico generado por DocAsistMD.
          </p>
        </CardContent>
      </Card>

      {/* Extra actions hidden on print */}
      <div className="flex justify-center gap-2 no-print">
        <Button variant="ghost" className="gap-1.5" onClick={() => navigate("/billing")}>
          <X className="w-4 h-4" /> Volver a Facturacion
        </Button>
      </div>
    </div>
  );
}
