use crate::errors::AppError;
use crate::models::AuditLogEntry;
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;

type AuditRow = (
    String, Option<String>, Option<String>, String, String, Option<String>,
    Option<String>, Option<String>, Option<String>, String,
);

fn map_row(row: AuditRow) -> AuditLogEntry {
    AuditLogEntry {
        id: row.0, user_id: row.1, user_name: row.2, action: row.3,
        table_name: row.4, record_id: row.5, old_values: row.6,
        new_values: row.7, ip_address: row.8, created_at: row.9,
    }
}

/// Escape a free-text value so it can be embedded safely in a JSON string
/// inside `old_values` / `new_values` (avoids broken JSON on quotes/backslashes).
pub fn json_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
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

/// List audit log entries with optional combined filters:
/// - table_name: only entries of that table
/// - user_id: only entries by that user
/// - action: only entries with that action
/// - date_from / date_to: inclusive date range ("YYYY-MM-DD") on created_at
/// Uses the `? = '' OR col = ?` sentinel pattern so a fixed 12-param tuple
/// works whether or not each filter is provided. Pagination uses Firebird's
/// `ROWS ? TO ?` (start = offset + 1, end = offset + limit).
pub fn get_recent(
    conn: &mut DbConnection,
    limit: i32,
    offset: i32,
    table_name: Option<&str>,
    user_id: Option<&str>,
    action: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<AuditLogEntry>, AppError> {
    let tbl = table_name.unwrap_or("");
    let uid = user_id.unwrap_or("");
    let act = action.unwrap_or("");
    let from = date_from.map(|d| format!("{} 00:00:00", d)).unwrap_or_default();
    let to = date_to.map(|d| format!("{} 23:59:59", d)).unwrap_or_default();
    let offset = offset.max(0);
    let limit = limit.max(1);
    let start = offset + 1;
    let end = offset + limit;

    let rows: Vec<AuditRow> = conn.query(
        "SELECT a.id, a.user_id, u.full_name, a.action, a.table_name, a.record_id,
                a.old_values, a.new_values, a.ip_address, a.created_at
         FROM audit_log a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE (? = '' OR a.table_name = ?)
           AND (? = '' OR a.user_id = ?)
           AND (? = '' OR a.action = ?)
           AND (? = '' OR a.created_at >= ?)
           AND (? = '' OR a.created_at <= ?)
         ORDER BY a.created_at DESC ROWS ? TO ?",
        (&tbl, &tbl, &uid, &uid, &act, &act, &from, &from, &to, &to, &start, &end),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}

/// Export all audit log entries matching the given filters (no pagination).
/// Used by the CSV/Excel export command so the whole filtered history is
/// written, not just the currently visible page.
pub fn get_export(
    conn: &mut DbConnection,
    table_name: Option<&str>,
    user_id: Option<&str>,
    action: Option<&str>,
    date_from: Option<&str>,
    date_to: Option<&str>,
) -> Result<Vec<AuditLogEntry>, AppError> {
    let tbl = table_name.unwrap_or("");
    let uid = user_id.unwrap_or("");
    let act = action.unwrap_or("");
    let from = date_from.map(|d| format!("{} 00:00:00", d)).unwrap_or_default();
    let to = date_to.map(|d| format!("{} 23:59:59", d)).unwrap_or_default();

    let rows: Vec<AuditRow> = conn.query(
        "SELECT a.id, a.user_id, u.full_name, a.action, a.table_name, a.record_id,
                a.old_values, a.new_values, a.ip_address, a.created_at
         FROM audit_log a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE (? = '' OR a.table_name = ?)
           AND (? = '' OR a.user_id = ?)
           AND (? = '' OR a.action = ?)
           AND (? = '' OR a.created_at >= ?)
           AND (? = '' OR a.created_at <= ?)
         ORDER BY a.created_at DESC",
        (&tbl, &tbl, &uid, &uid, &act, &act, &from, &from, &to, &to),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_row).collect())
}
