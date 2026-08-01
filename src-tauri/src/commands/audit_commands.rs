use crate::audit_export;
use crate::db::DbState;
use crate::errors::AppError;
use crate::exports;
use crate::models::AuditLogEntry;
use crate::repositories::audit_repo;
use crate::session::SessionState;
use tauri::State;

#[tauri::command]
pub fn get_audit_log(
    state: State<DbState>,
    session: State<SessionState>,
    table_name: Option<String>,
    user_id: Option<String>,
    action: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<AuditLogEntry>, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_admin(&session, &mut conn)?;
    let limit = limit.unwrap_or(100).clamp(1, 500);
    let offset = offset.unwrap_or(0).clamp(0, 1_000_000);
    audit_repo::get_recent(
        &mut conn,
        limit,
        offset,
        table_name.as_deref(),
        user_id.as_deref(),
        action.as_deref(),
        date_from.as_deref(),
        date_to.as_deref(),
    )
}

/// Export the audit log matching the given filters to CSV, Excel or PDF.
/// `format` is "csv", "excel" or "pdf". `out_dir` is optional: when provided
/// the file is saved there, otherwise in Documents/DocAsistMD/Reportes.
/// Returns the path of the generated file.
#[tauri::command]
pub fn export_audit_log(
    state: State<DbState>,
    session: State<SessionState>,
    format: String,
    table_name: Option<String>,
    user_id: Option<String>,
    action: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    out_dir: Option<String>,
) -> Result<String, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_admin(&session, &mut conn)?;

    let entries = audit_repo::get_export(
        &mut conn,
        table_name.as_deref(),
        user_id.as_deref(),
        action.as_deref(),
        date_from.as_deref(),
        date_to.as_deref(),
    )?;

    if entries.is_empty() {
        return Err(AppError::Validation(
            "No hay eventos de auditoría con los filtros seleccionados".to_string(),
        ));
    }

    let ts = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let base = exports::resolve_dir(out_dir.as_deref(), "Reportes");
    let out_path = if format == "excel" {
        base.join(format!("auditoria-{}.xlsx", ts))
    } else if format == "pdf" {
        base.join(format!("auditoria-{}.pdf", ts))
    } else {
        base.join(format!("auditoria-{}.csv", ts))
    };

    if format == "excel" {
        audit_export::generate_audit_excel(&entries, &out_path)?;
    } else if format == "pdf" {
        audit_export::generate_audit_pdf(&entries, &out_path)?;
    } else {
        audit_export::generate_audit_csv(&entries, &out_path)?;
    }

    Ok(out_path.to_string_lossy().to_string())
}
