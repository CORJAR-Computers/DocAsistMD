use crate::crypto::{decrypt_field, encrypt_field};
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::{Consultation, CreateConsultationInput};
use rsfbclient::{Execute, Queryable};
use uuid::Uuid;

type ConsultationRow = (
    String,
    String,
    String,
    String,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    String,
    String,
);

fn map_row(row: ConsultationRow) -> Consultation {
    Consultation {
        id: row.0,
        appointment_id: row.1,
        patient_id: row.2,
        doctor_id: row.3,
        vital_signs: decrypt_field(row.4),
        symptoms: decrypt_field(row.5),
        diagnosis: decrypt_field(row.6),
        cie10_code: row.7,
        treatment_plan: decrypt_field(row.8),
        clinical_notes: decrypt_field(row.9),
        created_at: row.10,
        updated_at: row.11,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<Consultation>, AppError> {
    let rows: Vec<ConsultationRow> = conn
        .query(
            "SELECT id, appointment_id, patient_id, doctor_id, vital_signs, symptoms,
                diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at
         FROM consultations ORDER BY created_at DESC",
            (),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

pub fn get_by_id(conn: &mut DbConnection, id: &str) -> Result<Consultation, AppError> {
    let rows: Vec<ConsultationRow> = conn
        .query(
            "SELECT id, appointment_id, patient_id, doctor_id, vital_signs, symptoms,
                diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at
         FROM consultations WHERE id = ?",
            (id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    rows.into_iter()
        .map(map_row)
        .next()
        .ok_or(AppError::NotFound(format!("Consulta {} no encontrada", id)))
}

pub fn get_by_patient(
    conn: &mut DbConnection,
    patient_id: &str,
) -> Result<Vec<Consultation>, AppError> {
    let rows: Vec<ConsultationRow> = conn
        .query(
            "SELECT id, appointment_id, patient_id, doctor_id, vital_signs, symptoms,
                diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at
         FROM consultations WHERE patient_id = ? ORDER BY created_at DESC",
            (patient_id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

pub fn create(
    conn: &mut DbConnection,
    input: CreateConsultationInput,
) -> Result<Consultation, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = crate::db::now_timestamp();

    // Lookup patient_id and doctor_id from the appointment
    let appt_rows: Vec<(String, String)> = conn
        .query(
            "SELECT patient_id, doctor_id FROM appointments WHERE id = ?",
            (&input.appointment_id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let (patient_id, doctor_id) = appt_rows
        .into_iter()
        .next()
        .ok_or(AppError::NotFound("Cita no encontrada".to_string()))?;

    // Encrypt sensitive medical records before persisting to Firebird DB
    let vital_signs_enc = encrypt_field(input.vital_signs.as_deref());
    let symptoms_enc = encrypt_field(input.symptoms.as_deref());
    let diagnosis_enc = encrypt_field(input.diagnosis.as_deref());
    let treatment_plan_enc = encrypt_field(input.treatment_plan.as_deref());
    let clinical_notes_enc = encrypt_field(input.clinical_notes.as_deref());

    conn.execute(
        "INSERT INTO consultations (id, appointment_id, patient_id, doctor_id,
         vital_signs, symptoms, diagnosis, cie10_code, treatment_plan, clinical_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            &id,
            &input.appointment_id,
            &patient_id,
            &doctor_id,
            &vital_signs_enc,
            &symptoms_enc,
            &diagnosis_enc,
            &input.cie10_code,
            &treatment_plan_enc,
            &clinical_notes_enc,
            &now,
            &now,
        ),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // Mark the associated appointment as completed
    conn.execute(
        "UPDATE appointments SET status = 'completed', updated_at = ? WHERE id = ?",
        (&now, &input.appointment_id),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, &id)
}
