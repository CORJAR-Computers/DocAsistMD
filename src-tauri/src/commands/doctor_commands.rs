use crate::db::DbState;
use crate::errors::AppError;
use crate::models::Doctor;
use crate::repositories::doctor_repo;
use tauri::State;

#[tauri::command]
pub fn get_doctors(state: State<DbState>) -> Result<Vec<Doctor>, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    doctor_repo::get_all(&mut conn)
}

#[tauri::command]
pub fn get_doctor(state: State<DbState>, id: String) -> Result<Doctor, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    doctor_repo::get_by_id(&mut conn, &id)
}
