export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  dateTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type AppointmentType = "consultation" | "follow_up" | "emergency" | "procedure" | "telemedicine";

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  dateTime: string;
  durationMinutes: number;
  type: AppointmentType;
  reason: string;
  notes?: string;
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  in_progress: "En Curso",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No Asistio",
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  consultation: "Consulta",
  follow_up: "Seguimiento",
  emergency: "Urgencia",
  procedure: "Procedimiento",
  telemedicine: "Telemedicina",
};
