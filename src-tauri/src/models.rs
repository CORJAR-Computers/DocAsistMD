#![allow(dead_code)]
use serde::{Deserialize, Serialize};
// ── Patient ──
#[derive(Debug, Clone, Serialize, Deserialize)]
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

// ── Appointment ──
#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub user: User,
    pub token: String,
}

// ── Update Patient Input ──
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePatientInput {
    pub id: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub document_id: Option<String>,
    pub document_type: Option<String>,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub insurance_provider: Option<String>,
    pub insurance_policy_number: Option<String>,
    pub insurance_expiry_date: Option<String>,
    pub notes: Option<String>,
}

// ── Create Doctor Input ──
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDoctorInput {
    pub first_name: String,
    pub last_name: String,
    pub specialty: String,
    pub license_number: String,
    pub phone: String,
    pub email: String,
    pub schedule_start: String,
    pub schedule_end: String,
    pub working_days: String,
}

// ── Update Doctor Input ──
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDoctorInput {
    pub id: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub specialty: Option<String>,
    pub license_number: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub schedule_start: Option<String>,
    pub schedule_end: Option<String>,
    pub working_days: Option<String>,
    pub status: Option<String>,
}

// ── Consultation (EHR) ──
#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub struct CreateConsultationInput {
    pub appointment_id: String,
    pub patient_id: String,
    pub doctor_id: String,
    pub vital_signs: Option<String>,
    pub symptoms: Option<String>,
    pub diagnosis: Option<String>,
    pub cie10_code: Option<String>,
    pub treatment_plan: Option<String>,
    pub clinical_notes: Option<String>,
}

// ── Prescription ──
#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePrescriptionInput {
    pub consultation_id: String,
    pub medication_id: String,
    pub dosage: String,
    pub frequency: String,
    pub duration: String,
    pub instructions: Option<String>,
}

// ── Invoice ──
#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub struct CreateInvoiceInput {
    pub appointment_id: Option<String>,
    pub patient_id: String,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub payment_method: Option<String>,
    pub due_date: Option<String>,
}

// ── Medication ──
#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

// ── Audit Log ──
#[derive(Debug, Clone, Serialize, Deserialize)]
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

// ── Create User Input ──
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserInput {
    pub username: String,
    pub password: String,
    pub full_name: String,
    pub email: String,
    pub role: String,
}

// ── Dashboard Stats ──
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_patients: i32,
    pub today_appointments: i32,
    pub monthly_revenue: f64,
    pub attendance_rate: f64,
}
