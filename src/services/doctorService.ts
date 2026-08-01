import { apiCall } from "./api";
import type { Doctor } from "@/types/doctor";

export const doctorService = {
  getAll: () => apiCall<Doctor[]>("get_doctors"),

  getById: (id: string) => apiCall<Doctor>("get_doctor", { id }),
};
