import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { consultationService } from "@/services/consultationService";
import type { Consultation } from "@/services/consultationService";
import { patientService } from "@/services/patientService";
import type { Patient } from "@/types/patient";
import { ClipboardList, Plus, Search, User } from "lucide-react";
import NewConsultationModal from "@/components/modals/NewConsultationModal";
import PrescriptionPdfButton from "@/components/PrescriptionPdfButton";

export default function Consultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([consultationService.getAll(), patientService.getAll()])
      .then(([consults, pats]) => {
        setConsultations(consults);
        setPatients(pats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const patientMap = new Map(patients.map(p => [p.id, p]));

  const filteredConsultations = consultations.filter((c) => {
    const matchesPatient = selectedPatientId === "all" || c.patientId === selectedPatientId;
    const patient = patientMap.get(c.patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : "";
    const patientDoc = patient ? patient.documentId : "";
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      (c.diagnosis && c.diagnosis.toLowerCase().includes(query)) ||
      (c.cie10Code && c.cie10Code.toLowerCase().includes(query)) ||
      (c.symptoms && c.symptoms.toLowerCase().includes(query)) ||
      patientName.includes(query) ||
      patientDoc.includes(query);

    return matchesPatient && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Historia Clínica</h1>
          <p className="text-sm text-text-light mt-1">
            {filteredConsultations.length} de {consultations.length} consultas registradas
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nueva Consulta
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por diagnóstico, código CIE-10, síntomas o paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-white text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="all">Todos los Pacientes</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.documentId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-12 text-center text-text-light">Cargando consultas...</CardContent></Card>
      ) : filteredConsultations.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <ClipboardList className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-light">No hay consultas registradas que coincidan con la búsqueda</p>
          <p className="text-sm text-text-muted mt-1">Las consultas aparecerán cuando se completen citas o se filtren correctamente</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredConsultations.map((c) => {
            const patient = patientMap.get(c.patientId);
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text">
                            {c.diagnosis || "Sin diagnóstico"}
                          </p>
                          {c.cie10Code && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary">
                              {c.cie10Code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-light mt-0.5">
                          {patient && (
                            <span className="flex items-center gap-1 font-medium text-text">
                              <User className="w-3 h-3 text-primary" />
                              {patient.firstName} {patient.lastName} ({patient.documentId})
                            </span>
                          )}
                          <span>
                            {new Date(c.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <PrescriptionPdfButton consultationId={c.id} compact />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-border/50">
                    {c.symptoms && <div><p className="font-medium text-text-light mb-1 text-xs">Síntomas</p><p className="text-text">{c.symptoms}</p></div>}
                    {c.vitalSigns && <div><p className="font-medium text-text-light mb-1 text-xs">Signos Vitales</p><p className="text-text">{c.vitalSigns}</p></div>}
                    {c.treatmentPlan && <div className="md:col-span-2"><p className="font-medium text-text-light mb-1 text-xs">Plan de Tratamiento</p><p className="text-text">{c.treatmentPlan}</p></div>}
                    {c.clinicalNotes && <div className="md:col-span-2"><p className="font-medium text-text-light mb-1 text-xs">Notas Clínicas</p><p className="text-text text-sm italic">{c.clinicalNotes}</p></div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

