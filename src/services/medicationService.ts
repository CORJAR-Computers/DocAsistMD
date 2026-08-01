import { apiCall } from "./api";
import type { Medication, CreateMedicationInput, InventoryMovement, CreateMovementInput, MovementType, MovementDetail } from "@/types/medication";

export const medicationService = {
  getAll: () => apiCall<Medication[]>("get_medications"),
  getById: (id: string) => apiCall<Medication>("get_medication", { id }),
  create: (input: CreateMedicationInput) => apiCall<Medication>("create_medication", { input }),
  getLowStock: () => apiCall<Medication[]>("get_low_stock_medications"),
  getExpiring: (days: number) => apiCall<Medication[]>("get_expiring_medications", { days }),
  getMovements: (filters?: {
    medicationId?: string;
    movementType?: MovementType | "";
    origin?: "receta" | "manual" | "reversion" | "";
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const args: Record<string, string> = {};
    if (filters?.medicationId) args.medicationId = filters.medicationId;
    if (filters?.movementType) args.movementType = filters.movementType;
    if (filters?.origin) args.origin = filters.origin;
    if (filters?.dateFrom) args.dateFrom = filters.dateFrom;
    if (filters?.dateTo) args.dateTo = filters.dateTo;
    return apiCall<InventoryMovement[]>("get_inventory_movements", args);
  },
  recordMovement: (input: CreateMovementInput, userId?: string) =>
    apiCall<InventoryMovement>("record_medication_movement", userId ? { input, userId } : { input }),
  getDispensedMovements: (consultationId: string) =>
    apiCall<InventoryMovement[]>("get_consultation_dispensed_movements", { consultationId }),
  getMovementDetail: (movementId: string) =>
    apiCall<MovementDetail>("get_movement_detail", { movementId }),
  undoDispense: (movementId: string, userId?: string) =>
    apiCall<void>("undo_prescription_dispense", userId ? { movementId, userId } : { movementId }),
  exportMovements: (
    format: "csv" | "excel",
    filters?: {
      medicationId?: string;
      movementType?: MovementType | "";
      origin?: "receta" | "manual" | "reversion" | "";
      dateFrom?: string;
      dateTo?: string;
    },
    outDir?: string
  ) => {
    const args: Record<string, string> = { format };
    if (filters?.medicationId) args.medicationId = filters.medicationId;
    if (filters?.movementType) args.movementType = filters.movementType;
    if (filters?.origin) args.origin = filters.origin;
    if (filters?.dateFrom) args.dateFrom = filters.dateFrom;
    if (filters?.dateTo) args.dateTo = filters.dateTo;
    if (outDir) args.outDir = outDir;
    return apiCall<string>("export_inventory_movements", args);
  },
};
