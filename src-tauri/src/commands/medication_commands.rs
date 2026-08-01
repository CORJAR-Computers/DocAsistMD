use crate::db::DbState;
use crate::errors::AppError;
use crate::exports;
use crate::models::{CreateMedicationInput, CreateMovementInput, InventoryMovement, Medication, MovementDetail};
use crate::movement_export;
use crate::repositories::medication_repo;
use tauri::State;

#[tauri::command]
pub fn get_medications(state: State<DbState>) -> Result<Vec<Medication>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_all(&mut conn)
}

#[tauri::command]
pub fn get_medication(state: State<DbState>, id: String) -> Result<Medication, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_by_id(&mut conn, &id)
}

#[tauri::command]
pub fn create_medication(state: State<DbState>, input: CreateMedicationInput) -> Result<Medication, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::create(&mut conn, input)
}

#[tauri::command]
pub fn get_low_stock_medications(state: State<DbState>) -> Result<Vec<Medication>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_low_stock(&mut conn)
}

#[tauri::command]
pub fn get_expiring_medications(state: State<DbState>, days: i32) -> Result<Vec<Medication>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_expiring(&mut conn, days)
}

#[tauri::command]
pub fn get_inventory_movements(
    state: State<DbState>,
    medication_id: Option<String>,
    movement_type: Option<String>,
    origin: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<InventoryMovement>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_movements(
        &mut conn,
        medication_id.as_deref(),
        movement_type.as_deref(),
        origin.as_deref(),
        date_from.as_deref(),
        date_to.as_deref(),
    )
}

#[tauri::command]
pub fn record_medication_movement(
    state: State<DbState>,
    input: CreateMovementInput,
    user_id: Option<String>,
) -> Result<InventoryMovement, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::record_movement(&mut conn, input, user_id.as_deref())
}

#[tauri::command]
pub fn get_movement_detail(
    state: State<DbState>,
    movement_id: String,
) -> Result<MovementDetail, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_movement_detail(&mut conn, &movement_id)
}

/// Export the inventory movements matching the given filters to CSV or Excel.
/// `format` is "csv" or "excel". `out_dir` is optional: when provided the
/// file is saved there, otherwise in Documents/DocAsistMD/Reportes.
/// Returns the path of the generated file.
#[tauri::command]
pub fn export_inventory_movements(
    state: State<DbState>,
    format: String,
    medication_id: Option<String>,
    movement_type: Option<String>,
    origin: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    out_dir: Option<String>,
) -> Result<String, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    let entries = medication_repo::get_movements(
        &mut conn,
        medication_id.as_deref(),
        movement_type.as_deref(),
        origin.as_deref(),
        date_from.as_deref(),
        date_to.as_deref(),
    )?;

    if entries.is_empty() {
        return Err(AppError::Validation(
            "No hay movimientos con los filtros seleccionados".to_string(),
        ));
    }

    let ts = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let base = exports::resolve_dir(out_dir.as_deref(), "Reportes");
    let out_path = if format == "excel" {
        base.join(format!("movimientos-{}.xlsx", ts))
    } else {
        base.join(format!("movimientos-{}.csv", ts))
    };

    if format == "excel" {
        movement_export::generate_movements_excel(&entries, &out_path)?;
    } else {
        movement_export::generate_movements_csv(&entries, &out_path)?;
    }

    Ok(out_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_consultation_dispensed_movements(
    state: State<DbState>,
    consultation_id: String,
) -> Result<Vec<InventoryMovement>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_dispensed_movements(&mut conn, &consultation_id)
}

#[tauri::command]
pub fn undo_prescription_dispense(
    state: State<DbState>,
    movement_id: String,
    user_id: Option<String>,
) -> Result<(), AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::reverse_dispense(&mut conn, &movement_id, user_id.as_deref())
}
