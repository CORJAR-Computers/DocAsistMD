#![allow(dead_code)]
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::{CreatePatientInput, Patient};
use chrono::Utc;
use rsfbclient::{Execute, Queryable};
use uuid::Uuid;

// Split patient columns into two queries to stay within rsfbclient's tuple limit
type PatientPart1 = (
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
);

type PatientPart2 = (
    Option<String>,
    Option<String>,
    Option<String>,
    String,
    String,
);

fn merge_patient(p1: PatientPart1, p2: PatientPart2) -> Patient {
    Patient {
        id: p1.0,
        first_name: p1.1,
        last_name: p1.2,
        document_id: p1.3,
        document_type: p1.4,
        date_of_birth: p1.5,
        gender: p1.6,
        phone: p1.7,
        email: p1.8,
        address: p1.9,
        blood_type: p1.10,
        allergies: p1.11,
        emergency_contact_name: p1.12,
        emergency_contact_phone: p1.13,
        insurance_provider: p1.14,
        insurance_policy_number: p2.0,
        insurance_expiry_date: p2.1,
        notes: p2.2,
        created_at: p2.3,
        updated_at: p2.4,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<Patient>, AppError> {
    let rows1: Vec<PatientPart1> = conn
        .query(
            "SELECT id, first_name, last_name, document_id, document_type, date_of_birth,
                gender, phone, email, address, blood_type, allergies,
                emergency_contact_name, emergency_contact_phone, insurance_provider
         FROM patients ORDER BY last_name, first_name",
            (),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut patients = Vec::with_capacity(rows1.len());
    for r1 in rows1 {
        let id = &r1.0;
        let rows2: Vec<PatientPart2> = conn.query(
            "SELECT insurance_policy_number, insurance_expiry_date, notes, created_at, updated_at
             FROM patients WHERE id = ?",
            (id,),
        ).map_err(|e| AppError::Database(e.to_string()))?;
        if let Some(r2) = rows2.into_iter().next() {
            patients.push(merge_patient(r1, r2));
        }
    }
    Ok(patients)
}

pub fn get_by_id(conn: &mut DbConnection, id: &str) -> Result<Patient, AppError> {
    let rows1: Vec<PatientPart1> = conn
        .query(
            "SELECT id, first_name, last_name, document_id, document_type, date_of_birth,
                gender, phone, email, address, blood_type, allergies,
                emergency_contact_name, emergency_contact_phone, insurance_provider
         FROM patients WHERE id = ?",
            (id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let r1 = rows1
        .into_iter()
        .next()
        .ok_or(AppError::NotFound(format!("Patient {} not found", id)))?;

    let rows2: Vec<PatientPart2> = conn
        .query(
            "SELECT insurance_policy_number, insurance_expiry_date, notes, created_at, updated_at
         FROM patients WHERE id = ?",
            (id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let r2 = rows2
        .into_iter()
        .next()
        .ok_or(AppError::NotFound(format!("Patient {} not found", id)))?;
    Ok(merge_patient(r1, r2))
}

pub fn create(conn: &mut DbConnection, input: CreatePatientInput) -> Result<Patient, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Insert first 15 columns to stay within rsfbclient parameter tuple limit
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

    // Set remaining columns via UPDATE
    conn.execute(
        "UPDATE patients SET
            insurance_policy_number = ?,
            insurance_expiry_date = ?,
            notes = ?,
            created_at = ?,
            updated_at = ?
         WHERE id = ?",
        (
            &input.insurance_policy_number,
            &input.insurance_expiry_date,
            &input.notes,
            &now,
            &now,
            &id,
        ),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, &id)
}

pub fn search(conn: &mut DbConnection, query: &str) -> Result<Vec<Patient>, AppError> {
    let search_pattern = format!("%{}%", query);
    let rows1: Vec<PatientPart1> = conn
        .query(
            "SELECT id, first_name, last_name, document_id, document_type, date_of_birth,
                gender, phone, email, address, blood_type, allergies,
                emergency_contact_name, emergency_contact_phone, insurance_provider
         FROM patients
         WHERE first_name LIKE ? OR last_name LIKE ? OR document_id LIKE ?
               OR phone LIKE ? OR email LIKE ?
         ORDER BY last_name, first_name",
            (
                &search_pattern,
                &search_pattern,
                &search_pattern,
                &search_pattern,
                &search_pattern,
            ),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut patients = Vec::with_capacity(rows1.len());
    for r1 in rows1 {
        let id = &r1.0;
        let rows2: Vec<PatientPart2> = conn.query(
            "SELECT insurance_policy_number, insurance_expiry_date, notes, created_at, updated_at
             FROM patients WHERE id = ?",
            (id,),
        ).map_err(|e| AppError::Database(e.to_string()))?;
        if let Some(r2) = rows2.into_iter().next() {
            patients.push(merge_patient(r1, r2));
        }
    }
    Ok(patients)
}

pub fn update(conn: &mut DbConnection, id: &str, input: CreatePatientInput) -> Result<Patient, AppError> {
    let now = Utc::now().to_rfc3339();

    // Update first 14 columns + id (within rsfbclient's 15-param limit)
    conn.execute(
        "UPDATE patients SET
            first_name = ?, last_name = ?, document_id = ?, document_type = ?,
            date_of_birth = ?, gender = ?, phone = ?, email = ?, address = ?,
            blood_type = ?, allergies = ?, emergency_contact_name = ?,
            emergency_contact_phone = ?, insurance_provider = ?
         WHERE id = ?",
        (
            &input.first_name, &input.last_name, &input.document_id, &input.document_type,
            &input.date_of_birth, &input.gender, &input.phone, &input.email, &input.address,
            &input.blood_type, &input.allergies, &input.emergency_contact_name,
            &input.emergency_contact_phone, &input.insurance_provider, &id,
        ),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // Update remaining columns
    conn.execute(
        "UPDATE patients SET
            insurance_policy_number = ?,
            insurance_expiry_date = ?,
            notes = ?,
            updated_at = ?
         WHERE id = ?",
        (
            &input.insurance_policy_number,
            &input.insurance_expiry_date,
            &input.notes,
            &now,
            &id,
        ),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, id)
}

pub fn delete(conn: &mut DbConnection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM patients WHERE id = ?", (id,))
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}
