export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // Inventario
  dispensar_medicamento: "Dispensación",
  reversar_dispensacion: "Reversión",
  registrar_entrada: "Entrada de Inventario",
  registrar_salida: "Salida de Inventario",
  // Pacientes
  crear_paciente: "Crear Paciente",
  editar_paciente: "Editar Paciente",
  eliminar_paciente: "Eliminar Paciente",
  // Citas
  crear_cita: "Crear Cita",
  editar_cita: "Editar Cita",
  // Facturas
  crear_factura: "Crear Factura",
  editar_factura: "Editar Factura",
};

export const AUDIT_TABLE_LABELS: Record<string, string> = {
  prescriptions: "Recetas",
  inventory_movements: "Movimientos de Inventario",
  patients: "Pacientes",
  appointments: "Citas",
  invoices: "Facturas",
};
