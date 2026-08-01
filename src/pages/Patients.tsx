import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientStore } from "@/stores/patientStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

// Mock data for demo
const mockPatients: Patient[] = [
  {
    id: "1", firstName: "Maria", lastName: "Garcia Lopez", documentId: "12345678", documentType: "CC",
    dateOfBirth: "1985-03-15", gender: "F", phone: "+57 300 123 4567", email: "maria.garcia@email.com",
    address: "Calle 45 #12-30, Bogota", bloodType: "O+", allergies: "Penicilina",
    emergencyContactName: "Juan Garcia", emergencyContactPhone: "+57 311 456 7890",
    insuranceProvider: "Sura", insurancePolicyNumber: "POL-001234", insuranceExpiryDate: "2026-12-31",
    notes: "", createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "2", firstName: "Carlos", lastName: "Martinez Ruiz", documentId: "87654321", documentType: "CC",
    dateOfBirth: "1972-08-22", gender: "M", phone: "+57 310 987 6543", email: "carlos.martinez@email.com",
    address: "Cra 7 #82-15, Bogota", bloodType: "A-", allergies: "Ninguna conocida",
    emergencyContactName: "Ana Martinez", emergencyContactPhone: "+57 320 111 2222",
    insuranceProvider: "Coomeva", insurancePolicyNumber: "POL-005678", insuranceExpiryDate: "2026-06-30",
    notes: "Paciente hipertenso", createdAt: "2026-02-01T14:30:00Z", updatedAt: "2026-02-01T14:30:00Z",
  },
  {
    id: "3", firstName: "Ana", lastName: "Rodriguez Perez", documentId: "45678901", documentType: "CE",
    dateOfBirth: "1990-11-05", gender: "F", phone: "+57 315 555 1234", email: "ana.rodriguez@email.com",
    address: "Av. El Dorado #68-50, Bogota", bloodType: "B+", allergies: "Sulfonamidas",
    emergencyContactName: "Luis Rodriguez", emergencyContactPhone: "+57 316 666 7777",
    insuranceProvider: "Sanitas", insurancePolicyNumber: "POL-009012", insuranceExpiryDate: "2027-03-15",
    notes: "", createdAt: "2026-03-10T09:00:00Z", updatedAt: "2026-03-10T09:00:00Z",
  },
  {
    id: "4", firstName: "Pedro", lastName: "Sanchez Mora", documentId: "23456789", documentType: "CC",
    dateOfBirth: "1965-01-28", gender: "M", phone: "+57 312 333 4444", email: "pedro.sanchez@email.com",
    address: "Calle 100 #15-20, Bogota", bloodType: "AB+", allergies: "Aspirina",
    emergencyContactName: "Rosa Sanchez", emergencyContactPhone: "+57 313 555 6666",
    insuranceProvider: "Nueva EPS", insurancePolicyNumber: "POL-003456", insuranceExpiryDate: "2026-09-30",
    notes: "Diabetico tipo 2", createdAt: "2026-04-05T16:00:00Z", updatedAt: "2026-04-05T16:00:00Z",
  },
  {
    id: "5", firstName: "Laura", lastName: "Diaz Vega", documentId: "98765432", documentType: "CC",
    dateOfBirth: "1998-06-10", gender: "F", phone: "+57 317 777 8888", email: "laura.diaz@email.com",
    address: "Calle 80 #20-45, Bogota", bloodType: "O-", allergies: "Ninguna conocida",
    emergencyContactName: "Marta Diaz", emergencyContactPhone: "+57 318 999 0000",
    insuranceProvider: "Sura", insurancePolicyNumber: "POL-007890", insuranceExpiryDate: "2027-01-31",
    notes: "", createdAt: "2026-05-20T11:30:00Z", updatedAt: "2026-05-20T11:30:00Z",
  },
];

export default function Patients() {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = usePatientStore();
  const [patients] = useState<Patient[]>(mockPatients);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const filtered = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.documentId.includes(q) ||
      p.phone.includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

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
                {paged.map((patient) => (
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => alert("Modulo de edicion en desarrollo")}>
                          <Edit2 className="w-4 h-4 text-text-light" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Eliminar" onClick={() => alert("Modulo de eliminacion en desarrollo")}>
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Separator />
          <div className="flex items-center justify-between px-6 py-3">
            <p className="text-sm text-text-light">
              Mostrando {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
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
