import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { doctorService } from "@/services/doctorService";
import type { Doctor } from "@/types/doctor";
import { DOCTOR_STATUS_LABELS } from "@/types/doctor";
import { UserPlus, Phone, Mail, Stethoscope, Clock, Loader2 } from "lucide-react";

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorService.getAll()
      .then(setDoctors)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Medicos</h1>
          <p className="text-sm text-text-light mt-1">{doctors.length} medicos registrados</p>
        </div>
        <Button className="gap-2" onClick={() => alert("Modulo de Medicos en desarrollo")}><UserPlus className="w-4 h-4" /> Nuevo Medico</Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-text-light">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Cargando medicos...
          </CardContent>
        </Card>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Stethoscope className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-light">No hay medicos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((doc) => (
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
                      <div className="flex items-center gap-2 text-xs text-text-light">
                        <Mail className="w-3.5 h-3.5" /> {doc.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-light">
                        <Clock className="w-3.5 h-3.5" /> {doc.scheduleStart} - {doc.scheduleEnd} | {doc.workingDays.map(d => ["Do","Lu","Ma","Mi","Ju","Vi","Sa"][d]).join(", ")}
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-2">Licencia: {doc.licenseNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
