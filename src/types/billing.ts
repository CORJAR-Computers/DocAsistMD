export interface Invoice {
  id: string;
  appointmentId: string | null;
  patientId: string;
  patientName: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateInvoiceInput {
  patientId: string;
  appointmentId?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod?: string | null;
  dueDate?: string | null;
}

export interface InvoiceDetail {
  id: string;
  appointmentId: string | null;
  patientId: string;
  patientName: string;
  patientDocument: string | null;
  patientPhone: string | null;
  patientEmail: string | null;
  patientAddress: string | null;
  doctorName: string | null;
  appointmentDateTime: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  dueDate: string | null;
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
