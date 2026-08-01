use crate::db::DbState;
use crate::errors::AppError;
use crate::financial_excel;
use crate::financial_pdf;
use crate::models::RevenueReport;
use crate::repositories::financial_repo;
use std::path::PathBuf;
use tauri::State;

fn reports_dir() -> PathBuf {
    let docs_dir = std::env::var("USERPROFILE")
        .map(|p| PathBuf::from(p).join("Documents"))
        .or_else(|_| std::env::var("HOME").map(|h| PathBuf::from(h).join("Documents")))
        .unwrap_or_else(|_| PathBuf::from("."));
    docs_dir.join("DocAsistMD").join("Reportes")
}

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
) -> Result<String, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let report = financial_repo::get_revenue_report(&mut conn, &start_date, &end_date)?;

    let out_path = reports_dir().join(format!("reporte-financiero-{}-a-{}.pdf", start_date, end_date));
    financial_pdf::generate_revenue_pdf(&report, &out_path)?;
    Ok(out_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn generate_revenue_excel(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<String, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let report = financial_repo::get_revenue_report(&mut conn, &start_date, &end_date)?;

    let out_path = reports_dir().join(format!("reporte-financiero-{}-a-{}.xlsx", start_date, end_date));
    financial_excel::generate_revenue_excel(&report, &out_path)?;
    Ok(out_path.to_string_lossy().to_string())
}
