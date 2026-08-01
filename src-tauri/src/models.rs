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
