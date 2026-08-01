use crate::db::DbState;
use crate::errors::AppError;
use crate::exports;
use crate::models::{Prescription, CreatePrescriptionInput, PrescriptionPdfResult};
use crate::prescription_pdf;
use crate::repositories::prescription_repo;
use tauri::State;

#[tauri::command]
pub fn get_consultation_prescriptions(state: State<DbState>, consultation_id: String) -> Result<Vec<Prescription>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    prescription_repo::get_by_consultation(&mut conn, &consultation_id)
}

#[tauri::command]
pub fn create_prescription(
    state: State<DbState>,
    input: CreatePrescriptionInput,
    user_id: Option<String>,
) -> Result<Prescription, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    prescription_repo::create(&mut conn, input, user_id.as_deref())
}

/// Generate the prescription PDF with QR verification code. `out_dir` is
/// optional: when provided the file is saved there, otherwise in
/// Documents/DocAsistMD/Recetas. Returns the path and the verification code.
#[tauri::command]
pub fn generate_prescription_pdf(
    state: State<DbState>,
    consultation_id: String,
    out_dir: Option<String>,
) -> Result<PrescriptionPdfResult, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let detail = prescription_repo::get_detail(&mut conn, &consultation_id)?;

    let base = exports::resolve_dir(out_dir.as_deref(), "Recetas");
    let short_id = detail.consultation_id.chars().take(8).collect::<String>().to_uppercase();
    let out_path = base.join(format!("receta-{}.pdf", short_id));

    prescription_pdf::generate_prescription_pdf(&detail, &out_path)?;

    let verification_code = prescription_pdf::build_verification_code(&detail.consultation_id, &detail.created_at);
    Ok(PrescriptionPdfResult {
        path: out_path.to_string_lossy().to_string(),
        verification_code,
    })
}
