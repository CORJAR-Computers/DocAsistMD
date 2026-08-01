export interface Medication {
  id: string; name: string; activeIngredient: string; presentation: string;
  concentration: string; currentStock: number; minimumStock: number;
  unitPrice: number; expiryDate: string; supplier: string;
  createdAt: string; updatedAt: string;
}

export interface CreateMedicationInput {
  name: string; activeIngredient: string; presentation: string;
  concentration: string; currentStock: number; minimumStock: number;
  unitPrice: number; expiryDate: string; supplier: string;
}
