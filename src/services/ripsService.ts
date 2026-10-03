/**
 * Servicio de Generación de RIPS en formato JSON conforme a la
 * Resolución 948 de 2026 / Resolución 2275 de 2023 del Ministerio de Salud y Protección Social de Colombia.
 * Este archivo JSON es el soporte obligatorio de la Factura Electrónica de Venta (FEV) en salud
 * ante el Mecanismo Único de Validación (MUV) de MinSalud para la obtención del CUV.
 */

import type { Consultation } from "./consultationService";
import type { Patient } from "@/types/patient";
import type { Appointment } from "@/types/appointment";
import type { Invoice } from "@/types/billing";

export interface RipsConsultationServiceItem {
  codPrestador: string;
  fechaInicioAtencion: string;
  numAutorizacion: string | null;
  codConsulta: string; // Código CUPS (ej: 890201)
  modalidadGrupoServicioTecSal: string; // 01: Intramural, 02: Extramural, 03: Telemedicina
  grupoServicios: string; // 01: Consulta externa
  codServicio: number; // 328: Medicina general
  finalidadTecnologiaSalud: string; // 10: No aplica / 15: Diagnóstico
  causaMotivoAtencion: string; // 38: Enfermedad general
  codDiagnosticoPrincipal: string; // Código CIE-10 (ej: I10)
  codDiagnosticoRelacionado1: string | null;
  codDiagnosticoRelacionado2: string | null;
  codDiagnosticoRelacionado3: string | null;
  tipoDiagnosticoPrincipal: string; // 01: Impresión, 02: Confirmado nuevo, 03: Confirmado repetido
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  vrServicio: number;
  conceptoRecaudo: string; // 05: Particular / No aplica copago
  valorPagoModerador: number;
  numFEVPagoModerador: string | null;
  consecutivo: number;
}

export interface RipsUserItem {
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  tipoUsuario: string; // 01: Contributivo cotizante, 02: Contributivo beneficiario, 05: Particular
  fechaNacimiento: string;
  codSexo: "M" | "F" | "I";
  codPaisOrigen: string; // 170: Colombia
  codPaisResidencia: string; // 170: Colombia
  codMunicipioResidencia: string; // 11001: Bogotá D.C. u otro DANE
  codZonaTerritorialResidencia: "01" | "02"; // 01: Urbana, 02: Rural
  incapacidad: "SI" | "NO";
  consecutivo: number;
  servicios: {
    consultas: RipsConsultationServiceItem[];
  };
}

export interface RipsPackage {
  numDocumentoIdObligado: string; // NIT o Cédula del prestador
  numFactura: string;
  tipoNota: string | null;
  numNota: string | null;
  usuarios: RipsUserItem[];
}

export interface GenerateRipsInput {
  prestadorNitOrDocument: string;
  prestadorCodigoReps: string;
  facturaNumero?: string;
  consultations: Consultation[];
  patients: Patient[];
  appointments: Appointment[];
  invoices?: Invoice[];
}

/**
 * Mapea el tipo de documento interno al estándar RIPS MinSalud
 */
export function mapDocumentTypeToRips(docType: string): string {
  const norm = docType.toUpperCase();
  if (norm === "CC" || norm === "TI" || norm === "CE" || norm === "PA" || norm === "RC") {
    return norm;
  }
  if (norm === "PPT") return "PT"; // Permiso por Protección Temporal en RIPS
  if (norm === "PP") return "PA"; // Pasaporte
  return "CC";
}

/**
 * Genera el paquete RIPS JSON oficial a partir de las atenciones médicas registradas
 */
export function buildRipsPackage({
  prestadorNitOrDocument,
  prestadorCodigoReps,
  facturaNumero = "FEV-001",
  consultations,
  patients,
  appointments,
  invoices = [],
}: GenerateRipsInput): RipsPackage {
  const patientMap = new Map(patients.map((p) => [p.id, p]));
  const appointmentMap = new Map(appointments.map((a) => [a.id, a]));
  const invoiceByAppointmentMap = new Map(
    invoices.filter((i) => i.appointmentId).map((i) => [i.appointmentId!, i])
  );

  // Agrupar consultas por paciente
  const consultationsByPatient = new Map<string, Consultation[]>();
  for (const c of consultations) {
    const list = consultationsByPatient.get(c.patientId) || [];
    list.push(c);
    consultationsByPatient.set(c.patientId, list);
  }

  const usuarios: RipsUserItem[] = [];
  let userConsecutive = 1;
  let serviceConsecutive = 1;

  for (const [patientId, consultList] of consultationsByPatient.entries()) {
    const patient = patientMap.get(patientId);
    if (!patient) continue;

    const ripsDocType = mapDocumentTypeToRips(patient.documentType);
    const ripsSexo = patient.gender === "F" ? "F" : "M";
    const birthDate = patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "1990-01-01";

    const consultaItems: RipsConsultationServiceItem[] = [];

    for (const consult of consultList) {
      const appt = appointmentMap.get(consult.appointmentId);
      const inv = appt ? invoiceByAppointmentMap.get(appt.id) : undefined;
      const valor = inv ? inv.total : 100000;

      // Código CUPS por defecto para medicina general o telemedicina
      const isTelemedicine = appt?.appointmentType === "telemedicine";
      const codCups = isTelemedicine ? "890105" : "890201";
      const modalidad = isTelemedicine ? "03" : "01";

      const cie10 = (consult.cie10Code || "Z00.0").toUpperCase().trim();
      const fechaAtencion = consult.createdAt ? consult.createdAt.slice(0, 16).replace("T", " ") : new Date().toISOString().slice(0, 16).replace("T", " ");

      consultaItems.push({
        codPrestador: prestadorCodigoReps || "110010000001",
        fechaInicioAtencion: fechaAtencion,
        numAutorizacion: null,
        codConsulta: codCups,
        modalidadGrupoServicioTecSal: modalidad,
        grupoServicios: "01",
        codServicio: 328,
        finalidadTecnologiaSalud: "10",
        causaMotivoAtencion: "38",
        codDiagnosticoPrincipal: cie10,
        codDiagnosticoRelacionado1: null,
        codDiagnosticoRelacionado2: null,
        codDiagnosticoRelacionado3: null,
        tipoDiagnosticoPrincipal: "01",
        tipoDocumentoIdentificacion: ripsDocType,
        numDocumentoIdentificacion: patient.documentId,
        vrServicio: valor,
        conceptoRecaudo: "05",
        valorPagoModerador: 0,
        numFEVPagoModerador: null,
        consecutivo: serviceConsecutive++,
      });
    }

    if (consultaItems.length > 0) {
      usuarios.push({
        tipoDocumentoIdentificacion: ripsDocType,
        numDocumentoIdentificacion: patient.documentId,
        tipoUsuario: "05", // Particular
        fechaNacimiento: birthDate,
        codSexo: ripsSexo,
        codPaisOrigen: "170",
        codPaisResidencia: "170",
        codMunicipioResidencia: "11001",
        codZonaTerritorialResidencia: "01",
        incapacidad: "NO",
        consecutivo: userConsecutive++,
        servicios: {
          consultas: consultaItems,
        },
      });
    }
  }

  return {
    numDocumentoIdObligado: prestadorNitOrDocument || "900000000",
    numFactura: facturaNumero,
    tipoNota: null,
    numNota: null,
    usuarios,
  };
}

/**
 * Descarga en el navegador / cliente un archivo JSON con formato RIPS oficial
 */
export function downloadRipsJson(data: RipsPackage, filename = `RIPS_${new Date().toISOString().slice(0, 10)}.json`): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
