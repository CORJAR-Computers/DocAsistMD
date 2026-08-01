use crate::errors::AppError;
use crate::models::{CreateMedicationInput, CreateMovementInput, InventoryMovement, Medication, MovementDetail};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::{Duration, Utc};

type MedicationRow = (
    String, String, String, String, Option<String>, i32, i32, f64,
    Option<String>, Option<String>, String, String,
);

fn map_row(row: MedicationRow) -> Medication {
    Medication {
        id: row.0, name: row.1, active_ingredient: row.2, presentation: row.3,
        concentration: row.4, current_stock: row.5, minimum_stock: row.6,
        unit_price: row.7, expiry_date: row.8, supplier: row.9,
        created_at: row.10, updated_at: row.11,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<Medication>, AppError> {
    let rows: Vec<MedicationRow> = conn.query(
        "SELECT id, name, active_ingredient, presentation, concentration,
                current_stock, minimum_stock, unit_price, expiry_date, supplier,
                created_at, updated_at
         FROM medications ORDER BY name",
        (),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

pub fn get_by_id(conn: &mut DbConnection, id: &str) -> Result<Medication, AppError> {
    let rows: Vec<MedicationRow> = conn.query(
        "SELECT id, name, active_ingredient, presentation, concentration,
                current_stock, minimum_stock, unit_price, expiry_date, supplier,
                created_at, updated_at
         FROM medications WHERE id = ?",
        (id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    rows.into_iter().map(map_row).next()
        .ok_or(AppError::NotFound(format!("Medicamento {} no encontrado", id)))
}

pub fn create(conn: &mut DbConnection, input: CreateMedicationInput) -> Result<Medication, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO medications (id, name, active_ingredient, presentation, concentration,
         current_stock, minimum_stock, unit_price, expiry_date, supplier, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (&id, &input.name, &input.active_ingredient, &input.presentation,
         &input.concentration, &input.current_stock, &input.minimum_stock,
         &input.unit_price, &input.expiry_date, &input.supplier, &now, &now),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, &id)
}

pub fn get_low_stock(conn: &mut DbConnection) -> Result<Vec<Medication>, AppError> {
    let rows: Vec<MedicationRow> = conn.query(
        "SELECT id, name, active_ingredient, presentation, concentration,
                current_stock, minimum_stock, unit_price, expiry_date, supplier,
                created_at, updated_at
         FROM medications WHERE current_stock <= minimum_stock ORDER BY name",
        (),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

/// Medications whose expiry date is within the next `days` days (or already expired)
pub fn get_expiring(conn: &mut DbConnection, days: i32) -> Result<Vec<Medication>, AppError> {
    let cutoff = Utc::now().date_naive() + Duration::days(days as i64);
    let cutoff_str = cutoff.format("%Y-%m-%d").to_string();

    let rows: Vec<MedicationRow> = conn.query(
        "SELECT id, name, active_ingredient, presentation, concentration,
                current_stock, minimum_stock, unit_price, expiry_date, supplier,
                created_at, updated_at
         FROM medications
         WHERE expiry_date IS NOT NULL AND expiry_date <= ?
         ORDER BY expiry_date",
        (&cutoff_str,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

type MovementRow = (
    String, String, String, String, i32, Option<String>, Option<String>, String, String, Option<String>,
);

fn map_movement_row(row: MovementRow) -> InventoryMovement {
    InventoryMovement {
        id: row.0,
        medication_id: row.1,
        medication_name: row.2,
        movement_type: row.3,
        quantity: row.4,
        reason: row.5,
        reference: row.6,
        created_at: row.7,
        origin: row.8,
        reversed_at: row.9,
    }
}

/// List inventory movements with optional combined filters:
/// - medication_id: only movements of that medication
/// - movement_type: "in" | "out"
/// - origin: "receta" | "manual" | "reversion"
/// - date_from / date_to: inclusive date range ("YYYY-MM-DD") on created_at
/// Uses the `? = '' OR col = ?` sentinel pattern so a fixed 10-param tuple
/// works whether or not each filter is provided. The computed `origin` column
/// is referenced via a derived table so the WHERE can reuse it.
pub fn get_movements(
    conn: &mut DbConnection,
    medication_id: Option<&str>,
    movement_type: Option<&str>,
    origin: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<InventoryMovement>, AppError> {
    let mid = medication_id.unwrap_or("");
    let mtype = movement_type.unwrap_or("");
    let ori = origin.unwrap_or("");
    let from = date_from.map(|d| format!("{} 00:00:00", d)).unwrap_or_default();
    let to = date_to.map(|d| format!("{} 23:59:59", d)).unwrap_or_default();

    let rows: Vec<MovementRow> = conn.query(
        "SELECT * FROM (
            SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                   m.reason, m.reference, m.created_at,
                   CASE WHEN m.reason = 'Reversión de dispensación' AND m.movement_type = 'in' THEN 'reversion'
                        WHEN pr.id IS NOT NULL AND m.movement_type = 'out' THEN 'receta'
                        ELSE 'manual' END AS origin,
                   m.reversed_at
            FROM inventory_movements m
            JOIN medications med ON m.medication_id = med.id
            LEFT JOIN prescriptions pr ON pr.id = m.reference
        ) t
        WHERE (? = '' OR t.medication_id = ?)
          AND (? = '' OR t.movement_type = ?)
          AND (? = '' OR t.origin = ?)
          AND (? = '' OR t.created_at >= ?)
          AND (? = '' OR t.created_at <= ?)
        ORDER BY t.created_at DESC",
        (&mid, &mid, &mtype, &mtype, &ori, &ori, &from, &from, &to, &to),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_movement_row).collect())
}

/// Movements (out) generated by automatically dispensing the prescriptions of
/// a given consultation. Used by the clinical history to show an undo button
/// or "reversed" state next to each dispensed medication.
pub fn get_dispensed_movements(
    conn: &mut DbConnection,
    consultation_id: &str,
) -> Result<Vec<InventoryMovement>, AppError> {
    let rows: Vec<MovementRow> = conn.query(
        "SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                m.reason, m.reference, m.created_at,
                CASE WHEN m.reason = 'Reversión de dispensación' AND m.movement_type = 'in' THEN 'reversion'
                        WHEN pr.id IS NOT NULL AND m.movement_type = 'out' THEN 'receta'
                        ELSE 'manual' END AS origin,
                m.reversed_at
         FROM inventory_movements m
         JOIN medications med ON m.medication_id = med.id
         LEFT JOIN prescriptions pr ON pr.id = m.reference
         WHERE m.movement_type = 'out'
           AND m.reference IN (SELECT id FROM prescriptions WHERE consultation_id = ?)
         ORDER BY m.created_at DESC",
        (consultation_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_movement_row).collect())
}

/// Detail of a movement plus its associated reversal pair (when it exists).
/// Prescription dispenses ("out") are paired with the compensating "in"
/// movement registered when undone (reason "Reversión de dispensación", same
/// prescription reference); and vice versa, a reversal entry is paired with
/// the original "out" dispense it compensates.
pub fn get_movement_detail(
    conn: &mut DbConnection,
    movement_id: &str,
) -> Result<MovementDetail, AppError> {
    let rows: Vec<MovementRow> = conn.query(
        "SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                m.reason, m.reference, m.created_at,
                CASE WHEN m.reason = 'Reversión de dispensación' AND m.movement_type = 'in' THEN 'reversion'
                        WHEN pr.id IS NOT NULL AND m.movement_type = 'out' THEN 'receta'
                        ELSE 'manual' END AS origin,
                m.reversed_at
         FROM inventory_movements m
         JOIN medications med ON m.medication_id = med.id
         LEFT JOIN prescriptions pr ON pr.id = m.reference
         WHERE m.id = ?",
        (movement_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let movement = rows.into_iter().map(map_movement_row).next()
        .ok_or(AppError::NotFound(format!("Movimiento {} no encontrado", movement_id)))?;

    // Find the counterpart sharing the same prescription reference:
    // - an "out" dispense looks for the compensating "in" reversal entry
    // - an "in" movement (reversal) looks for the original "out" dispense
    let reversal_pair: Option<InventoryMovement> = match movement.reference.as_deref() {
        Some(reference) if movement.movement_type == "out" => {
            let rows: Vec<MovementRow> = conn.query(
                "SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                        m.reason, m.reference, m.created_at,
                        CASE WHEN m.reason = 'Reversión de dispensación' AND m.movement_type = 'in' THEN 'reversion'
                        WHEN pr.id IS NOT NULL AND m.movement_type = 'out' THEN 'receta'
                        ELSE 'manual' END AS origin,
                        m.reversed_at
                 FROM inventory_movements m
                 JOIN medications med ON m.medication_id = med.id
                 LEFT JOIN prescriptions pr ON pr.id = m.reference
                 WHERE m.reference = ? AND m.movement_type = 'in' AND m.reason = 'Reversión de dispensación'
                 ORDER BY m.created_at DESC",
                (reference,),
            ).map_err(|e| AppError::Database(e.to_string()))?;
            rows.into_iter().map(map_movement_row).next()
        }
        Some(reference) => {
            let rows: Vec<MovementRow> = conn.query(
                "SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                        m.reason, m.reference, m.created_at,
                        CASE WHEN m.reason = 'Reversión de dispensación' AND m.movement_type = 'in' THEN 'reversion'
                        WHEN pr.id IS NOT NULL AND m.movement_type = 'out' THEN 'receta'
                        ELSE 'manual' END AS origin,
                        m.reversed_at
                 FROM inventory_movements m
                 JOIN medications med ON m.medication_id = med.id
                 LEFT JOIN prescriptions pr ON pr.id = m.reference
                 WHERE m.reference = ? AND m.movement_type = 'out' AND m.reversed_at IS NOT NULL
                 ORDER BY m.created_at DESC",
                (reference,),
            ).map_err(|e| AppError::Database(e.to_string()))?;
            rows.into_iter().map(map_movement_row).next()
        }
        None => None,
    };

    Ok(MovementDetail {
        movement,
        reversal_pair,
    })
}

/// Undo a prescription dispense: restore stock, mark the movement as
/// reversed (reversed_at set) and register a compensating "in" movement
/// (reason "Reversión de dispensación") so the inventory ledger keeps the
/// full traceability: out -qty followed by in +qty, both visible.
/// The linked prescription and original movement row are kept. Only "out"
/// movements referencing a real prescription (created by automatic
/// dispensing) can be reversed, and only once.
pub fn reverse_dispense(
    conn: &mut DbConnection,
    movement_id: &str,
    user_id: Option<&str>,
) -> Result<(), AppError> {
    let rows: Vec<(String, String, String, i32, Option<String>, Option<String>)> = conn.query(
        "SELECT id, medication_id, movement_type, quantity, reference, reversed_at
         FROM inventory_movements WHERE id = ?",
        (movement_id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let (id, medication_id, movement_type, quantity, reference, reversed_at) = rows.into_iter().next()
        .ok_or(AppError::NotFound(format!("Movimiento {} no encontrado", movement_id)))?;

    // Only dispensed movements (out + reference to a prescription) can be undone
    if movement_type != "out" {
        return Err(AppError::Validation(
            "Solo se puede deshacer una dispensación de receta".to_string(),
        ));
    }
    if reversed_at.is_some() {
        return Err(AppError::Validation(
            "Esta dispensación ya fue revertida".to_string(),
        ));
    }
    let reference = reference.ok_or(AppError::Validation(
        "Solo se puede deshacer una dispensación de receta".to_string(),
    ))?;

    // Ensure the referenced prescription still exists (validates origin)
    let rx_exists: Vec<(String,)> = conn.query(
        "SELECT id FROM prescriptions WHERE id = ?",
        (&reference,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    if rx_exists.is_empty() {
        return Err(AppError::Validation(
            "Solo se puede deshacer una dispensación de receta".to_string(),
        ));
    }

    let now = Utc::now().to_rfc3339();

    conn.begin_transaction().map_err(|e| AppError::Database(e.to_string()))?;
    let result = (|| -> Result<(), AppError> {
        // Restore stock (+ quantity)
        conn.execute(
            "UPDATE medications SET current_stock = current_stock + ?, updated_at = ? WHERE id = ?",
            (&quantity, &now, &medication_id),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // Mark the movement as reversed (keeps the row + the prescription)
        conn.execute(
            "UPDATE inventory_movements SET reversed_at = ? WHERE id = ?",
            (&now, &id),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // Register a compensating "in" movement so the ledger shows the full
        // traceability of the reversal (out -qty followed by in +qty).
        // It shares the prescription reference with the original dispense.
        let reversal_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO inventory_movements (id, medication_id, movement_type, quantity, reason, reference, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            (&reversal_id, &medication_id, "in", &quantity, "Reversión de dispensación", &reference, &now),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // Audit log: reversal action with the acting user
        let old_values = format!(
            "{{\"movement_id\":\"{}\",\"medication_id\":\"{}\",\"quantity\":{},\"reference\":\"{}\"}}",
            id, medication_id, quantity, reference
        );
        crate::repositories::audit_repo::log(
            conn,
            user_id,
            "reversar_dispensacion",
            "inventory_movements",
            Some(&id),
            Some(&old_values),
            None,
        )?;

        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.commit().map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        }
        Err(e) => {
            conn.rollback().map_err(|re| AppError::Database(re.to_string()))?;
            Err(e)
        }
    }
}

/// Record an inventory movement and update the medication stock atomically.
/// - movement_type "in"  -> increases stock
/// - movement_type "out" -> decreases stock (validated against available stock)
/// Also registers an audit log entry (manual entry/exit) inside the same
/// transaction.
pub fn record_movement(
    conn: &mut DbConnection,
    input: CreateMovementInput,
    user_id: Option<&str>,
) -> Result<InventoryMovement, AppError> {
    if input.quantity <= 0 {
        return Err(AppError::Validation(
            "La cantidad debe ser mayor que cero".to_string(),
        ));
    }
    if input.movement_type != "in" && input.movement_type != "out" {
        return Err(AppError::Validation(
            "Tipo de movimiento invalido (use 'in' o 'out')".to_string(),
        ));
    }

    // Ensure medication exists
    let med = get_by_id(conn, &input.medication_id)?;

    // For outgoing movements, validate we don't go below zero
    if input.movement_type == "out" && input.quantity > med.current_stock {
        return Err(AppError::Validation(format!(
            "Stock insuficiente para '{}': disponible {}, solicitado {}",
            med.name, med.current_stock, input.quantity
        )));
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    // Update stock (+ in, - out)
    let delta = if input.movement_type == "in" {
        input.quantity
    } else {
        -input.quantity
    };

    // Wrap stock update + movement insert in a transaction for atomicity
    conn.begin_transaction().map_err(|e| AppError::Database(e.to_string()))?;
    let result = (|| -> Result<InventoryMovement, AppError> {
        conn.execute(
            "UPDATE medications SET current_stock = current_stock + ?, updated_at = ? WHERE id = ?",
            (&delta, &now, &input.medication_id),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // Record the movement
        conn.execute(
            "INSERT INTO inventory_movements (id, medication_id, movement_type, quantity, reason, reference, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            (&id, &input.medication_id, &input.movement_type, &input.quantity,
             &input.reason, &input.reference, &now),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // Audit log: manual movement with the acting user
        let action = if input.movement_type == "in" {
            "registrar_entrada"
        } else {
            "registrar_salida"
        };
        let reason = input
            .reason
            .clone()
            .unwrap_or_default()
            .replace('\\', "\\\\")
            .replace('"', "\\\"");
        let new_values = format!(
            "{{\"medication_id\":\"{}\",\"movement_type\":\"{}\",\"quantity\":{},\"reason\":\"{}\"}}",
            input.medication_id, input.movement_type, input.quantity, reason
        );
        crate::repositories::audit_repo::log(
            conn,
            user_id,
            action,
            "inventory_movements",
            Some(&id),
            None,
            Some(&new_values),
        )?;

        let rows: Vec<MovementRow> = conn.query(
            "SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                    m.reason, m.reference, m.created_at,
                    CASE WHEN m.reason = 'Reversión de dispensación' AND m.movement_type = 'in' THEN 'reversion'
                        WHEN pr.id IS NOT NULL AND m.movement_type = 'out' THEN 'receta'
                        ELSE 'manual' END AS origin,
                    m.reversed_at
             FROM inventory_movements m
             JOIN medications med ON m.medication_id = med.id
             LEFT JOIN prescriptions pr ON pr.id = m.reference
             WHERE m.id = ?",
            (&id,),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        rows.into_iter().map(map_movement_row).next()
            .ok_or(AppError::Internal("Error al registrar el movimiento".to_string()))
    })();

    match result {
        Ok(movement) => {
            conn.commit().map_err(|e| AppError::Database(e.to_string()))?;
            Ok(movement)
        }
        Err(e) => {
            conn.rollback().map_err(|re| AppError::Database(re.to_string()))?;
            Err(e)
        }
    }
}
