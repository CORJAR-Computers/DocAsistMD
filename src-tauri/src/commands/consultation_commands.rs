use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{Consultation, CreateConsultationInput};
use crate::repositories::consultation_repo;
use tauri::State;

#[tauri::command]
pub fn get_consultations(state: State<DbState>) -> Result<Vec<Consultation>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    consultation_repo::get_all(&mut conn)
}

#[tauri::command]
pub fn get_consultation(state: State<DbState>, id: String) -> Result<Consultation, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    consultation_repo::get_by_id(&mut conn, &id)
}

#[tauri::command]
pub fn get_patient_consultations(state: State<DbState>, patient_id: String) -> Result<Vec<Consultation>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    consultation_repo::get_by_patient(&mut conn, &patient_id)
}

#[tauri::command]
pub fn create_consultation(state: State<DbState>, input: CreateConsultationInput) -> Result<Consultation, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    consultation_repo::create(&mut conn, input)
}
