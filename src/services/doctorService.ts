import { apiCall } from "./api";
import type { Doctor, CreateDoctorInput, UpdateDoctorInput } from "@/types/doctor";

export const doctorService = {
  getAll: () => apiCall<Doctor[]>("get_doctors"),
  getById: (id: string) => apiCall<Doctor>("get_doctor", { id }),
  create: (input: CreateDoctorInput) => apiCall<Doctor>("create_doctor", { input }),
  update: (input: UpdateDoctorInput) => apiCall<Doctor>("update_doctor", { input }),
  delete: (id: string) => apiCall<void>("delete_doctor", { id }),
};
