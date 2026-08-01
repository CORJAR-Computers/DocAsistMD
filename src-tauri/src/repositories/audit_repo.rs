use crate::errors::AppError;
use crate::models::AuditLogEntry;
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::Utc;

type AuditRow = (
    String, Option<String>, String, String, Option<String>,
    Option<String>, Option<String>, Option<String>, String,
);

fn map_row(row: AuditRow) -> AuditLogEntry {
    AuditLogEntry {
        id: row.0, user_id: row.1, action: row.2, table_name: row.3,
        record_id: row.4, old_values: row.5, new_values: row.6,
        ip_address: row.7, created_at: row.8,
    }
}

pub fn log(
    conn: &mut DbConnection,
    user_id: Option<&str>,
    action: &str,
    table_name: &str,
    record_id: Option<&str>,
    old_values: Option<&str>,
    new_values: Option<&str>,
) -> Result<(), AppError> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, table_name, record_id, old_values, new_values, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        (&id, &user_id, &action, &table_name, &record_id, &old_values, &new_values),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

pub fn get_recent(conn: &mut DbConnection, limit: i32) -> Result<Vec<AuditLogEntry>, AppError> {
    let rows: Vec<AuditRow> = conn.query(
        "SELECT id, user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at
         FROM audit_log ORDER BY created_at DESC ROWS ?",
        (limit,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}
