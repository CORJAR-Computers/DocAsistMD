import { apiCall } from "./api";
import type { Invoice, CreateInvoiceInput } from "@/types/billing";

export const invoiceService = {
  getAll: () => apiCall<Invoice[]>("get_invoices"),
  getById: (id: string) => apiCall<Invoice>("get_invoice", { id }),
  create: (input: CreateInvoiceInput) => apiCall<Invoice>("create_invoice", { input }),
  updateStatus: (id: string, status: string, paymentMethod?: string) =>
    apiCall<void>("update_invoice_status", { id, status, paymentMethod: paymentMethod || null }),
};
