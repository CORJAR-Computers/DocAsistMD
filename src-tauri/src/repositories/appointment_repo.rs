use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::{Appointment, AppointmentWithNames, CreateAppointmentInput};
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
    user_id: Option<&str>,
) -> Result<Appointment, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = crate::db::now_timestamp();

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

    let appointment = rows
        .into_iter()
        .map(map_appointment_row)
        .next()
        .ok_or(AppError::Internal(
            "Failed to retrieve created appointment".to_string(),
        ))?;

    let new_values = format!(
        "{{\"patient_id\":\"{}\",\"doctor_id\":\"{}\",\"date_time\":\"{}\",\"duration_minutes\":{},\"appointment_type\":\"{}\",\"status\":\"{}\"}}",
        crate::repositories::audit_repo::json_escape(&appointment.patient_id),
        crate::repositories::audit_repo::json_escape(&appointment.doctor_id),
        crate::repositories::audit_repo::json_escape(&appointment.date_time),
        appointment.duration_minutes,
        crate::repositories::audit_repo::json_escape(&appointment.appointment_type),
        crate::repositories::audit_repo::json_escape(&appointment.status),
    );
    crate::repositories::audit_repo::log(
        conn,
        user_id,
        "crear_cita",
        "appointments",
        Some(&id),
        None,
        Some(&new_values),
    )?;

    Ok(appointment)
}

pub fn update_status(
    conn: &mut DbConnection,
    id: &str,
    status: &str,
    user_id: Option<&str>,
) -> Result<(), AppError> {
    let now = crate::db::now_timestamp();

    // Capture previous status for the audit log before updating
    let old_rows: Vec<(String,)> = conn
        .query(
            "SELECT status FROM appointments WHERE id = ?",
            (id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    let old_status = old_rows
        .into_iter()
        .next()
        .ok_or_else(|| AppError::NotFound(format!("Cita {} no encontrada", id)))?
        .0;

    conn.execute(
        "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
        (status, &now, id),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let old_values = format!(
        "{{\"status\":\"{}\"}}",
        crate::repositories::audit_repo::json_escape(&old_status)
    );
    let new_values = format!(
        "{{\"status\":\"{}\"}}",
        crate::repositories::audit_repo::json_escape(status)
    );
    crate::repositories::audit_repo::log(
        conn,
        user_id,
        "editar_cita",
        "appointments",
        Some(id),
        Some(&old_values),
        Some(&new_values),
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::CreateAppointmentInput;
    use crate::test_utils::{make_doctor, make_patient, TestDb};

    #[test]
    fn create_appointment_roundtrip() {
        let mut db = TestDb::new().expect("create test db");
        let patient_id = make_patient(db.conn(), "CC-APT-1001");
        let doctor_id = make_doctor(db.conn(), "LIC-APT-1001");

        let input = CreateAppointmentInput {
            patient_id: patient_id.clone(),
            doctor_id: doctor_id.clone(),
            date_time: "2026-08-15 10:00:00".to_string(),
            duration_minutes: 30,
            appointment_type: "consultation".to_string(),
            reason: Some("Dolor de cabeza".to_string()),
            notes: None,
        };
        let created = create(db.conn(), input, None).expect("create appointment");
        assert!(!created.id.is_empty());
        assert_eq!(created.patient_id, patient_id);
        assert_eq!(created.doctor_id, doctor_id);
        assert_eq!(created.status, "scheduled");

        let all = get_all(db.conn()).expect("get all");
        assert!(all.iter().any(|a| a.id == created.id));
    }

    #[test]
    fn update_status_changes_appointment() {
        let mut db = TestDb::new().expect("create test db");
        let patient_id = make_patient(db.conn(), "CC-APT-1002");
        let doctor_id = make_doctor(db.conn(), "LIC-APT-1002");

        let input = CreateAppointmentInput {
            patient_id,
            doctor_id,
            date_time: "2026-08-15 10:00:00".to_string(),
            duration_minutes: 30,
            appointment_type: "consultation".to_string(),
            reason: None,
            notes: None,
        };
        let created = create(db.conn(), input, None).expect("create appointment");

        update_status(db.conn(), &created.id, "completed", None).expect("update status");

        let all = get_all(db.conn()).expect("get all");
        let updated = all.iter().find(|a| a.id == created.id).expect("find updated");
        assert_eq!(updated.status, "completed");
    }
}
