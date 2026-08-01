import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DOCUMENT_TYPE_LABELS, GENDER_LABELS } from "@/types/patient";
import type { DocumentType, Gender } from "@/types/patient";
import { ArrowLeft, Save } from "lucide-react";

export default function PatientForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "", lastName: "", documentId: "", documentType: "CC" as DocumentType,
    dateOfBirth: "", gender: "M" as Gender, phone: "", email: "", address: "",
    bloodType: "", allergies: "", emergencyContactName: "", emergencyContactPhone: "",
    insuranceProvider: "", insurancePolicyNumber: "", insuranceExpiryDate: "", notes: "",
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this calls invoke("create_patient", { ...form })
    navigate("/patients");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text">Nuevo Paciente</h1>
          <p className="text-sm text-text-light">Complete los datos del paciente</p>
        </div>
      </div>

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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate("/patients")}>Cancelar</Button>
          <Button type="submit" className="gap-2"><Save className="w-4 h-4" /> Guardar Paciente</Button>
        </div>
      </form>
    </div>
  );
}
