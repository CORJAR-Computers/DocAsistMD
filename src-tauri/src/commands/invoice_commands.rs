use crate::db::DbState;
use crate::errors::AppError;
use crate::models::{Invoice, InvoiceWithPatient, CreateInvoiceInput};
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
pub fn create_invoice(state: State<DbState>, input: CreateInvoiceInput) -> Result<Invoice, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    invoice_repo::create(&mut conn, input)
}

#[tauri::command]
pub fn update_invoice_status(state: State<DbState>, id: String, status: String, payment_method: Option<String>) -> Result<(), AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    invoice_repo::update_status(&mut conn, &id, &status, payment_method.as_deref())
}
