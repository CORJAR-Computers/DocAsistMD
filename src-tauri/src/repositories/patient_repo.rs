#![allow(dead_code)]
use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::{CreatePatientInput, Patient};
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

/// Compact JSON summary of a patient used in the audit log new/old values.
fn patient_summary(p: &Patient) -> String {
    format!(
        "{{\"id\":\"{}\",\"first_name\":\"{}\",\"last_name\":\"{}\",\"document_id\":\"{}\",\"document_type\":\"{}\",\"email\":\"{}\",\"phone\":\"{}\"}}",
        p.id,
        crate::repositories::audit_repo::json_escape(&p.first_name),
        crate::repositories::audit_repo::json_escape(&p.last_name),
        crate::repositories::audit_repo::json_escape(&p.document_id),
        crate::repositories::audit_repo::json_escape(&p.document_type),
        crate::repositories::audit_repo::json_escape(&p.email),
        crate::repositories::audit_repo::json_escape(&p.phone),
    )
}

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

pub fn create(
    conn: &mut DbConnection,
    input: CreatePatientInput,
    user_id: Option<&str>,
) -> Result<Patient, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = crate::db::now_timestamp();

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

    let patient = get_by_id(conn, &id)?;

    let new_values = patient_summary(&patient);
    crate::repositories::audit_repo::log(
        conn,
        user_id,
        "crear_paciente",
        "patients",
        Some(&id),
        None,
        Some(&new_values),
    )?;

    Ok(patient)
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

pub fn update(
    conn: &mut DbConnection,
    id: &str,
    input: CreatePatientInput,
    user_id: Option<&str>,
) -> Result<Patient, AppError> {
    let now = crate::db::now_timestamp();

    // Capture previous state for the audit log before updating
    let old = get_by_id(conn, id)?;

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

    let patient = get_by_id(conn, id)?;

    let old_values = patient_summary(&old);
    let new_values = patient_summary(&patient);
    crate::repositories::audit_repo::log(
        conn,
        user_id,
        "editar_paciente",
        "patients",
        Some(id),
        Some(&old_values),
        Some(&new_values),
    )?;

    Ok(patient)
}

pub fn delete(conn: &mut DbConnection, id: &str, user_id: Option<&str>) -> Result<(), AppError> {
    // Capture previous state for the audit log before deleting
    let patient = get_by_id(conn, id)?;

    conn.execute("DELETE FROM patients WHERE id = ?", (id,))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let old_values = patient_summary(&patient);
    crate::repositories::audit_repo::log(
        conn,
        user_id,
        "eliminar_paciente",
        "patients",
        Some(id),
        Some(&old_values),
        None,
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::TestDb;

    fn sample_input(document_id: &str) -> CreatePatientInput {
        CreatePatientInput {
            first_name: "Ana".to_string(),
            last_name: "García".to_string(),
            document_id: document_id.to_string(),
            document_type: "CC".to_string(),
            date_of_birth: "1990-05-15".to_string(),
            gender: "F".to_string(),
            phone: "555-0100".to_string(),
            email: "ana@example.com".to_string(),
            address: "Calle 1".to_string(),
            blood_type: Some("O+".to_string()),
            allergies: None,
            emergency_contact_name: None,
            emergency_contact_phone: None,
            insurance_provider: Some("SaludCo".to_string()),
            insurance_policy_number: None,
            insurance_expiry_date: None,
            notes: None,
        }
    }

    #[test]
    fn create_and_get_roundtrip() {
        let mut db = TestDb::new().expect("create test db");

        let created = create(db.conn(), sample_input("CC-1001"), None).expect("create");
        assert!(!created.id.is_empty());
        assert_eq!(created.first_name, "Ana");

        let fetched = get_by_id(db.conn(), &created.id).expect("get by id");
        assert_eq!(fetched.document_id, "CC-1001");
        assert_eq!(fetched.phone, "555-0100");
    }

    #[test]
    fn get_all_returns_created_patients() {
        let mut db = TestDb::new().expect("create test db");
        create(db.conn(), sample_input("CC-2001"), None).expect("create 1");
        create(db.conn(), sample_input("CC-2002"), None).expect("create 2");

        let all = get_all(db.conn()).expect("get all");
        assert!(all.len() >= 2, "expected at least 2 patients, got {}", all.len());
        assert!(all.iter().any(|p| p.document_id == "CC-2001"));
        assert!(all.iter().any(|p| p.document_id == "CC-2002"));
    }

    #[test]
    fn search_finds_by_name_and_document() {
        let mut db = TestDb::new().expect("create test db");
        create(db.conn(), sample_input("CC-3001"), None).expect("create");

        let by_name = search(db.conn(), "Ana").expect("search by name");
        assert!(by_name.iter().any(|p| p.document_id == "CC-3001"));

        let by_doc = search(db.conn(), "CC-3001").expect("search by document");
        assert_eq!(by_doc.len(), 1);
        assert_eq!(by_doc[0].first_name, "Ana");
    }

    #[test]
    fn update_changes_patient_fields() {
        let mut db = TestDb::new().expect("create test db");
        let created = create(db.conn(), sample_input("CC-4001"), None).expect("create");

        let mut updated_input = sample_input("CC-4001");
        updated_input.first_name = "María".to_string();
        updated_input.phone = "555-9999".to_string();

        let updated = update(db.conn(), &created.id, updated_input, None).expect("update");
        assert_eq!(updated.first_name, "María");
        assert_eq!(updated.phone, "555-9999");
    }

    #[test]
    fn delete_removes_patient() {
        let mut db = TestDb::new().expect("create test db");
        let created = create(db.conn(), sample_input("CC-5001"), None).expect("create");

        delete(db.conn(), &created.id, None).expect("delete");

        let err = get_by_id(db.conn(), &created.id).expect_err("should be gone");
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[test]
    fn get_by_id_unknown_returns_not_found() {
        let mut db = TestDb::new().expect("create test db");
        let err = get_by_id(db.conn(), "no-such-id").expect_err("should fail");
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
