use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{AppointmentWithNames, CreateAppointmentInput};
use crate::repositories::appointment_repo;
use tauri::State;

#[tauri::command]
pub fn get_appointments(state: State<DbState>) -> Result<Vec<AppointmentWithNames>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    appointment_repo::get_all(&mut conn)
}

#[tauri::command]
pub fn create_appointment(state: State<DbState>, input: CreateAppointmentInput) -> Result<(), AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    appointment_repo::create(&mut conn, input)?;
    Ok(())
}

#[tauri::command]
pub fn update_appointment_status(state: State<DbState>, id: String, status: String) -> Result<(), AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    appointment_repo::update_status(&mut conn, &id, &status)
}
