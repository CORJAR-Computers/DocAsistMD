import { describe, it, expect } from "vitest";
import { buildRipsPackage, mapDocumentTypeToRips } from "./ripsService";
import type { Consultation } from "./consultationService";
import type { Patient } from "@/types/patient";
import type { Appointment } from "@/types/appointment";

describe("ripsService", () => {
  it("maps Colombian document types to RIPS standard", () => {
    expect(mapDocumentTypeToRips("CC")).toBe("CC");
    expect(mapDocumentTypeToRips("TI")).toBe("TI");
    expect(mapDocumentTypeToRips("PPT")).toBe("PT");
    expect(mapDocumentTypeToRips("PP")).toBe("PA");
  });

  it("builds a valid RIPS JSON package according to Res. 948 de 2026", () => {
    const patient: Patient = {
      id: "pat-1",
      firstName: "Carlos",
      lastName: "Gómez",
      documentId: "1020304050",
      documentType: "CC",
      dateOfBirth: "1985-05-15",
      gender: "M",
      phone: "3001234567",
      email: "carlos@example.com",
      address: "Cra 7 # 45-10",
      bloodType: "O+",
      allergies: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      insuranceProvider: null,
      insurancePolicyNumber: null,
      insuranceExpiryDate: null,
      notes: null,
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:00:00Z",
    };

    const appointment: Appointment = {
      id: "appt-1",
      patientId: "pat-1",
      patientName: "Carlos Gómez",
      doctorId: "doc-1",
      doctorName: "Dr. Pérez",
      dateTime: "2026-10-01T10:00:00Z",
      durationMinutes: 30,
      status: "completed",
      appointmentType: "consultation",
      reason: "Chequeo médico",
      notes: null,
      createdAt: "2026-10-01T09:00:00Z",
      updatedAt: "2026-10-01T10:30:00Z",
    };

    const consultation: Consultation = {
      id: "cons-1",
      appointmentId: "appt-1",
      patientId: "pat-1",
      doctorId: "doc-1",
      vitalSigns: "PA: 120/80 mmHg, FC: 72 lpm",
      symptoms: "Cefalea ocasional",
      diagnosis: "Hipertensión esencial (primaria)",
      cie10Code: "I10",
      treatmentPlan: "Control en 3 meses",
      clinicalNotes: "Paciente estable",
      createdAt: "2026-10-01T10:30:00Z",
      updatedAt: "2026-10-01T10:30:00Z",
    };

    const pkg = buildRipsPackage({
      prestadorNitOrDocument: "901234567-8",
      prestadorCodigoReps: "110010999901",
      facturaNumero: "FEV-100",
      consultations: [consultation],
      patients: [patient],
      appointments: [appointment],
    });

    expect(pkg.numDocumentoIdObligado).toBe("901234567-8");
    expect(pkg.numFactura).toBe("FEV-100");
    expect(pkg.usuarios).toHaveLength(1);

    const user = pkg.usuarios[0];
    expect(user.numDocumentoIdentificacion).toBe("1020304050");
    expect(user.tipoDocumentoIdentificacion).toBe("CC");
    expect(user.servicios.consultas).toHaveLength(1);

    const consultaItem = user.servicios.consultas[0];
    expect(consultaItem.codDiagnosticoPrincipal).toBe("I10");
    expect(consultaItem.codConsulta).toBe("890201");
    expect(consultaItem.codPrestador).toBe("110010999901");
  });
});
