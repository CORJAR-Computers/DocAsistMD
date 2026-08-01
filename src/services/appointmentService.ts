import { apiCall } from "./api";
import type { Appointment, CreateAppointmentInput, AppointmentStatus } from "@/types/appointment";

export const appointmentService = {
  getAll: () => apiCall<Appointment[]>("get_appointments"),

  create: (input: CreateAppointmentInput, userId?: string) =>
    apiCall<void>("create_appointment", userId ? { input, userId } : { input }),

  updateStatus: (id: string, status: AppointmentStatus, userId?: string) =>
    apiCall<void>("update_appointment_status", userId ? { id, status, userId } : { id, status }),
};
