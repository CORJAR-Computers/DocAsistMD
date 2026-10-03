import { describe, it, expect } from "vitest";
import { canAccess, MODULE_ROLES, type ModuleKey } from "./permissions";

const ALL_MODULES: ModuleKey[] = [
  "dashboard",
  "patients",
  "appointments",
  "consultations",
  "doctors",
  "medications",
  "billing",
  "reports",
  "audit",
  "settings",
];

const ROLES = ["admin", "doctor", "receptionist"] as const;

describe("permissions", () => {
  it("deniega acceso cuando no hay rol definido", () => {
    for (const module of ALL_MODULES) {
      expect(canAccess(undefined, module)).toBe(false);
    }
  });

  it("admin accede a todos los módulos", () => {
    for (const module of ALL_MODULES) {
      expect(canAccess("admin", module)).toBe(true);
    }
  });

  it("doctor accede a módulos clínicos y operativos, pero no a módulos sensibles ni billing", () => {
    const allowed = new Set<ModuleKey>([
      "dashboard",
      "patients",
      "appointments",
      "consultations",
      "medications",
    ]);
    for (const module of ALL_MODULES) {
      expect(canAccess("doctor", module)).toBe(allowed.has(module));
    }
  });

  it("receptionist accede a pacientes/citas/billing, pero no a módulos clínicos ni sensibles", () => {
    const allowed = new Set<ModuleKey>([
      "dashboard",
      "patients",
      "appointments",
      "billing",
    ]);
    for (const module of ALL_MODULES) {
      expect(canAccess("receptionist", module)).toBe(allowed.has(module));
    }
  });

  it("módulos sensibles (doctors, reports, audit, settings) están restringidos exclusivamente a admin", () => {
    const sensitiveModules: ModuleKey[] = ["doctors", "reports", "audit", "settings"];
    for (const mod of sensitiveModules) {
      expect(canAccess("admin", mod)).toBe(true);
      expect(canAccess("doctor", mod)).toBe(false);
      expect(canAccess("receptionist", mod)).toBe(false);
    }
  });

  it("MODULE_ROLES es consistente con canAccess (matriz completa)", () => {
    for (const module of ALL_MODULES) {
      for (const role of ROLES) {
        expect(canAccess(role, module)).toBe(MODULE_ROLES[module].includes(role));
      }
    }
  });

  it("ningún módulo queda sin rol asignado", () => {
    for (const module of ALL_MODULES) {
      expect(MODULE_ROLES[module].length).toBeGreaterThan(0);
    }
  });
});
