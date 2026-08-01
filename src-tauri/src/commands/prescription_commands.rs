use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{Prescription, CreatePrescriptionInput, PrescriptionPdfResult};
use crate::prescription_pdf;
use crate::repositories::prescription_repo;
use std::path::PathBuf;
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

#[tauri::command]
pub fn generate_prescription_pdf(state: State<DbState>, consultation_id: String) -> Result<PrescriptionPdfResult, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let detail = prescription_repo::get_detail(&mut conn, &consultation_id)?;

    // Save PDF into the user's Documents folder under DocAsistMD/Recetas
    let docs_dir = std::env::var("USERPROFILE")
        .map(|p| PathBuf::from(p).join("Documents"))
        .or_else(|_| std::env::var("HOME").map(|h| PathBuf::from(h).join("Documents")))
        .unwrap_or_else(|_| PathBuf::from("."));
    let out_dir = docs_dir.join("DocAsistMD").join("Recetas");
    let short_id = detail.consultation_id.chars().take(8).collect::<String>().to_uppercase();
    let out_path = out_dir.join(format!("receta-{}.pdf", short_id));

    prescription_pdf::generate_prescription_pdf(&detail, &out_path)?;

    let verification_code = prescription_pdf::build_verification_code(&detail.consultation_id, &detail.created_at);
    Ok(PrescriptionPdfResult {
        path: out_path.to_string_lossy().to_string(),
        verification_code,
    })
}
