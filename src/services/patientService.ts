import { apiCall } from "./api";
import type { Patient, CreatePatientInput, UpdatePatientInput } from "@/types/patient";

export const patientService = {
  getAll: () => apiCall<Patient[]>("get_patients"),
  getById: (id: string) => apiCall<Patient>("get_patient", { id }),
  create: (input: CreatePatientInput) => apiCall<Patient>("create_patient", { input }),
  update: (input: UpdatePatientInput) => apiCall<Patient>("update_patient", { input }),
  search: (query: string) => apiCall<Patient[]>("search_patients", { query }),
  delete: (id: string) => apiCall<void>("delete_patient", { id }),
};
