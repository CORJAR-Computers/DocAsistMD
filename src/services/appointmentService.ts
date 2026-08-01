import { apiCall } from "./api";
import type { Appointment, CreateAppointmentInput, AppointmentStatus } from "@/types/appointment";

export const appointmentService = {
  getAll: () => apiCall<Appointment[]>("get_appointments"),

  create: (input: CreateAppointmentInput) => apiCall<void>("create_appointment", { input }),

  updateStatus: (id: string, status: AppointmentStatus) =>
    apiCall<void>("update_appointment_status", { id, status }),
};
