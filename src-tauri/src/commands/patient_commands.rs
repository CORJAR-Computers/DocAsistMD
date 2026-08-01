use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{CreatePatientInput, Patient};
use crate::repositories::patient_repo;
use tauri::State;

#[tauri::command]
pub fn get_patients(state: State<DbState>) -> Result<Vec<Patient>, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    patient_repo::get_all(&mut conn)
}

#[tauri::command]
pub fn get_patient(state: State<DbState>, id: String) -> Result<Patient, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    patient_repo::get_by_id(&mut conn, &id)
}

#[tauri::command]
pub fn create_patient(
    state: State<DbState>,
    input: CreatePatientInput,
    user_id: Option<String>,
) -> Result<Patient, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    patient_repo::create(&mut conn, input, user_id.as_deref())
}

#[tauri::command]
pub fn search_patients(state: State<DbState>, query: String) -> Result<Vec<Patient>, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    patient_repo::search(&mut conn, &query)
}

#[tauri::command]
pub fn update_patient(
    state: State<DbState>,
    id: String,
    input: CreatePatientInput,
    user_id: Option<String>,
) -> Result<Patient, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    patient_repo::update(&mut conn, &id, input, user_id.as_deref())
}

#[tauri::command]
pub fn delete_patient(
    state: State<DbState>,
    id: String,
    user_id: Option<String>,
) -> Result<(), AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    patient_repo::delete(&mut conn, &id, user_id.as_deref())
}
