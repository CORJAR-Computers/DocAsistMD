import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientStore } from "@/stores/patientStore";
import { patientService } from "@/services/patientService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GENDER_LABELS, DOCUMENT_TYPE_LABELS } from "@/types/patient";
import type { Patient } from "@/types/patient";
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
  ClipboardList,
  Loader2,
} from "lucide-react";

export default function Patients() {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = usePatientStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar los pacientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (patient: Patient) => {
    if (!window.confirm(`¿Eliminar al paciente ${patient.firstName} ${patient.lastName}?`)) return;
    setDeletingId(patient.id);
    try {
      await patientService.delete(patient.id, useAuthStore.getState().user?.id);
      setPatients((prev) => prev.filter((p) => p.id !== patient.id));
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el paciente. Verifique que no tenga citas o consultas asociadas.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.firstName || "").toLowerCase().includes(q) ||
      (p.lastName || "").toLowerCase().includes(q) ||
      (p.documentId || "").includes(q) ||
      (p.phone || "").includes(q) ||
      (p.email || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Gestion de Pacientes</h1>
          <p className="text-sm text-text-light mt-1">
            {loading ? "Cargando..." : `${filtered.length} paciente${filtered.length !== 1 ? "s" : ""} registrado${filtered.length !== 1 ? "s" : ""}`}
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
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-white text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setSearchQuery("")}>
              <Filter className="w-4 h-4" /> Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
      )}

      {/* Patient Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-text-light">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando pacientes...
            </div>
          ) : (
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
                        No se encontraron pacientes
                      </td>
                    </tr>
                  ) : paged.map((patient) => (
                    <tr key={patient.id} className="hover:bg-surface-dark/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {patient.firstName?.[0]}{patient.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text">{patient.firstName} {patient.lastName}</p>
                            <p className="text-xs text-text-light">{GENDER_LABELS[patient.gender]} - {patient.bloodType || "Sin tipo"}</p>
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
                        {patient.email && (
                          <div className="flex items-center gap-1.5 text-xs text-text-light mt-1">
                            <Mail className="w-3 h-3" /> {patient.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text">{patient.insuranceProvider || "Sin seguro"}</p>
                        {patient.insurancePolicyNumber && (
                          <p className="text-xs text-text-light font-mono">{patient.insurancePolicyNumber}</p>
                        )}
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
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title="Historia Clínica"
                            onClick={() => navigate(`/patients/${patient.id}/history`)}
                          >
                            <ClipboardList className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => navigate(`/patients/${patient.id}/edit`)}>
                            <Edit2 className="w-4 h-4 text-text-light" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8" title="Eliminar"
                            disabled={deletingId === patient.id}
                            onClick={() => handleDelete(patient)}
                          >
                            {deletingId === patient.id ? (
                              <Loader2 className="w-4 h-4 text-danger animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-danger" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <Separator />
          <div className="flex items-center justify-between px-6 py-3">
            <p className="text-sm text-text-light">
              Mostrando {filtered.length === 0 ? 0 : ((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-text-light px-2">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
