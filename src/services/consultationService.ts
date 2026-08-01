import { apiCall } from "./api";

export interface Consultation {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  vitalSigns: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  cie10Code: string | null;
  treatmentPlan: string | null;
  clinicalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationInput {
  appointmentId: string;
  vitalSigns?: string;
  symptoms?: string;
  diagnosis?: string;
  cie10Code?: string;
  treatmentPlan?: string;
  clinicalNotes?: string;
}

export interface Prescription {
  id: string;
  consultationId: string;
  medicationId: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity: number;
  createdAt: string;
}

export interface CreatePrescriptionInput {
  consultationId: string;
  medicationId: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
}

export interface PrescriptionPdfResult {
  path: string;
  verificationCode: string;
}

export const consultationService = {
  getAll: () => apiCall<Consultation[]>("get_consultations"),
  getById: (id: string) => apiCall<Consultation>("get_consultation", { id }),
  getByPatient: (patientId: string) =>
    apiCall<Consultation[]>("get_patient_consultations", { patientId }),
  create: (input: CreateConsultationInput) =>
    apiCall<Consultation>("create_consultation", { input }),
  getPrescriptions: (consultationId: string) =>
    apiCall<Prescription[]>("get_consultation_prescriptions", { consultationId }),
  createPrescription: (input: CreatePrescriptionInput, userId?: string) =>
    apiCall<Prescription>("create_prescription", userId ? { input, userId } : { input }),
  generatePrescriptionPdf: (consultationId: string, outDir?: string) =>
    apiCall<PrescriptionPdfResult>(
      "generate_prescription_pdf",
      outDir ? { consultationId, outDir } : { consultationId }
    ),
};
