use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::{Appointment, AppointmentWithNames, CreateAppointmentInput};
use chrono::Utc;
use rsfbclient::{Execute, Queryable};
use uuid::Uuid;

type AppointmentWithNamesRow = (
    String,
    String,
    String,
    String,
    String,
    String,
    i32,
    String,
    String,
    Option<String>,
    Option<String>,
    String,
    String,
);

fn map_appointment_with_names_row(row: AppointmentWithNamesRow) -> AppointmentWithNames {
    AppointmentWithNames {
        id: row.0,
        patient_id: row.1,
        patient_name: row.2,
        doctor_id: row.3,
        doctor_name: row.4,
        date_time: row.5,
        duration_minutes: row.6,
        status: row.7,
        appointment_type: row.8,
        reason: row.9,
        notes: row.10,
        created_at: row.11,
        updated_at: row.12,
    }
}

type AppointmentRow = (
    String,
    String,
    String,
    String,
    i32,
    String,
    String,
    Option<String>,
    Option<String>,
    String,
    String,
);

fn map_appointment_row(row: AppointmentRow) -> Appointment {
    Appointment {
        id: row.0,
        patient_id: row.1,
        doctor_id: row.2,
        date_time: row.3,
        duration_minutes: row.4,
        status: row.5,
        appointment_type: row.6,
        reason: row.7,
        notes: row.8,
        created_at: row.9,
        updated_at: row.10,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<AppointmentWithNames>, AppError> {
    let rows: Vec<AppointmentWithNamesRow> = conn
        .query(
            "SELECT a.id, a.patient_id, p.first_name || ' ' || p.last_name,
                a.doctor_id, d.first_name || ' ' || d.last_name,
                a.date_time, a.duration_minutes, a.status, a.appointment_type,
                a.reason, a.notes, a.created_at, a.updated_at
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         ORDER BY a.date_time",
            (),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows
        .into_iter()
        .map(map_appointment_with_names_row)
        .collect())
}

pub fn create(
    conn: &mut DbConnection,
    input: CreateAppointmentInput,
) -> Result<Appointment, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO appointments (id, patient_id, doctor_id, date_time, duration_minutes,
         status, appointment_type, reason, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)",
        (
            &id,
            &input.patient_id,
            &input.doctor_id,
            &input.date_time,
            &input.duration_minutes,
            &input.appointment_type,
            &input.reason,
            &input.notes,
            &now,
            &now,
        ),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // Return the created appointment
    let rows: Vec<AppointmentRow> = conn
        .query(
            "SELECT id, patient_id, doctor_id, date_time, duration_minutes, status,
                appointment_type, reason, notes, created_at, updated_at
         FROM appointments WHERE id = ?",
            (&id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    rows.into_iter()
        .map(map_appointment_row)
        .next()
        .ok_or(AppError::Internal(
            "Failed to retrieve created appointment".to_string(),
        ))
}

pub fn update_status(conn: &mut DbConnection, id: &str, status: &str) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
        (status, &now, id),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}
