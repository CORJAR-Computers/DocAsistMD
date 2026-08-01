use crate::errors::AppError;
use crate::models::{Prescription, CreatePrescriptionInput, PrescriptionDetail, PrescriptionItem};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::Utc;

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
pub fn create(conn: &mut DbConnection, input: CreatePrescriptionInput) -> Result<Prescription, AppError> {
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
    let now = Utc::now().to_rfc3339();

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
