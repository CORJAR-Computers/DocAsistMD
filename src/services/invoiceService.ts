import { apiCall } from "./api";
import type { Invoice, InvoiceDetail, CreateInvoiceInput } from "@/types/billing";

export const invoiceService = {
  getAll: () => apiCall<Invoice[]>("get_invoices"),
  getById: (id: string) => apiCall<Invoice>("get_invoice", { id }),
  getDetail: (id: string) => apiCall<InvoiceDetail>("get_invoice_detail", { id }),
  create: (input: CreateInvoiceInput, userId?: string) =>
    apiCall<Invoice>("create_invoice", userId ? { input, userId } : { input }),
  updateStatus: (id: string, status: string, paymentMethod?: string, userId?: string) => {
    const args: Record<string, string | null> = { id, status, paymentMethod: paymentMethod || null };
    if (userId) args.userId = userId;
    return apiCall<void>("update_invoice_status", args);
  },
  generatePdf: (id: string, outDir?: string) =>
    apiCall<string>("generate_invoice_pdf", outDir ? { id, outDir } : { id }),
};
