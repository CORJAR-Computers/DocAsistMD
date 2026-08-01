use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{CreateMedicationInput, CreateMovementInput, InventoryMovement, Medication};
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
pub fn get_inventory_movements(state: State<DbState>, medication_id: Option<String>) -> Result<Vec<InventoryMovement>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_movements(&mut conn, medication_id.as_deref())
}

#[tauri::command]
pub fn record_medication_movement(state: State<DbState>, input: CreateMovementInput) -> Result<InventoryMovement, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::record_movement(&mut conn, input)
}
