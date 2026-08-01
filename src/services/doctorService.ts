import { apiCall } from "./api";
import type { Doctor } from "@/types/doctor";

export interface CreateDoctorInput {
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  phone: string;
  email: string;
  scheduleStart: string;
  scheduleEnd: string;
}

export const doctorService = {
  getAll: () => apiCall<Doctor[]>("get_doctors"),

  getById: (id: string) => apiCall<Doctor>("get_doctor", { id }),

  create: (input: CreateDoctorInput) => apiCall<Doctor>("create_doctor", { input }),
};
