import { apiCall } from "./api";
import type { Medication } from "@/types/medication";

export const medicationService = {
  getAll: () => apiCall<Medication[]>("get_medications"),
  getById: (id: string) => apiCall<Medication>("get_medication", { id }),
  create: (input: Medication) => apiCall<Medication>("create_medication", { input }),
  updateStock: (id: string, quantity: number) => apiCall<void>("update_medication_stock", { id, quantity }),
  getLowStock: () => apiCall<Medication[]>("get_low_stock_medications"),
};
