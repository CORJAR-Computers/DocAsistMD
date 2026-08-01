import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiCall } from "@/services/api";
import { ClipboardList, Plus } from "lucide-react";
import NewConsultationModal from "@/components/modals/NewConsultationModal";

interface Consultation {
  id: string; appointmentId: string; patientId: string; doctorId: string;
  vitalSigns: string; symptoms: string; diagnosis: string; cie10Code: string;
  treatmentPlan: string; clinicalNotes: string; createdAt: string; updatedAt: string;
}

export default function Consultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    apiCall<Consultation[]>("get_consultations")
      .then(setConsultations)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Historia Clínica</h1>
          <p className="text-sm text-text-light mt-1">{consultations.length} consultas registradas</p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nueva Consulta
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-12 text-center text-text-light">Cargando consultas...</CardContent></Card>
      ) : consultations.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <ClipboardList className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-light">No hay consultas registradas</p>
          <p className="text-sm text-text-muted mt-1">Las consultas aparecerán cuando se completen citas</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {consultations.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {c.diagnosis || "Sin diagnóstico"} {c.cie10Code && <span className="text-text-muted">({c.cie10Code})</span>}
                      </p>
                      <p className="text-xs text-text-light">
                        {new Date(c.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="info">CIE-10</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {c.symptoms && <div><p className="font-medium text-text-light mb-1">Síntomas</p><p className="text-text">{c.symptoms}</p></div>}
                  {c.vitalSigns && <div><p className="font-medium text-text-light mb-1">Signos Vitales</p><p className="text-text">{c.vitalSigns}</p></div>}
                  {c.treatmentPlan && <div className="md:col-span-2"><p className="font-medium text-text-light mb-1">Plan de Tratamiento</p><p className="text-text">{c.treatmentPlan}</p></div>}
                  {c.clinicalNotes && <div className="md:col-span-2"><p className="font-medium text-text-light mb-1">Notas Clínicas</p><p className="text-text">{c.clinicalNotes}</p></div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {showModal && (
        <NewConsultationModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
