import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiCall } from "@/services/api";
import { Pill, Plus, AlertTriangle } from "lucide-react";

interface Medication {
  id: string; name: string; activeIngredient: string; presentation: string;
  concentration: string; currentStock: number; minimumStock: number;
  unitPrice: number; expiryDate: string; supplier: string;
  createdAt: string; updatedAt: string;
}

const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

export default function Medications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<Medication[]>("get_medications")
      .then(setMedications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const lowStock = medications.filter(m => m.currentStock <= m.minimumStock);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Medicamentos</h1>
          <p className="text-sm text-text-light mt-1">{medications.length} medicamentos en inventario</p>
        </div>
        <Button className="gap-2" onClick={() => alert("Módulo en desarrollo")}>
          <Plus className="w-4 h-4" /> Nuevo Medicamento
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">{lowStock.length} medicamento(s) con stock bajo</p>
                <p className="text-xs text-amber-600">{lowStock.map(m => m.name).join(", ")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="p-12 text-center text-text-light">Cargando medicamentos...</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-dark/50">
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Medicamento</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Presentación</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Stock</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Precio</th>
                    <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Proveedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {medications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-light">No hay medicamentos registrados</td>
                    </tr>
                  ) : (
                    medications.map((med) => (
                      <tr key={med.id} className="hover:bg-surface-dark/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Pill className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text">{med.name}</p>
                              <p className="text-xs text-text-light">{med.activeIngredient}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-text">{med.presentation}</td>
                        <td className="px-6 py-4">
                          <Badge variant={med.currentStock <= med.minimumStock ? "danger" : "success"}>
                            {med.currentStock} / {med.minimumStock}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-text">{fmt(med.unitPrice)}</td>
                        <td className="px-6 py-4 text-sm text-text-light">{med.supplier || "-"}</td>
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
