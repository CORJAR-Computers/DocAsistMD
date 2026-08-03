import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { patientService } from "@/services/patientService";
import { appointmentService } from "@/services/appointmentService";
import { medicationService } from "@/services/medicationService";
import { consultationService } from "@/services/consultationService";
import { useAuthStore } from "@/stores/authStore";
import type { Consultation, Prescription } from "@/services/consultationService";
import type { Patient } from "@/types/patient";
import type { Appointment } from "@/types/appointment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ClipboardList, Calendar, Pill,
  Activity, FileText, AlertCircle, Plus, Undo2, Loader2
} from "lucide-react";
import type { InventoryMovement } from "@/types/medication";
import NewConsultationModal from "@/components/modals/NewConsultationModal";
import NewAppointmentModal from "@/components/modals/NewAppointmentModal";
import PrescriptionPdfButton from "@/components/PrescriptionPdfButton";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programada", confirmed: "Confirmada", in_progress: "En Curso",
  completed: "Completada", cancelled: "Cancelada", no_show: "No Asistió",
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "info" | "secondary"> = {
  scheduled: "info", confirmed: "success", in_progress: "warning",
  completed: "success", cancelled: "danger", no_show: "secondary",
};

export default function PatientHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptionMap, setPrescriptionMap] = useState<Record<string, Prescription[]>>({});
  const [movementMap, setMovementMap] = useState<Record<string, InventoryMovement>>({});
  const [medicationMap, setMedicationMap] = useState<Record<string, string>>({});
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"consultations" | "appointments">("consultations");
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [pat, consults, appts, meds] = await Promise.all([
        patientService.getById(id),
        consultationService.getByPatient(id),
        appointmentService.getAll(),
        medicationService.getAll(),
      ]);
      setPatient(pat);
      setConsultations(consults);
      setAppointments(appts.filter((a) => a.patientId === id));
      setMedicationMap(Object.fromEntries(meds.map((m) => [m.id, m.name])));

      // Load prescriptions and their dispense movements for each consultation
      const rxMap: Record<string, Prescription[]> = {};
      const mvMap: Record<string, InventoryMovement> = {};
      await Promise.all(
        consults.map(async (c) => {
          try {
            rxMap[c.id] = await consultationService.getPrescriptions(c.id);
          } catch {
            rxMap[c.id] = [];
          }
          try {
            const mvs = await medicationService.getDispensedMovements(c.id);
            mvs.forEach((mv) => {
              if (mv.reference) mvMap[mv.reference] = mv;
            });
          } catch {
            // Movements are optional; the history still renders without them
          }
        })
      );
      setPrescriptionMap(rxMap);
      setMovementMap(mvMap);
    } catch (err) {
      console.error("Error loading patient history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleUndoDispense = async (rx: Prescription) => {
    const mv = movementMap[rx.id];
    if (!mv) return;
    const ok = window.confirm(
      "¿Deshacer esta dispensación?\n\nSe restablecerá el stock, se registrará una entrada de reversión en inventario y el movimiento quedará marcado como reversado. La receta se conserva en la historia clínica."
    );
    if (!ok) return;
    setUndoingId(mv.id);
    try {
      await medicationService.undoDispense(mv.id, useAuthStore.getState().user?.id);
      await load();
    } catch (err) {
      console.error("Error al deshacer la dispensación:", err);
      alert("No se pudo deshacer la dispensación. Verifica que no esté ya revertida.");
    } finally {
      setUndoingId(null);
    }
  };

  const age = patient
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31557600000)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="ml-3 text-text-light text-sm">Cargando historia clínica...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
        <p className="text-text-light">Paciente no encontrado</p>
        <Button className="mt-4" onClick={() => navigate("/patients")}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text">Historia Clínica</h1>
          <p className="text-sm text-text-light">Registro médico completo del paciente</p>
        </div>
      </div>

      {/* Patient Summary Card */}
      <Card className="border-primary/20 bg-linear-to-r from-primary/3 to-secondary/3">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-light mb-0.5">Nombre completo</p>
                <p className="text-sm font-semibold text-text">{patient.firstName} {patient.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-text-light mb-0.5">Documento</p>
                <p className="text-sm font-mono text-text">{patient.documentType}: {patient.documentId}</p>
              </div>
              <div>
                <p className="text-xs text-text-light mb-0.5">Edad / Género</p>
                <p className="text-sm text-text">{age} años — {patient.gender === "M" ? "Masculino" : "Femenino"}</p>
              </div>
              <div>
                <p className="text-xs text-text-light mb-0.5">Grupo Sanguíneo</p>
                <p className="text-sm font-semibold text-primary">{patient.bloodType || "No registrado"}</p>
              </div>
              {patient.allergies && (
                <div className="col-span-2">
                  <p className="text-xs text-text-light mb-0.5">Alergias</p>
                  <Badge variant="danger" className="text-xs">{patient.allergies}</Badge>
                </div>
              )}
              <div>
                <p className="text-xs text-text-light mb-0.5">Seguro Médico</p>
                <p className="text-sm text-text">{patient.insuranceProvider || "Sin seguro"}</p>
              </div>
              <div>
                <p className="text-xs text-text-light mb-0.5">Teléfono</p>
                <p className="text-sm text-text">{patient.phone}</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{appointments.length}</p>
              <p className="text-xs text-text-light">Citas totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">{consultations.length}</p>
              <p className="text-xs text-text-light">Consultas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-text">
                {Object.values(prescriptionMap).reduce((s, rx) => s + rx.length, 0)}
              </p>
              <p className="text-xs text-text-light">Prescripciones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab bar + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-surface-dark rounded-xl">
          <button
            onClick={() => setActiveTab("consultations")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all motion-reduce:transition-none ${
              activeTab === "consultations"
                ? "bg-surface text-primary shadow-sm"
                : "text-text-light hover:text-text"
            }`}
          >
            <ClipboardList className="w-4 h-4 inline mr-1.5" />
            Consultas ({consultations.length})
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all motion-reduce:transition-none ${
              activeTab === "appointments"
                ? "bg-surface text-primary shadow-sm"
                : "text-text-light hover:text-text"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5" />
            Citas ({appointments.length})
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowApptModal(true)}>
            <Calendar className="w-3.5 h-3.5" /> Nueva Cita
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowConsultModal(true)}>
            <Plus className="w-3.5 h-3.5" /> Registrar Consulta
          </Button>
        </div>
      </div>

      {/* Consultations Tab */}
      {activeTab === "consultations" && (
        <div className="space-y-4">
          {consultations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-light">No hay consultas registradas para este paciente</p>
                <Button className="mt-4 gap-2" size="sm" onClick={() => setShowConsultModal(true)}>
                  <Plus className="w-4 h-4" /> Registrar primera consulta
                </Button>
              </CardContent>
            </Card>
          ) : (
            consultations.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Consultation header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {c.diagnosis || "Sin diagnóstico registrado"}
                          {c.cie10Code && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary">
                              {c.cie10Code}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-light mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString("es-CO", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {c.vitalSigns && (
                      <div className="flex gap-2">
                        <Activity className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-text-light mb-0.5">Signos Vitales</p>
                          <p className="text-text">{c.vitalSigns}</p>
                        </div>
                      </div>
                    )}
                    {c.symptoms && (
                      <div className="flex gap-2">
                        <AlertCircle className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-text-light mb-0.5">Síntomas</p>
                          <p className="text-text">{c.symptoms}</p>
                        </div>
                      </div>
                    )}
                    {c.treatmentPlan && (
                      <div className="md:col-span-2 flex gap-2">
                        <FileText className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-text-light mb-0.5">Plan de Tratamiento</p>
                          <p className="text-text">{c.treatmentPlan}</p>
                        </div>
                      </div>
                    )}
                    {c.clinicalNotes && (
                      <div className="md:col-span-2 flex gap-2">
                        <FileText className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-text-light mb-0.5">Notas Clínicas</p>
                          <p className="text-text text-sm italic">{c.clinicalNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prescriptions */}
                  {prescriptionMap[c.id]?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-secondary" />
                          <p className="text-xs font-semibold text-text-light uppercase tracking-wide">
                            Fórmula Médica ({prescriptionMap[c.id].length} medicamentos)
                          </p>
                        </div>
                        <PrescriptionPdfButton consultationId={c.id} compact />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {prescriptionMap[c.id].map((rx) => {
                          const mv = movementMap[rx.id];
                          return (
                            <div key={rx.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary/5 border border-secondary/10 ${mv?.reversedAt ? "opacity-70" : ""}`}>
                              <Pill className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" />
                              <div className="text-xs flex-1 min-w-0">
                                <p className="font-medium text-text">{medicationMap[rx.medicationId] || "Medicamento"}</p>
                                <p className="text-text-light">{rx.dosage} — {rx.frequency} — {rx.duration}</p>
                                {rx.quantity > 1 && (
                                  <p className="text-text-muted mt-0.5">Cantidad dispensada: {rx.quantity}</p>
                                )}
                                {rx.instructions && <p className="text-text-muted italic mt-0.5">{rx.instructions}</p>}
                              </div>
                              <div className="shrink-0 self-start">
                                {mv?.reversedAt ? (
                                  <Badge
                                    variant="secondary"
                                    title={`Reversado el ${new Date(mv.reversedAt).toLocaleString("es-CO")} — stock restablecido`}
                                  >
                                    Reversado
                                  </Badge>
                                ) : mv ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs gap-1 text-danger hover:text-danger hover:bg-danger/10"
                                    disabled={undoingId === mv.id}
                                    onClick={() => handleUndoDispense(rx)}
                                  >
                                    {undoingId === mv.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Undo2 className="w-3 h-3" />}
                                    Deshacer
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === "appointments" && (
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-light">No hay citas registradas para este paciente</p>
                <Button className="mt-4 gap-2" size="sm" onClick={() => setShowApptModal(true)}>
                  <Plus className="w-4 h-4" /> Agendar primera cita
                </Button>
              </CardContent>
            </Card>
          ) : (
            appointments.map((a) => (
              <Card key={a.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-dark flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-text-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-text">{a.doctorName}</p>
                        <Badge variant={STATUS_VARIANTS[a.status] ?? "secondary"} className="text-xs">
                          {STATUS_LABELS[a.status] ?? a.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-light mt-0.5">
                        {new Date(a.dateTime).toLocaleDateString("es-CO", {
                          weekday: "short", year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })} — {a.durationMinutes} min
                      </p>
                      {a.reason && <p className="text-xs text-text-muted mt-0.5 truncate">{a.reason}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showConsultModal && (
        <NewConsultationModal
          onClose={() => setShowConsultModal(false)}
          onCreated={() => { setShowConsultModal(false); load(); }}
        />
      )}
      {showApptModal && (
        <NewAppointmentModal
          preselectedPatientId={id}
          onClose={() => setShowApptModal(false)}
          onCreated={() => { setShowApptModal(false); load(); }}
        />
      )}
    </div>
  );
}
