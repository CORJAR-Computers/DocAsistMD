import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientStore } from "@/stores/patientStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GENDER_LABELS, DOCUMENT_TYPE_LABELS } from "@/types/patient";
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
} from "lucide-react";

export default function Patients() {
  const navigate = useNavigate();
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    fetchPatients,
    deletePatient,
    getFilteredPatients,
  } = usePatientStore();
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filtered = getFilteredPatients();
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar al paciente ${name}?`)) {
      await deletePatient(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Gestion de Pacientes</h1>
          <p className="text-sm text-text-light mt-1">
            {filtered.length} paciente{filtered.length !== 1 ? "s" : ""} registrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => navigate("/patients/new")} className="gap-2">
          <UserPlus className="w-4 h-4" /> Nuevo Paciente
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por nombre, documento, telefono o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-white text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-text-light">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Cargando pacientes...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-dark/50">
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Paciente</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Documento</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Contacto</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Seguro</th>
                      <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Alergias</th>
                      <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider px-6 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-light">
                          No hay pacientes registrados
                        </td>
                      </tr>
                    ) : (
                      paged.map((patient) => (
                        <tr key={patient.id} className="hover:bg-surface-dark/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-text">{patient.firstName} {patient.lastName}</p>
                                <p className="text-xs text-text-light">{GENDER_LABELS[patient.gender]} - {patient.bloodType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-text">{DOCUMENT_TYPE_LABELS[patient.documentType]}</p>
                            <p className="text-xs text-text-light font-mono">{patient.documentId}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-text-light">
                              <Phone className="w-3 h-3" /> {patient.phone}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-text-light mt-1">
                              <Mail className="w-3 h-3" /> {patient.email}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-text">{patient.insuranceProvider}</p>
                            <p className="text-xs text-text-light font-mono">{patient.insurancePolicyNumber}</p>
                          </td>
                          <td className="px-6 py-4">
                            {patient.allergies && patient.allergies !== "Ninguna conocida" ? (
                              <Badge variant="danger">{patient.allergies}</Badge>
                            ) : (
                              <Badge variant="secondary">Sin alergias</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => navigate(`/patients/edit/${patient.id}`)}>
                                <Edit2 className="w-4 h-4 text-text-light" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Eliminar" onClick={() => handleDelete(patient.id, `${patient.firstName} ${patient.lastName}`)}>
                                <Trash2 className="w-4 h-4 text-danger" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filtered.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between px-6 py-3">
                    <p className="text-sm text-text-light">
                      Mostrando {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
