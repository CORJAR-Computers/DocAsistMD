import type { UserRole } from "@/types/auth";

export type ModuleKey =
  | "dashboard"
  | "patients"
  | "appointments"
  | "consultations"
  | "doctors"
  | "medications"
  | "billing"
  | "reports"
  | "audit"
  | "settings";

/**
 * Módulos accesibles por rol. El menú lateral se filtra con esto y los guards
 * de ruta lo usan como respaldo (el backend valida por separado las operaciones
 * sensibles de administrador).
 */
export const MODULE_ROLES: Record<ModuleKey, UserRole[]> = {
  dashboard: ["admin", "doctor", "receptionist"],
  patients: ["admin", "doctor", "receptionist"],
  appointments: ["admin", "doctor", "receptionist"],
  consultations: ["admin", "doctor"],
  doctors: ["admin", "doctor"],
  medications: ["admin", "doctor"],
  billing: ["admin", "receptionist"],
  reports: ["admin", "doctor"],
  audit: ["admin"],
  settings: ["admin"],
};

export function canAccess(role: UserRole | undefined, module: ModuleKey): boolean {
  if (!role) return false;
  return MODULE_ROLES[module].includes(role);
}
