use crate::db::DbState;
use crate::errors::AppError;
use crate::exports;
use crate::invoice_pdf;
use crate::models::{Invoice, InvoiceWithPatient, CreateInvoiceInput, InvoiceDetail};
use crate::repositories::invoice_repo;
use tauri::State;

#[tauri::command]
pub fn get_invoices(state: State<DbState>) -> Result<Vec<InvoiceWithPatient>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    invoice_repo::get_all(&mut conn)
}

#[tauri::command]
pub fn get_invoice(state: State<DbState>, id: String) -> Result<Invoice, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    invoice_repo::get_by_id(&mut conn, &id)
}

#[tauri::command]
pub fn create_invoice(
    state: State<DbState>,
    input: CreateInvoiceInput,
    user_id: Option<String>,
) -> Result<Invoice, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    invoice_repo::create(&mut conn, input, user_id.as_deref())
}

#[tauri::command]
pub fn update_invoice_status(
    state: State<DbState>,
    id: String,
    status: String,
    payment_method: Option<String>,
    user_id: Option<String>,
) -> Result<(), AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    invoice_repo::update_status(&mut conn, &id, &status, payment_method.as_deref(), user_id.as_deref())
}

#[tauri::command]
pub fn get_invoice_detail(state: State<DbState>, id: String) -> Result<InvoiceDetail, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    invoice_repo::get_detail(&mut conn, &id)
}

/// Generate the invoice PDF. `out_dir` is optional: when provided the file is
/// saved there, otherwise in Documents/DocAsistMD/Comprobantes. Returns the path.
#[tauri::command]
pub fn generate_invoice_pdf(
    state: State<DbState>,
    id: String,
    out_dir: Option<String>,
) -> Result<String, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let detail = invoice_repo::get_detail(&mut conn, &id)?;

    let base = exports::resolve_dir(out_dir.as_deref(), "Comprobantes");
    let short_id = detail.id.chars().take(8).collect::<String>().to_uppercase();
    let out_path = base.join(format!("factura-{}.pdf", short_id));

    invoice_pdf::generate_invoice_pdf(&detail, &out_path)?;
    Ok(out_path.to_string_lossy().to_string())
}
