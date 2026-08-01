export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  documentType: DocumentType;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string | null;
  address: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = "CC" | "CE" | "TI" | "PP" | "NIT" | "RC";
export type Gender = "M" | "F" | "O";

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  documentId: string;
  documentType: DocumentType;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string;
  address: string;
  bloodType?: string;
  allergies?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  notes?: string;
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {
  id: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: "Cedula de Ciudadania",
  CE: "Cedula de Extranjeria",
  TI: "Tarjeta de Identidad",
  PP: "Pasaporte",
  NIT: "NIT",
  RC: "Registro Civil",
};

export const GENDER_LABELS: Record<Gender, string> = {
  M: "Masculino",
  F: "Femenino",
  O: "Otro",
};
