#![allow(dead_code)]
use crate::errors::AppError;
use crate::models::{Patient, CreatePatientInput};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::Utc;

type PatientRow = (
    String, String, String, String, String, String, String, String, String, String,
    Option<String>, Option<String>, Option<String>, Option<String>, Option<String>,
    Option<String>, Option<String>, Option<String>, String, String,
);

fn map_patient_row(row: PatientRow) -> Patient {
    Patient {
        id: row.0, first_name: row.1, last_name: row.2, document_id: row.3, document_type: row.4,
        date_of_birth: row.5, gender: row.6, phone: row.7, email: row.8, address: row.9,
        blood_type: row.10, allergies: row.11, emergency_contact_name: row.12,
        emergency_contact_phone: row.13, insurance_provider: row.14,
        insurance_policy_number: row.15, insurance_expiry_date: row.16, notes: row.17,
        created_at: row.18, updated_at: row.19,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<Patient>, AppError> {
    let rows: Vec<PatientRow> = conn.query(
        "SELECT id, first_name, last_name, document_id, document_type, date_of_birth,
                gender, phone, email, address, blood_type, allergies,
                emergency_contact_name, emergency_contact_phone, insurance_provider,
                insurance_policy_number, insurance_expiry_date, notes, created_at, updated_at
         FROM patients ORDER BY last_name, first_name",
        (),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(map_patient_row).collect())
}

pub fn get_by_id(conn: &mut DbConnection, id: &str) -> Result<Patient, AppError> {
    let rows: Vec<PatientRow> = conn.query(
        "SELECT id, first_name, last_name, document_id, document_type, date_of_birth,
                gender, phone, email, address, blood_type, allergies,
                emergency_contact_name, emergency_contact_phone, insurance_provider,
                insurance_policy_number, insurance_expiry_date, notes, created_at, updated_at
         FROM patients WHERE id = ?",
        (id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    rows.into_iter().map(map_patient_row).next().ok_or(AppError::NotFound(format!("Patient {} not found", id)))
}

pub fn create(conn: &mut DbConnection, input: CreatePatientInput) -> Result<Patient, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Insert first 15 columns to avoid the 15-tuple parameter limit in rsfbclient
    conn.execute(
        "INSERT INTO patients (
            id, first_name, last_name, document_id, document_type,
            date_of_birth, gender, phone, email, address,
            blood_type, allergies, emergency_contact_name, emergency_contact_phone, insurance_provider
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            &id, &input.first_name, &input.last_name, &input.document_id, &input.document_type,
            &input.date_of_birth, &input.gender, &input.phone, &input.email, &input.address,
            &input.blood_type, &input.allergies, &input.emergency_contact_name,
            &input.emergency_contact_phone, &input.insurance_provider,
        ),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    // Update the remaining columns
    conn.execute(
        "UPDATE patients SET
            insurance_policy_number = ?,
            insurance_expiry_date = ?,
            notes = ?,
            created_at = ?,
            updated_at = ?
         WHERE id = ?",
        (
            &input.insurance_policy_number, &input.insurance_expiry_date, &input.notes,
            &now, &now, &id,
        ),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, &id)
}

pub fn search(conn: &mut DbConnection, query: &str) -> Result<Vec<Patient>, AppError> {
    let search_pattern = format!("%{}%", query);
    let rows: Vec<PatientRow> = conn.query(
        "SELECT id, first_name, last_name, document_id, document_type, date_of_birth,
                gender, phone, email, address, blood_type, allergies,
                emergency_contact_name, emergency_contact_phone, insurance_provider,
                insurance_policy_number, insurance_expiry_date, notes, created_at, updated_at
         FROM patients
         WHERE first_name LIKE ? OR last_name LIKE ? OR document_id LIKE ?
               OR phone LIKE ? OR email LIKE ?
         ORDER BY last_name, first_name",
        (&search_pattern, &search_pattern, &search_pattern, &search_pattern, &search_pattern),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(map_patient_row).collect())
}

pub fn delete(conn: &mut DbConnection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM patients WHERE id = ?", (id,))
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}
