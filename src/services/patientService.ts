import { apiCall } from "./api";
import type { Patient, CreatePatientInput } from "@/types/patient";

export const patientService = {
  getAll: () => apiCall<Patient[]>("get_patients"),

  getById: (id: string) => apiCall<Patient>("get_patient", { id }),

  create: (input: CreatePatientInput, userId?: string) =>
    apiCall<Patient>("create_patient", userId ? { input, userId } : { input }),

  update: (id: string, input: CreatePatientInput, userId?: string) =>
    apiCall<Patient>("update_patient", userId ? { id, input, userId } : { id, input }),

  search: (query: string) => apiCall<Patient[]>("search_patients", { query }),

  delete: (id: string, userId?: string) =>
    apiCall<void>("delete_patient", userId ? { id, userId } : { id }),
};
