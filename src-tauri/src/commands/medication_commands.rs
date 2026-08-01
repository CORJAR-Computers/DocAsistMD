use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{Medication, CreateMedicationInput};
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
pub fn update_medication_stock(state: State<DbState>, id: String, quantity: i32) -> Result<(), AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::update_stock(&mut conn, &id, quantity)
}

#[tauri::command]
pub fn get_low_stock_medications(state: State<DbState>) -> Result<Vec<Medication>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    medication_repo::get_low_stock(&mut conn)
}
