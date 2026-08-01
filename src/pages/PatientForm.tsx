import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { patientService } from "@/services/patientService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCUMENT_TYPE_LABELS, GENDER_LABELS } from "@/types/patient";
import type { CreatePatientInput, DocumentType, Gender } from "@/types/patient";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  documentId: "",
  documentType: "CC" as DocumentType,
  dateOfBirth: "",
  gender: "M" as Gender,
  phone: "",
  email: "",
  address: "",
  bloodType: "",
  allergies: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insuranceExpiryDate: "",
  notes: "",
};

export default function PatientForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!isEdit) return;
    patientService
      .getById(id!)
      .then((p) =>
        setForm({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          documentId: p.documentId || "",
          documentType: p.documentType,
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
          gender: p.gender,
          phone: p.phone || "",
          email: p.email || "",
          address: p.address || "",
          bloodType: p.bloodType || "",
          allergies: p.allergies || "",
          emergencyContactName: p.emergencyContactName || "",
          emergencyContactPhone: p.emergencyContactPhone || "",
          insuranceProvider: p.insuranceProvider || "",
          insurancePolicyNumber: p.insurancePolicyNumber || "",
          insuranceExpiryDate: p.insuranceExpiryDate ? p.insuranceExpiryDate.slice(0, 10) : "",
          notes: p.notes || "",
        })
      )
      .catch((err) => {
        console.error(err);
        setError("Error al cargar el paciente.");
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const input: CreatePatientInput = {
      firstName: form.firstName,
      lastName: form.lastName,
      documentId: form.documentId,
      documentType: form.documentType,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      phone: form.phone,
      email: form.email || "",
      address: form.address || "",
      bloodType: form.bloodType || undefined,
      allergies: form.allergies || undefined,
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      insuranceProvider: form.insuranceProvider || undefined,
      insurancePolicyNumber: form.insurancePolicyNumber || undefined,
      insuranceExpiryDate: form.insuranceExpiryDate || undefined,
      notes: form.notes || undefined,
    };
    try {
      const userId = useAuthStore.getState().user?.id;
      if (isEdit) {
        await patientService.update(id!, input, userId);
      } else {
        await patientService.create(input, userId);
      }
      navigate("/patients");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al guardar el paciente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-light gap-3">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando paciente...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text">{isEdit ? "Editar Paciente" : "Nuevo Paciente"}</h1>
          <p className="text-sm text-text-light">Complete los datos del paciente</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle>Datos Personales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre *" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
              <Input label="Apellido *" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Tipo de Documento *</label>
                <select value={form.documentType} onChange={(e) => update("documentType", e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary">
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <Input label="Numero de Documento *" value={form.documentId} onChange={(e) => update("documentId", e.target.value)} required />
              <Input label="Fecha de Nacimiento *" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} required />
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Genero *</label>
                <select value={form.gender} onChange={(e) => update("gender", e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary">
                  {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader><CardTitle>Datos de Contacto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Telefono *" value={form.phone} onChange={(e) => update("phone", e.target.value)} required placeholder="+57 300 123 4567" />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="correo@ejemplo.com" />
              <div className="sm:col-span-2">
                <Input label="Direccion" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Calle, Numero, Ciudad" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Info */}
        <Card>
          <CardHeader><CardTitle>Datos Medicos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Tipo de Sangre</label>
                <select value={form.bloodType} onChange={(e) => update("bloodType", e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Seleccionar</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Input label="Alergias" value={form.allergies} onChange={(e) => update("allergies", e.target.value)} placeholder="Ej: Penicilina, Sulfonamidas" />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader><CardTitle>Contacto de Emergencia</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre del Contacto" value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
              <Input label="Telefono del Contacto" value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card>
          <CardHeader><CardTitle>Seguro Medico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Aseguradora" value={form.insuranceProvider} onChange={(e) => update("insuranceProvider", e.target.value)} placeholder="Ej: Sura, Coomeva" />
              <Input label="Numero de Poliza" value={form.insurancePolicyNumber} onChange={(e) => update("insurancePolicyNumber", e.target.value)} />
              <Input label="Fecha de Vencimiento" type="date" value={form.insuranceExpiryDate} onChange={(e) => update("insuranceExpiryDate", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Observaciones adicionales del paciente..."
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate("/patients")}>Cancelar</Button>
          <Button type="submit" className="gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Guardar Cambios" : "Guardar Paciente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
