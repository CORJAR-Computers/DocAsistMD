import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doctor } from "@/types/doctor";
import { DOCTOR_STATUS_LABELS } from "@/types/doctor";
import { UserPlus, Phone, Mail, Stethoscope, Clock } from "lucide-react";
import { apiCall } from "@/services/api";
import NewDoctorModal from "@/components/modals/NewDoctorModal";

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiCall<Doctor[]>("get_doctors").then(setDoctors).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Medicos</h1>
          <p className="text-sm text-text-light mt-1">{loading ? "Cargando..." : `${doctors.length} médicos registrados`}</p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}><UserPlus className="w-4 h-4" /> Nuevo Médico</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-text-muted text-sm col-span-2 text-center py-8">Cargando médicos...</p>
        ) : doctors.length === 0 ? (
          <p className="text-text-muted text-sm col-span-2 text-center py-8">No hay médicos registrados. ¡Agrega el primero!</p>
        ) : doctors.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  Dr.
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-text">Dr. {doc.firstName} {doc.lastName}</h3>
                    <Badge variant={doc.status === "active" ? "success" : "warning"}>{DOCTOR_STATUS_LABELS[doc.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-secondary font-medium mb-2">
                    <Stethoscope className="w-4 h-4" /> {doc.specialty}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-text-light">
                      <Phone className="w-3.5 h-3.5" /> {doc.phone}
                    </div>
                    {doc.email && (
                      <div className="flex items-center gap-2 text-xs text-text-light">
                        <Mail className="w-3.5 h-3.5" /> {doc.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-text-light">
                      <Clock className="w-3.5 h-3.5" /> {doc.scheduleStart} - {doc.scheduleEnd}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-2">Licencia: {doc.licenseNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showModal && (
        <NewDoctorModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
