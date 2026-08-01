import { apiCall } from "./api";
import type { AuditLogEntry } from "@/types/audit";

export interface AuditLogFilters {
  tableName?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const auditService = {
  getAuditLog: (filters?: AuditLogFilters) => {
    const args: Record<string, string | number> = {};
    if (filters?.tableName) args.tableName = filters.tableName;
    if (filters?.userId) args.userId = filters.userId;
    if (filters?.action) args.action = filters.action;
    if (filters?.dateFrom) args.dateFrom = filters.dateFrom;
    if (filters?.dateTo) args.dateTo = filters.dateTo;
    if (filters?.limit) args.limit = filters.limit;
    if (filters?.offset !== undefined) args.offset = filters.offset;
    return apiCall<AuditLogEntry[]>("get_audit_log", args);
  },

  exportLog: (
    format: "csv" | "excel" | "pdf",
    filters?: Omit<AuditLogFilters, "limit" | "offset">,
    outDir?: string
  ) => {
    const args: Record<string, string> = { format };
    if (filters?.tableName) args.tableName = filters.tableName;
    if (filters?.userId) args.userId = filters.userId;
    if (filters?.action) args.action = filters.action;
    if (filters?.dateFrom) args.dateFrom = filters.dateFrom;
    if (filters?.dateTo) args.dateTo = filters.dateTo;
    if (outDir) args.outDir = outDir;
    return apiCall<string>("export_audit_log", args);
  },
};
