import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doctor } from "@/types/doctor";
import { DOCTOR_STATUS_LABELS } from "@/types/doctor";
import { UserPlus, Phone, Mail, Stethoscope, Clock } from "lucide-react";

const mockDoctors: Doctor[] = [
  { id: "1", firstName: "Carlos", lastName: "Mendez", specialty: "Medicina General", licenseNumber: "MED-12345", phone: "+57 300 111 2222", email: "carlos.mendez@docasistmd.com", scheduleStart: "08:00", scheduleEnd: "17:00", workingDays: [1,2,3,4,5], status: "active", createdAt: "", updatedAt: "" },
  { id: "2", firstName: "Ana", lastName: "Torres", specialty: "Pediatria", licenseNumber: "MED-67890", phone: "+57 300 333 4444", email: "ana.torres@docasistmd.com", scheduleStart: "09:00", scheduleEnd: "18:00", workingDays: [1,2,3,4,5], status: "active", createdAt: "", updatedAt: "" },
  { id: "3", firstName: "Roberto", lastName: "Herrera", specialty: "Cardiologia", licenseNumber: "MED-11223", phone: "+57 300 555 6666", email: "roberto.herrera@docasistmd.com", scheduleStart: "10:00", scheduleEnd: "16:00", workingDays: [1,3,5], status: "active", createdAt: "", updatedAt: "" },
  { id: "4", firstName: "Lucia", lastName: "Fernandez", specialty: "Dermatologia", licenseNumber: "MED-44556", phone: "+57 300 777 8888", email: "lucia.fernandez@docasistmd.com", scheduleStart: "08:00", scheduleEnd: "14:00", workingDays: [2,4], status: "vacation", createdAt: "", updatedAt: "" },
];

export default function Doctors() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Medicos</h1>
          <p className="text-sm text-text-light mt-1">{mockDoctors.length} medicos registrados</p>
        </div>
        <Button className="gap-2" onClick={() => alert("Modulo de Medicos en desarrollo")}><UserPlus className="w-4 h-4" /> Nuevo Medico</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockDoctors.map((doc) => (
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
    </div>
  );
}
