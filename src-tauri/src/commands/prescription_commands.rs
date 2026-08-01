use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{Prescription, CreatePrescriptionInput};
use crate::repositories::prescription_repo;
use tauri::State;

#[tauri::command]
pub fn get_consultation_prescriptions(state: State<DbState>, consultation_id: String) -> Result<Vec<Prescription>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    prescription_repo::get_by_consultation(&mut conn, &consultation_id)
}

#[tauri::command]
pub fn create_prescription(state: State<DbState>, input: CreatePrescriptionInput) -> Result<Prescription, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    prescription_repo::create(&mut conn, input)
}
