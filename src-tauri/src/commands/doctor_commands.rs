use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{Doctor, CreateDoctorInput};
use crate::repositories::doctor_repo;
use crate::session::SessionState;
use tauri::State;

#[tauri::command]
pub fn get_doctors(
    state: State<DbState>,
    session: State<SessionState>,
) -> Result<Vec<Doctor>, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_session(&session, &mut conn)?;
    doctor_repo::get_all(&mut conn)
}

#[tauri::command]
pub fn get_doctor(
    state: State<DbState>,
    session: State<SessionState>,
    id: String,
) -> Result<Doctor, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_session(&session, &mut conn)?;
    doctor_repo::get_by_id(&mut conn, &id)
}

#[tauri::command]
pub fn create_doctor(
    state: State<DbState>,
    session: State<SessionState>,
    input: CreateDoctorInput,
) -> Result<Doctor, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_admin(&session, &mut conn)?;
    doctor_repo::create(&mut conn, input)
}

