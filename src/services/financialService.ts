import { apiCall } from "./api";

export interface RevenueRow {
  invoiceId: string;
  patientName: string;
  doctorName: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface RevenueByDoctor {
  doctorName: string;
  invoiceCount: number;
  total: number;
}

export interface RevenueReport {
  periodStart: string;
  periodEnd: string;
  totalInvoices: number;
  totalRevenue: number;
  rows: RevenueRow[];
  byDoctor: RevenueByDoctor[];
}

export const financialService = {
  getRevenueReport: (startDate: string, endDate: string) =>
    apiCall<RevenueReport>("get_revenue_report", { startDate, endDate }),
  generatePdf: (startDate: string, endDate: string, outDir?: string) =>
    apiCall<string>("generate_revenue_pdf", outDir ? { startDate, endDate, outDir } : { startDate, endDate }),
  generateExcel: (startDate: string, endDate: string, outDir?: string) =>
    apiCall<string>("generate_revenue_excel", outDir ? { startDate, endDate, outDir } : { startDate, endDate }),
};
