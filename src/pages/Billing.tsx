import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { invoiceService } from "@/services/invoiceService";
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/types/billing";
import type { Invoice, PaymentMethod } from "@/types/billing";
import { Receipt, DollarSign, AlertCircle, Plus, Loader2, Banknote, CreditCard, ArrowLeftRight, ShieldCheck, X, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NewInvoiceModal from "@/components/modals/NewInvoiceModal";

const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowLeftRight,
  insurance: ShieldCheck,
};

export default function Billing() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    invoiceService
      .getAll()
      .then(setInvoices)
      .catch((err) => { console.error(err); setError("Error al cargar las facturas."); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const registerPayment = async () => {
    if (!payingId) return;
    setSaving(true);
    try {
      await invoiceService.updateStatus(payingId, "paid", payMethod);
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === payingId
            ? { ...i, status: "paid", paymentMethod: payMethod, paidAt: new Date().toISOString() }
            : i
        )
      );
      setPayingId(null);
    } catch (err) {
      console.error(err);
      alert("No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  };

  const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const overdue = invoices.filter(i => i.status === "overdue").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Facturacion</h1>
          <p className="text-sm text-text-light mt-1">Gestion de facturas y pagos</p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nueva Factura</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="w-6 h-6 text-success" /></div>
            <div><p className="text-sm text-text-light">Cobrado</p><p className="text-2xl font-bold text-text">{loading ? "..." : fmt(paid)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center"><Receipt className="w-6 h-6 text-warning" /></div>
            <div><p className="text-sm text-text-light">Pendiente</p><p className="text-2xl font-bold text-text">{loading ? "..." : fmt(pending)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center"><AlertCircle className="w-6 h-6 text-danger" /></div>
            <div><p className="text-sm text-text-light">Vencidas</p><p className="text-2xl font-bold text-text">{loading ? "..." : overdue}</p></div>
          </CardContent>
        </Card>
      </div>

      {error && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Facturas Recientes</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-text-light">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando facturas...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-light">No hay facturas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-dark/50">
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Factura</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Paciente</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Total</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Metodo</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Estado</th>
                    <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => {
                    const MethodIcon = inv.paymentMethod ? METHOD_ICONS[inv.paymentMethod] : Receipt;
                    return (
                      <tr key={inv.id} className="hover:bg-surface-dark/30 transition-colors cursor-pointer" onClick={() => navigate(`/billing/${inv.id}`)}>
                        <td className="px-6 py-4 text-sm font-mono text-primary font-medium underline-offset-2 hover:underline">
                          {inv.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-sm text-text">{inv.patientName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-text">{fmt(inv.total)}</td>
                        <td className="px-6 py-4 text-sm text-text-light flex items-center gap-1.5">
                          <MethodIcon className="w-3.5 h-3.5" />
                          {inv.paymentMethod ? PAYMENT_METHOD_LABELS[inv.paymentMethod] : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "danger" : inv.status === "cancelled" ? "secondary" : "warning"}>
                            {PAYMENT_STATUS_LABELS[inv.status]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8" title="Ver detalle"
                              onClick={(e) => { e.stopPropagation(); navigate(`/billing/${inv.id}`); }}
                            >
                              <Eye className="w-4 h-4 text-text-light" />
                            </Button>
                            {(inv.status === "pending" || inv.status === "overdue") && (
                              <Button
                                size="sm" className="h-7 gap-1 text-xs"
                                onClick={(e) => { e.stopPropagation(); setPayingId(inv.id); setPayMethod("cash"); }}
                              >
                                <DollarSign className="w-3 h-3" /> Registrar Pago
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment modal */}
      {payingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-success/10 to-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text">Registrar Pago</h2>
                  <p className="text-xs text-text-light">Confirme el metodo de pago</p>
                </div>
              </div>
              <button onClick={() => setPayingId(null)} className="w-8 h-8 rounded-lg hover:bg-surface-dark flex items-center justify-center text-text-light hover:text-text transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {invoices.find((i) => i.id === payingId) && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm text-text-light">Monto a cobrar</p>
                  <p className="text-2xl font-bold text-primary">
                    {fmt(invoices.find((i) => i.id === payingId)!.total)}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-light mb-1">Metodo de Pago</label>
                <select className="form-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="insurance">Seguro Medico</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setPayingId(null)}>Cancelar</Button>
                <Button type="button" className="flex-1 gap-2" disabled={saving} onClick={registerPayment}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Confirmar Pago
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <NewInvoiceModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
