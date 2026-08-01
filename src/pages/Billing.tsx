import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/types/billing";
import type { Invoice } from "@/types/billing";
import { Receipt, DollarSign, AlertCircle, Plus, Loader2 } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoiceService.getAll()
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Facturacion</h1>
          <p className="text-sm text-text-light mt-1">Gestion de facturas y pagos</p>
        </div>
        <Button className="gap-2" onClick={() => alert("Modulo de Facturacion en desarrollo")}><Plus className="w-4 h-4" /> Nueva Factura</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="w-6 h-6 text-success" /></div>
            <div><p className="text-sm text-text-light">Cobrado</p><p className="text-2xl font-bold text-text">{fmt(paid)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center"><Receipt className="w-6 h-6 text-warning" /></div>
            <div><p className="text-sm text-text-light">Pendiente</p><p className="text-2xl font-bold text-text">{fmt(pending)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center"><AlertCircle className="w-6 h-6 text-danger" /></div>
            <div><p className="text-sm text-text-light">Vencidas</p><p className="text-2xl font-bold text-text">{invoices.filter(i => i.status === "overdue").length}</p></div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-text-light">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Cargando facturas...
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Facturas Recientes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-dark/50">
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Factura</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Paciente</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Total</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Metodo</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-light">No hay facturas registradas</td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface-dark/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-primary font-medium">{inv.id}</td>
                        <td className="px-6 py-4 text-sm text-text">{inv.patientName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-text">{fmt(inv.total)}</td>
                        <td className="px-6 py-4 text-sm text-text-light">{PAYMENT_METHOD_LABELS[inv.paymentMethod]}</td>
                        <td className="px-6 py-4">
                          <Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "danger" : "warning"}>
                            {PAYMENT_STATUS_LABELS[inv.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
