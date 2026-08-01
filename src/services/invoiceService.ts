import { apiCall } from "./api";
import type { Invoice, InvoiceDetail, CreateInvoiceInput } from "@/types/billing";

export const invoiceService = {
  getAll: () => apiCall<Invoice[]>("get_invoices"),
  getById: (id: string) => apiCall<Invoice>("get_invoice", { id }),
  getDetail: (id: string) => apiCall<InvoiceDetail>("get_invoice_detail", { id }),
  create: (input: CreateInvoiceInput) => apiCall<Invoice>("create_invoice", { input }),
  updateStatus: (id: string, status: string, paymentMethod?: string) =>
    apiCall<void>("update_invoice_status", { id, status, paymentMethod: paymentMethod || null }),
  generatePdf: (id: string) => apiCall<string>("generate_invoice_pdf", { id }),
};
