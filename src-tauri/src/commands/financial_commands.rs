use crate::db::DbState;
use crate::errors::AppError;
use crate::exports;
use crate::financial_excel;
use crate::financial_pdf;
use crate::models::RevenueReport;
use crate::repositories::financial_repo;
use tauri::State;

#[tauri::command]
pub fn get_revenue_report(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<RevenueReport, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    financial_repo::get_revenue_report(&mut conn, &start_date, &end_date)
}

#[tauri::command]
pub fn generate_revenue_pdf(
    state: State<DbState>,
    start_date: String,
    end_date: String,
    out_dir: Option<String>,
) -> Result<String, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let report = financial_repo::get_revenue_report(&mut conn, &start_date, &end_date)?;

    let out_path = exports::resolve_dir(out_dir.as_deref(), "Reportes").join(format!("reporte-financiero-{}-a-{}.pdf", start_date, end_date));
    financial_pdf::generate_revenue_pdf(&report, &out_path)?;
    Ok(out_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn generate_revenue_excel(
    state: State<DbState>,
    start_date: String,
    end_date: String,
    out_dir: Option<String>,
) -> Result<String, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let report = financial_repo::get_revenue_report(&mut conn, &start_date, &end_date)?;

    let out_path = exports::resolve_dir(out_dir.as_deref(), "Reportes").join(format!("reporte-financiero-{}-a-{}.xlsx", start_date, end_date));
    financial_excel::generate_revenue_excel(&report, &out_path)?;
    Ok(out_path.to_string_lossy().to_string())
}
