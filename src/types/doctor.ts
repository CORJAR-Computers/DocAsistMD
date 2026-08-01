export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  phone: string;
  email: string | null;
  scheduleStart: string;
  scheduleEnd: string;
  workingDays: string;
  status: DoctorStatus;
  createdAt: string;
  updatedAt: string;
}

export type DoctorStatus = "active" | "inactive" | "vacation";

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  vacation: "Vacaciones",
};

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
