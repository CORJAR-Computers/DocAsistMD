use crate::errors::AppError;
use crate::models::{Medication, CreateMedicationInput};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::Utc;

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

pub fn update_stock(conn: &mut DbConnection, id: &str, quantity: i32) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE medications SET current_stock = current_stock + ?, updated_at = ? WHERE id = ?",
        (&quantity, &now, id),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
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
