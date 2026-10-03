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

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  patients: "Pacientes",
  appointments: "Citas",
  consultations: "Historia Clínica / Consultas",
  doctors: "Médicos (Gestión de Planta)",
  medications: "Medicamentos e Inventario",
  billing: "Facturación",
  reports: "Reportes Financieros y RIPS",
  audit: "Auditoría del Sistema",
  settings: "Configuración y Usuarios",
};

/**
 * Módulos accesibles por rol. El menú lateral se filtra con esto y los guards
 * de ruta lo usan como respaldo (el backend valida por separado las operaciones
 * sensibles de administrador).
 * 
 * Reglas de seguridad RBAC:
 * - admin: acceso irrestricto a todos los módulos.
 * - doctor: atención clínica, recetas, consultas e inventario de medicamentos.
 * - receptionist: admisión de pacientes, programación de citas y facturación.
 * - Módulos sensibles (médicos, reportes financieros, auditoría, configuración/usuarios):
 *   restringidos estrictamente a "admin".
 */
export const MODULE_ROLES: Record<ModuleKey, UserRole[]> = {
  dashboard: ["admin", "doctor", "receptionist"],
  patients: ["admin", "doctor", "receptionist"],
  appointments: ["admin", "doctor", "receptionist"],
  consultations: ["admin", "doctor"],
  doctors: ["admin"],
  medications: ["admin", "doctor"],
  billing: ["admin", "receptionist"],
  reports: ["admin"],
  audit: ["admin"],
  settings: ["admin"],
};

export function canAccess(role: UserRole | undefined, module: ModuleKey): boolean {
  if (!role) return false;
  return MODULE_ROLES[module].includes(role);
}

export function getModuleRequiredRoles(module: ModuleKey): UserRole[] {
  return MODULE_ROLES[module];
}
