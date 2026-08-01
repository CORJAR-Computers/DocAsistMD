use crate::errors::AppError;
use crate::models::{Prescription, CreatePrescriptionInput};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::Utc;

type PrescriptionRow = (
    String, String, String, String, String, String, Option<String>, String,
);

fn map_row(row: PrescriptionRow) -> Prescription {
    Prescription {
        id: row.0, consultation_id: row.1, medication_id: row.2,
        dosage: row.3, frequency: row.4, duration: row.5,
        instructions: row.6, created_at: row.7,
    }
}

pub fn get_by_consultation(conn: &mut DbConnection, consultation_id: &str) -> Result<Vec<Prescription>, AppError> {
    let rows: Vec<PrescriptionRow> = conn.query(
        "SELECT id, consultation_id, medication_id, dosage, frequency, duration, instructions, created_at
         FROM prescriptions WHERE consultation_id = ? ORDER BY created_at",
        (consultation_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

pub fn create(conn: &mut DbConnection, input: CreatePrescriptionInput) -> Result<Prescription, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO prescriptions (id, consultation_id, medication_id, dosage, frequency, duration, instructions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (&id, &input.consultation_id, &input.medication_id,
         &input.dosage, &input.frequency, &input.duration, &input.instructions, &now),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let rows: Vec<PrescriptionRow> = conn.query(
        "SELECT id, consultation_id, medication_id, dosage, frequency, duration, instructions, created_at
         FROM prescriptions WHERE id = ?",
        (&id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    rows.into_iter().map(map_row).next()
        .ok_or(AppError::Internal("Error al crear prescripcion".to_string()))
}
