export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  phone: string;
  email: string;
  scheduleStart: string;
  scheduleEnd: string;
  workingDays: number[];
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

export interface CreateDoctorInput {
  firstName: string; lastName: string; specialty: string;
  licenseNumber: string; phone: string; email: string;
  scheduleStart: string; scheduleEnd: string; workingDays: number[];
}

export interface UpdateDoctorInput {
  id: string;
  firstName?: string; lastName?: string; specialty?: string;
  licenseNumber?: string; phone?: string; email?: string;
  scheduleStart?: string; scheduleEnd?: string; workingDays?: number[];
  status?: DoctorStatus;
}
