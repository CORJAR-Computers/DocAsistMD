use crate::errors::AppError;
use crate::models::{Consultation, CreateConsultationInput};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::Utc;

type ConsultationRow = (
    String, String, String, String, Option<String>, Option<String>,
    Option<String>, Option<String>, Option<String>, Option<String>, String, String,
);

fn map_row(row: ConsultationRow) -> Consultation {
    Consultation {
        id: row.0, appointment_id: row.1, patient_id: row.2, doctor_id: row.3,
        vital_signs: row.4, symptoms: row.5, diagnosis: row.6, cie10_code: row.7,
        treatment_plan: row.8, clinical_notes: row.9, created_at: row.10, updated_at: row.11,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<Consultation>, AppError> {
    let rows: Vec<ConsultationRow> = conn.query(
        "SELECT id, appointment_id, patient_id, doctor_id, vital_signs, symptoms,
                diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at
         FROM consultations ORDER BY created_at DESC",
        (),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

pub fn get_by_id(conn: &mut DbConnection, id: &str) -> Result<Consultation, AppError> {
    let rows: Vec<ConsultationRow> = conn.query(
        "SELECT id, appointment_id, patient_id, doctor_id, vital_signs, symptoms,
                diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at
         FROM consultations WHERE id = ?",
        (id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    rows.into_iter().map(map_row).next()
        .ok_or(AppError::NotFound(format!("Consulta {} no encontrada", id)))
}

pub fn get_by_patient(conn: &mut DbConnection, patient_id: &str) -> Result<Vec<Consultation>, AppError> {
    let rows: Vec<ConsultationRow> = conn.query(
        "SELECT id, appointment_id, patient_id, doctor_id, vital_signs, symptoms,
                diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at
         FROM consultations WHERE patient_id = ? ORDER BY created_at DESC",
        (patient_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

pub fn create(conn: &mut DbConnection, input: CreateConsultationInput) -> Result<Consultation, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Lookup patient_id and doctor_id from the appointment
    let appt_rows: Vec<(String, String)> = conn.query(
        "SELECT patient_id, doctor_id FROM appointments WHERE id = ?",
        (&input.appointment_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let (patient_id, doctor_id) = appt_rows.into_iter().next()
        .ok_or(AppError::NotFound("Cita no encontrada".to_string()))?;

    conn.execute(
        "INSERT INTO consultations (id, appointment_id, patient_id, doctor_id,
         vital_signs, symptoms, diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (&id, &input.appointment_id, &patient_id, &doctor_id,
         &input.vital_signs, &input.symptoms, &input.diagnosis, &input.cie10_code,
         &input.treatment_plan, &input.clinical_notes, &now, &now),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    // Mark the associated appointment as completed
    conn.execute(
        "UPDATE appointments SET status = 'completed', updated_at = ? WHERE id = ?",
        (&now, &input.appointment_id),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, &id)
}
