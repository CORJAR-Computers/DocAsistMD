export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  concentration: string | null;
  currentStock: number;
  minimumStock: number;
  unitPrice: number;
  expiryDate: string | null;
  supplier: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicationInput {
  name: string;
  activeIngredient: string;
  presentation: string;
  concentration?: string | null;
  currentStock: number;
  minimumStock: number;
  unitPrice: number;
  expiryDate?: string | null;
  supplier?: string | null;
}

export type MovementType = "in" | "out";

export interface InventoryMovement {
  id: string;
  medicationId: string;
  medicationName: string;
  movementType: MovementType;
  quantity: number;
  reason: string | null;
  reference: string | null;
  createdAt: string;
}

export interface CreateMovementInput {
  medicationId: string;
  movementType: MovementType;
  quantity: number;
  reason?: string | null;
  reference?: string | null;
}
