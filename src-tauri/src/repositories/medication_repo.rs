use crate::errors::AppError;
use crate::models::{CreateMedicationInput, CreateMovementInput, InventoryMovement, Medication};
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
    String, String, String, String, i32, Option<String>, Option<String>, String,
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
    }
}

/// List inventory movements with optional combined filters:
/// - medication_id: only movements of that medication
/// - movement_type: "in" | "out"
/// - date_from / date_to: inclusive date range ("YYYY-MM-DD") on created_at
/// Uses the `? = '' OR col = ?` sentinel pattern so a fixed 8-param tuple
/// works whether or not each filter is provided.
pub fn get_movements(
    conn: &mut DbConnection,
    medication_id: Option<&str>,
    movement_type: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<InventoryMovement>, AppError> {
    let mid = medication_id.unwrap_or("");
    let mtype = movement_type.unwrap_or("");
    let from = date_from.map(|d| format!("{} 00:00:00", d)).unwrap_or_default();
    let to = date_to.map(|d| format!("{} 23:59:59", d)).unwrap_or_default();

    let rows: Vec<MovementRow> = conn.query(
        "SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                m.reason, m.reference, m.created_at
         FROM inventory_movements m
         JOIN medications med ON m.medication_id = med.id
         WHERE (? = '' OR m.medication_id = ?)
           AND (? = '' OR m.movement_type = ?)
           AND (? = '' OR m.created_at >= ?)
           AND (? = '' OR m.created_at <= ?)
         ORDER BY m.created_at DESC",
        (&mid, &mid, &mtype, &mtype, &from, &from, &to, &to),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_movement_row).collect())
}

/// Record an inventory movement and update the medication stock atomically.
/// - movement_type "in"  -> increases stock
/// - movement_type "out" -> decreases stock (validated against available stock)
pub fn record_movement(conn: &mut DbConnection, input: CreateMovementInput) -> Result<InventoryMovement, AppError> {
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

        let rows: Vec<MovementRow> = conn.query(
            "SELECT m.id, m.medication_id, med.name, m.movement_type, m.quantity,
                    m.reason, m.reference, m.created_at
             FROM inventory_movements m
             JOIN medications med ON m.medication_id = med.id
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
