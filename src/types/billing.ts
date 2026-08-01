export interface Invoice {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "card" | "transfer" | "insurance";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Anulada",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  insurance: "Seguro",
};

export interface CreateInvoiceInput {
  appointmentId: string | null;
  patientId: string;
  subtotal: number;
  taxRate: number;
  paymentMethod: PaymentMethod | null;
  dueDate: string | null;
}
