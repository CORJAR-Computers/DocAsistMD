import { apiCall } from "./api";
import type { Medication, CreateMedicationInput, InventoryMovement, CreateMovementInput } from "@/types/medication";

export const medicationService = {
  getAll: () => apiCall<Medication[]>("get_medications"),
  getById: (id: string) => apiCall<Medication>("get_medication", { id }),
  create: (input: CreateMedicationInput) => apiCall<Medication>("create_medication", { input }),
  getLowStock: () => apiCall<Medication[]>("get_low_stock_medications"),
  getExpiring: (days: number) => apiCall<Medication[]>("get_expiring_medications", { days }),
  getMovements: (medicationId?: string) =>
    apiCall<InventoryMovement[]>("get_inventory_movements", medicationId ? { medicationId } : {}),
  recordMovement: (input: CreateMovementInput) => apiCall<InventoryMovement>("record_medication_movement", { input }),
};
