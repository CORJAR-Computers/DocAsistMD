use crate::errors::AppError;
use crate::models::{Prescription, CreatePrescriptionInput, PrescriptionDetail, PrescriptionItem};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;

type PrescriptionRow = (
    String, String, String, String, String, String, Option<String>, i32, String,
);

fn map_row(row: PrescriptionRow) -> Prescription {
    Prescription {
        id: row.0, consultation_id: row.1, medication_id: row.2,
        dosage: row.3, frequency: row.4, duration: row.5,
        instructions: row.6, quantity: row.7, created_at: row.8,
    }
}

pub fn get_by_consultation(conn: &mut DbConnection, consultation_id: &str) -> Result<Vec<Prescription>, AppError> {
    let rows: Vec<PrescriptionRow> = conn.query(
        "SELECT id, consultation_id, medication_id, dosage, frequency, duration, instructions, quantity, created_at
         FROM prescriptions WHERE consultation_id = ? ORDER BY created_at",
        (consultation_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

/// Create a prescription and, atomically, dispense the medication: decrement
/// stock and record an "out" inventory movement referencing this prescription.
/// Also registers an audit log entry (dispense) inside the same transaction.
pub fn create(
    conn: &mut DbConnection,
    input: CreatePrescriptionInput,
    user_id: Option<&str>,
) -> Result<Prescription, AppError> {
    if input.quantity <= 0 {
        return Err(AppError::Validation(
            "La cantidad a dispensar debe ser mayor que cero".to_string(),
        ));
    }

    // Validate medication exists and has enough stock BEFORE starting the transaction
    let med = crate::repositories::medication_repo::get_by_id(conn, &input.medication_id)?;
    if input.quantity > med.current_stock {
        return Err(AppError::Validation(format!(
            "Stock insuficiente para '{}': disponible {}, solicitado {}",
            med.name, med.current_stock, input.quantity
        )));
    }

    let id = Uuid::new_v4().to_string();
    let now = crate::db::now_timestamp();

    conn.begin_transaction().map_err(|e| AppError::Database(e.to_string()))?;
    let result = (|| -> Result<Prescription, AppError> {
        // 1. Insert the prescription
        conn.execute(
            "INSERT INTO prescriptions (id, consultation_id, medication_id, dosage, frequency, duration, instructions, quantity, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (&id, &input.consultation_id, &input.medication_id,
             &input.dosage, &input.frequency, &input.duration, &input.instructions, &input.quantity, &now),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // 2. Decrement the medication stock
        conn.execute(
            "UPDATE medications SET current_stock = current_stock - ?, updated_at = ? WHERE id = ?",
            (&input.quantity, &now, &input.medication_id),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // 3. Record the dispensing movement (out) with reference = prescription id
        conn.execute(
            "INSERT INTO inventory_movements (id, medication_id, movement_type, quantity, reason, reference, created_at)
             VALUES (?, ?, 'out', ?, 'Dispensado en receta', ?, ?)",
            (&Uuid::new_v4().to_string(), &input.medication_id, &input.quantity, &id, &now),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // 4. Audit log: dispense action with the acting user
        let new_values = format!(
            "{{\"medication_id\":\"{}\",\"quantity\":{},\"consultation_id\":\"{}\"}}",
            input.medication_id, input.quantity, input.consultation_id
        );
        crate::repositories::audit_repo::log(
            conn,
            user_id,
            "dispensar_medicamento",
            "prescriptions",
            Some(&id),
            None,
            Some(&new_values),
        )?;

        let rows: Vec<PrescriptionRow> = conn.query(
            "SELECT id, consultation_id, medication_id, dosage, frequency, duration, instructions, quantity, created_at
             FROM prescriptions WHERE id = ?",
            (&id,),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        rows.into_iter().map(map_row).next()
            .ok_or(AppError::Internal("Error al crear prescripcion".to_string()))
    })();

    match result {
        Ok(prescription) => {
            conn.commit().map_err(|e| AppError::Database(e.to_string()))?;
            Ok(prescription)
        }
        Err(e) => {
            conn.rollback().map_err(|re| AppError::Database(re.to_string()))?;
            Err(e)
        }
    }
}

type DetailHeaderRow = (
    String, String, String, Option<String>, Option<String>,
    String, String, String, String, Option<String>,
    Option<String>, Option<String>, Option<String>, String,
);

type DetailItemRow = (
    String, String, String, String, String, String, String, Option<String>, i32,
);

/// Full prescription detail: consultation + patient + doctor + medication items.
/// Two queries to stay under the 15-column rsfbclient limit.
pub fn get_detail(conn: &mut DbConnection, consultation_id: &str) -> Result<PrescriptionDetail, AppError> {
    let header: Vec<DetailHeaderRow> = conn.query(
        "SELECT c.id, p.first_name, p.last_name, p.document_id, p.phone,\n\
         d.first_name, d.last_name, d.specialty, d.license_number,\n\
         c.diagnosis, c.cie10_code, c.treatment_plan, c.clinical_notes,\n\
         c.created_at\n\
         FROM consultations c\n\
         JOIN patients p ON c.patient_id = p.id\n\
         JOIN doctors d ON c.doctor_id = d.id\n\
         WHERE c.id = ?",
        (consultation_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let h = header.into_iter().next()
        .ok_or(AppError::NotFound(format!("Consulta {} no encontrada", consultation_id)))?;

    let items: Vec<DetailItemRow> = conn.query(
        "SELECT pr.id, pr.medication_id, m.name, m.presentation,\n\
                pr.dosage, pr.frequency, pr.duration, pr.instructions, pr.quantity\n\
         FROM prescriptions pr\n\
         JOIN medications m ON pr.medication_id = m.id\n\
         WHERE pr.consultation_id = ?\n\
         ORDER BY pr.created_at",
        (consultation_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let items = items.into_iter().map(|r| PrescriptionItem {
        id: r.0,
        medication_id: r.1,
        medication_name: r.2,
        presentation: r.3,
        dosage: r.4,
        frequency: r.5,
        duration: r.6,
        instructions: r.7,
        quantity: r.8,
    }).collect();

    Ok(PrescriptionDetail {
        consultation_id: h.0,
        patient_name: format!("{} {}", h.1, h.2),
        patient_document: h.3,
        patient_phone: h.4,
        doctor_name: format!("{} {}", h.5, h.6),
        doctor_specialty: h.7,
        doctor_license: h.8,
        diagnosis: h.9,
        cie10_code: h.10,
        treatment_plan: h.11,
        clinical_notes: h.12,
        created_at: h.13,
        items,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{
        CreateAppointmentInput, CreateConsultationInput, CreateMedicationInput,
        CreateMovementInput,
    };
    use crate::repositories::{appointment_repo, consultation_repo, medication_repo};
    use crate::test_utils::{make_doctor, make_patient, TestDb};

    fn make_medication(conn: &mut DbConnection, stock: i32) -> String {
        let input = CreateMedicationInput {
            name: "Paracetamol".to_string(),
            active_ingredient: "Paracetamol".to_string(),
            presentation: "Tabletas".to_string(),
            concentration: Some("500 mg".to_string()),
            current_stock: stock,
            minimum_stock: 10,
            unit_price: 1500.0,
            expiry_date: None,
            supplier: Some("Distribuidora X".to_string()),
        };
        medication_repo::create(conn, input).expect("create medication").id
    }

    fn make_consultation(conn: &mut DbConnection) -> String {
        let patient_id = make_patient(conn, "CC-RX-1001");
        let doctor_id = make_doctor(conn, "LIC-RX-1001");
        let appointment = appointment_repo::create(
            conn,
            CreateAppointmentInput {
                patient_id,
                doctor_id,
                date_time: "2026-08-15 10:00:00".to_string(),
                duration_minutes: 30,
                appointment_type: "consultation".to_string(),
                reason: None,
                notes: None,
            },
            None,
        )
        .expect("create appointment");
        consultation_repo::create(
            conn,
            CreateConsultationInput {
                appointment_id: appointment.id,
                vital_signs: None,
                symptoms: Some("Fiebre".to_string()),
                diagnosis: Some("Gripe".to_string()),
                cie10_code: Some("J11".to_string()),
                treatment_plan: Some("Reposo".to_string()),
                clinical_notes: None,
            },
        )
        .expect("create consultation")
        .id
    }

    #[test]
    fn create_and_get_roundtrip() {
        let mut db = TestDb::new().expect("create test db");
        let consultation_id = make_consultation(db.conn());
        let medication_id = make_medication(db.conn(), 50);

        let input = CreatePrescriptionInput {
            consultation_id: consultation_id.clone(),
            medication_id: medication_id.clone(),
            dosage: "1 tableta".to_string(),
            frequency: "cada 8 horas".to_string(),
            duration: "5 días".to_string(),
            instructions: Some("Tomar con alimentos".to_string()),
            quantity: 10,
        };
        let created = create(db.conn(), input, None).expect("create prescription");
        assert!(!created.id.is_empty());
        assert_eq!(created.quantity, 10);

        let list = get_by_consultation(db.conn(), &consultation_id).expect("get by consultation");
        assert!(list.iter().any(|p| p.id == created.id));
    }

    #[test]
    fn create_dispenses_stock_and_records_movement() {
        let mut db = TestDb::new().expect("create test db");
        let consultation_id = make_consultation(db.conn());
        let medication_id = make_medication(db.conn(), 50);

        let input = CreatePrescriptionInput {
            consultation_id: consultation_id.clone(),
            medication_id: medication_id.clone(),
            dosage: "1 tableta".to_string(),
            frequency: "cada 8 horas".to_string(),
            duration: "3 días".to_string(),
            instructions: None,
            quantity: 10,
        };
        create(db.conn(), input, None).expect("create prescription");

        // Stock decremented
        let med = medication_repo::get_by_id(db.conn(), &medication_id).expect("get medication");
        assert_eq!(med.current_stock, 40);

        // An "out" movement referencing the prescription was recorded
        let movements =
            medication_repo::get_dispensed_movements(db.conn(), &consultation_id).expect("movements");
        assert_eq!(movements.len(), 1);
        assert_eq!(movements[0].movement_type, "out");
        assert_eq!(movements[0].quantity, 10);
        assert_eq!(movements[0].origin, "receta");
    }

    #[test]
    fn create_rejects_insufficient_stock() {
        let mut db = TestDb::new().expect("create test db");
        let consultation_id = make_consultation(db.conn());
        let medication_id = make_medication(db.conn(), 5);

        let input = CreatePrescriptionInput {
            consultation_id,
            medication_id: medication_id.clone(),
            dosage: "1 tableta".to_string(),
            frequency: "cada 8 horas".to_string(),
            duration: "5 días".to_string(),
            instructions: None,
            quantity: 10,
        };
        let err = create(db.conn(), input, None).expect_err("should fail");
        assert!(matches!(err, AppError::Validation(_)));

        // Stock unchanged
        let med = medication_repo::get_by_id(db.conn(), &medication_id).expect("get medication");
        assert_eq!(med.current_stock, 5);
    }

    #[test]
    fn dispense_then_reverse_restores_stock_and_pairs() {
        let mut db = TestDb::new().expect("create test db");
        let consultation_id = make_consultation(db.conn());
        let medication_id = make_medication(db.conn(), 50);

        let input = CreatePrescriptionInput {
            consultation_id: consultation_id.clone(),
            medication_id: medication_id.clone(),
            dosage: "1 tableta".to_string(),
            frequency: "cada 8 horas".to_string(),
            duration: "3 días".to_string(),
            instructions: None,
            quantity: 10,
        };
        create(db.conn(), input, None).expect("create prescription");

        // After dispensing: stock 50 -> 40 and one "out" movement with origin receta
        let movements =
            medication_repo::get_dispensed_movements(db.conn(), &consultation_id).expect("movements");
        assert_eq!(movements.len(), 1);
        assert_eq!(movements[0].origin, "receta");
        let movement_id = movements[0].id.clone();
        let med = medication_repo::get_by_id(db.conn(), &medication_id).expect("get medication");
        assert_eq!(med.current_stock, 40);

        // Undo the dispense: stock back to 50, movement marked reversed
        medication_repo::reverse_dispense(db.conn(), &movement_id, None).expect("reverse");

        let med = medication_repo::get_by_id(db.conn(), &medication_id).expect("get medication");
        assert_eq!(med.current_stock, 50, "stock should be restored");

        // The original movement is marked reversed and paired with the compensating "in"
        let detail = medication_repo::get_movement_detail(db.conn(), &movement_id).expect("detail");
        assert!(
            detail.movement.reversed_at.is_some(),
            "original movement should be marked reversed"
        );
        let pair = detail.reversal_pair.expect("reversal pair present");
        assert_eq!(pair.movement_type, "in");
        assert_eq!(pair.quantity, 10);
        assert_eq!(pair.origin, "reversion");
    }

    #[test]
    fn reverse_dispense_twice_is_rejected() {
        let mut db = TestDb::new().expect("create test db");
        let consultation_id = make_consultation(db.conn());
        let medication_id = make_medication(db.conn(), 50);

        let input = CreatePrescriptionInput {
            consultation_id: consultation_id.clone(),
            medication_id: medication_id.clone(),
            dosage: "1 tableta".to_string(),
            frequency: "cada 8 horas".to_string(),
            duration: "3 días".to_string(),
            instructions: None,
            quantity: 10,
        };
        create(db.conn(), input, None).expect("create prescription");

        let movements =
            medication_repo::get_dispensed_movements(db.conn(), &consultation_id).expect("movements");
        let movement_id = movements[0].id.clone();

        medication_repo::reverse_dispense(db.conn(), &movement_id, None).expect("first reverse");

        let err =
            medication_repo::reverse_dispense(db.conn(), &movement_id, None).expect_err("second reverse should fail");
        assert!(matches!(err, AppError::Validation(_)));

        // The failed second reverse must not double-restore the stock.
        let med = medication_repo::get_by_id(db.conn(), &medication_id).expect("get medication");
        assert_eq!(med.current_stock, 50, "stock must not be restored twice");
    }

    #[test]
    fn reverse_manual_movement_is_rejected() {
        let mut db = TestDb::new().expect("create test db");
        let medication_id = make_medication(db.conn(), 20);

        // Manual "out" movement with no prescription reference: cannot be undone
        let movement = medication_repo::record_movement(
            db.conn(),
            CreateMovementInput {
                medication_id: medication_id.clone(),
                movement_type: "out".to_string(),
                quantity: 5,
                reason: Some("Salida manual".to_string()),
                reference: None,
            },
            None,
        )
        .expect("record manual movement");

        let err = medication_repo::reverse_dispense(db.conn(), &movement.id, None)
            .expect_err("manual movement should not be reversible");
        assert!(matches!(err, AppError::Validation(_)));
    }
}
