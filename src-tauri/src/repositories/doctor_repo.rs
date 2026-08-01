#![allow(dead_code)]
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::Doctor;
use rsfbclient::Queryable;

type DoctorRow = (
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
    String,
    String,
    String,
);

fn map_doctor_row(row: DoctorRow) -> Doctor {
    Doctor {
        id: row.0,
        first_name: row.1,
        last_name: row.2,
        specialty: row.3,
        license_number: row.4,
        phone: row.5,
        email: row.6,
        schedule_start: row.7,
        schedule_end: row.8,
        working_days: row.9,
        status: row.10,
        created_at: row.11,
        updated_at: row.12,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<Doctor>, AppError> {
    let rows: Vec<DoctorRow> = conn
        .query(
            "SELECT id, first_name, last_name, specialty, license_number, phone, email,
                schedule_start, schedule_end, working_days, status, created_at, updated_at
         FROM doctors WHERE status = 'active' ORDER BY last_name, first_name",
            (),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(map_doctor_row).collect())
}

pub fn get_by_id(conn: &mut DbConnection, id: &str) -> Result<Doctor, AppError> {
    let rows: Vec<DoctorRow> = conn
        .query(
            "SELECT id, first_name, last_name, specialty, license_number, phone, email,
                schedule_start, schedule_end, working_days, status, created_at, updated_at
         FROM doctors WHERE id = ?",
            (id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    rows.into_iter()
        .map(map_doctor_row)
        .next()
        .ok_or(AppError::NotFound(format!("Doctor {} not found", id)))
}

pub fn create(conn: &mut DbConnection, input: crate::models::CreateDoctorInput) -> Result<Doctor, AppError> {
    use rsfbclient::Execute;
    use uuid::Uuid;

    let id = Uuid::new_v4().to_string();
    let now = crate::db::now_timestamp();

    conn.execute(
        "INSERT INTO doctors (id, first_name, last_name, specialty, license_number, phone, email,
         schedule_start, schedule_end, working_days, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[1,2,3,4,5]', 'active', ?, ?)",
        (&id, &input.first_name, &input.last_name, &input.specialty,
         &input.license_number, &input.phone, &input.email,
         &input.schedule_start, &input.schedule_end, &now, &now),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::CreateDoctorInput;
    use crate::test_utils::TestDb;

    fn sample_input(license: &str) -> CreateDoctorInput {
        CreateDoctorInput {
            first_name: "Carlos".to_string(),
            last_name: "López".to_string(),
            specialty: "Cardiología".to_string(),
            license_number: license.to_string(),
            phone: "555-0200".to_string(),
            email: "carlos@example.com".to_string(),
            schedule_start: "08:00".to_string(),
            schedule_end: "17:00".to_string(),
        }
    }

    #[test]
    fn create_and_get_roundtrip() {
        let mut db = TestDb::new().expect("create test db");

        let created = create(db.conn(), sample_input("LIC-1001")).expect("create");
        assert!(!created.id.is_empty());
        assert_eq!(created.specialty, "Cardiología");

        let fetched = get_by_id(db.conn(), &created.id).expect("get by id");
        assert_eq!(fetched.license_number, "LIC-1001");
        assert_eq!(fetched.status, "active");
    }

    #[test]
    fn get_all_returns_created_doctors() {
        let mut db = TestDb::new().expect("create test db");
        create(db.conn(), sample_input("LIC-2001")).expect("create 1");
        create(db.conn(), sample_input("LIC-2002")).expect("create 2");

        let all = get_all(db.conn()).expect("get all");
        assert!(all.len() >= 2, "expected at least 2 doctors, got {}", all.len());
        assert!(all.iter().any(|d| d.license_number == "LIC-2001"));
        assert!(all.iter().any(|d| d.license_number == "LIC-2002"));
    }

    #[test]
    fn get_by_id_unknown_returns_not_found() {
        let mut db = TestDb::new().expect("create test db");
        let err = get_by_id(db.conn(), "no-such-id").expect_err("should fail");
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
