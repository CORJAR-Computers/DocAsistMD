#![allow(dead_code)]
use serde::{Deserialize, Serialize};

// Macro to apply camelCase serde to all models
// Output structs serialize to camelCase for the frontend
// Input structs deserialize from camelCase from the frontend

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Patient {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub document_id: String,
    pub document_type: String,
    pub date_of_birth: String,
    pub gender: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub insurance_provider: Option<String>,
    pub insurance_policy_number: Option<String>,
    pub insurance_expiry_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePatientInput {
    pub first_name: String,
    pub last_name: String,
    pub document_id: String,
    pub document_type: String,
    pub date_of_birth: String,
    pub gender: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub insurance_provider: Option<String>,
    pub insurance_policy_number: Option<String>,
    pub insurance_expiry_date: Option<String>,
    pub notes: Option<String>,
}

// ── Doctor ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Doctor {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub specialty: String,
    pub license_number: String,
    pub phone: String,
    pub email: String,
    pub schedule_start: String,
    pub schedule_end: String,
    pub working_days: String, // JSON array stored as string
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDoctorInput {
    pub first_name: String,
    pub last_name: String,
    pub specialty: String,
    pub license_number: String,
    pub phone: String,
    pub email: String,
    pub schedule_start: String,
    pub schedule_end: String,
}

// ── Appointment ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Appointment {
    pub id: String,
    pub patient_id: String,
    pub doctor_id: String,
    pub date_time: String,
    pub duration_minutes: i32,
    pub status: String,
    pub appointment_type: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppointmentWithNames {
    pub id: String,
    pub patient_id: String,
    pub patient_name: String,
    pub doctor_id: String,
    pub doctor_name: String,
    pub date_time: String,
    pub duration_minutes: i32,
    pub status: String,
    pub appointment_type: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAppointmentInput {
    pub patient_id: String,
    pub doctor_id: String,
    pub date_time: String,
    pub duration_minutes: i32,
    pub appointment_type: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
}

// ── User / Auth ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub last_login: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub user: User,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserInput {
    pub username: String,
    pub password: String,
    pub full_name: String,
    pub email: String,
    pub role: String,
}

// ── Consultation ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Consultation {
    pub id: String,
    pub appointment_id: String,
    pub patient_id: String,
    pub doctor_id: String,
    pub vital_signs: Option<String>,
    pub symptoms: Option<String>,
    pub diagnosis: Option<String>,
    pub cie10_code: Option<String>,
    pub treatment_plan: Option<String>,
    pub clinical_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConsultationInput {
    pub appointment_id: String,
    pub vital_signs: Option<String>,
    pub symptoms: Option<String>,
    pub diagnosis: Option<String>,
    pub cie10_code: Option<String>,
    pub treatment_plan: Option<String>,
    pub clinical_notes: Option<String>,
}

// ── Medication ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Medication {
    pub id: String,
    pub name: String,
    pub active_ingredient: String,
    pub presentation: String,
    pub concentration: Option<String>,
    pub current_stock: i32,
    pub minimum_stock: i32,
    pub unit_price: f64,
    pub expiry_date: Option<String>,
    pub supplier: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ── Invoice ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    pub id: String,
    pub appointment_id: Option<String>,
    pub patient_id: String,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub total: f64,
    pub status: String,
    pub payment_method: Option<String>,
    pub due_date: Option<String>,
    pub paid_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceWithPatient {
    pub id: String,
    pub appointment_id: Option<String>,
    pub patient_id: String,
    pub patient_name: String,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub total: f64,
    pub status: String,
    pub payment_method: Option<String>,
    pub due_date: Option<String>,
    pub paid_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInvoiceInput {
    pub patient_id: String,
    pub appointment_id: Option<String>,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub total: f64,
    pub payment_method: Option<String>,
    pub due_date: Option<String>,
}

// ── Prescription ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Prescription {
    pub id: String,
    pub consultation_id: String,
    pub medication_id: String,
    pub dosage: String,
    pub frequency: String,
    pub duration: String,
    pub instructions: Option<String>,
    pub created_at: String,
}
// ── Audit Log ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogEntry {
    pub id: String,
    pub user_id: Option<String>,
    pub action: String,
    pub table_name: String,
    pub record_id: Option<String>,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePrescriptionInput {
    pub consultation_id: String,
    pub medication_id: String,
    pub dosage: String,
    pub frequency: String,
    pub duration: String,
    pub instructions: Option<String>,
}

// ── Medication Input ──
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMedicationInput {
    pub name: String,
    pub active_ingredient: String,
    pub presentation: String,
    pub concentration: Option<String>,
    pub current_stock: i32,
    pub minimum_stock: i32,
    pub unit_price: f64,
    pub expiry_date: Option<String>,
    pub supplier: Option<String>,
}
