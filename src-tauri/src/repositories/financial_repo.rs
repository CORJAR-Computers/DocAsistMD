use crate::db::DbConnection;
use crate::errors::AppError;
use crate::models::{RevenueByDoctor, RevenueReport, RevenueRow};
use rsfbclient::Queryable;

type RevenueRowDb = (
    String, String, Option<String>, Option<String>, Option<String>, f64, f64, f64,
);

type DoctorRowDb = (String, i64, f64);

/// Build full-day timestamp bounds: "YYYY-MM-DD 00:00:00" / "YYYY-MM-DD 23:59:59"
/// so the last day of the period is fully included (avoid midnight off-by-one).
fn bounds(start: &str, end: &str) -> (String, String) {
    (format!("{} 00:00:00", start), format!("{} 23:59:59", end))
}

/// Paid invoices (rows) within the period [start, end] (inclusive), ordered by payment date.
/// Only invoices with status 'paid' count as revenue.
fn query_rows(conn: &mut DbConnection, start: &str, end: &str) -> Result<Vec<RevenueRow>, AppError> {
    let (start_ts, end_ts) = bounds(start, end);
    let rows: Vec<RevenueRowDb> = conn.query(
        "SELECT i.id, p.first_name || ' ' || p.last_name,\n\
                d.first_name || ' ' || d.last_name,\n\
                COALESCE(i.paid_at, i.created_at), i.payment_method,\n\
                i.subtotal, i.tax_amount, i.total\n\
         FROM invoices i\n\
         JOIN patients p ON i.patient_id = p.id\n\
         LEFT JOIN appointments a ON i.appointment_id = a.id\n\
         LEFT JOIN doctors d ON a.doctor_id = d.id\n\
         WHERE i.status = 'paid'\n\
           AND COALESCE(i.paid_at, i.created_at) >= ?\n\
           AND COALESCE(i.paid_at, i.created_at) <= ?\n\
         ORDER BY COALESCE(i.paid_at, i.created_at)",
        (&start_ts, &end_ts),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows
        .into_iter()
        .map(|r| RevenueRow {
            invoice_id: r.0,
            patient_name: r.1,
            doctor_name: r.2,
            payment_date: r.3,
            payment_method: r.4,
            subtotal: r.5,
            tax_amount: r.6,
            total: r.7,
        })
        .collect())
}

/// Revenue grouped by doctor within the period.
fn query_by_doctor(conn: &mut DbConnection, start: &str, end: &str) -> Result<Vec<RevenueByDoctor>, AppError> {
    let (start_ts, end_ts) = bounds(start, end);
    let rows: Vec<DoctorRowDb> = conn.query(
        "SELECT COALESCE(d.first_name || ' ' || d.last_name, 'Sin medico'),\n\
                COUNT(*), SUM(i.total)\n\
         FROM invoices i\n\
         LEFT JOIN appointments a ON i.appointment_id = a.id\n\
         LEFT JOIN doctors d ON a.doctor_id = d.id\n\
         WHERE i.status = 'paid'\n\
           AND COALESCE(i.paid_at, i.created_at) >= ?\n\
           AND COALESCE(i.paid_at, i.created_at) <= ?\n\
         GROUP BY COALESCE(d.first_name || ' ' || d.last_name, 'Sin medico')\n\
         ORDER BY SUM(i.total) DESC",
        (&start_ts, &end_ts),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows
        .into_iter()
        .map(|r| RevenueByDoctor {
            doctor_name: r.0,
            invoice_count: r.1,
            total: r.2,
        })
        .collect())
}

/// Build the full revenue report for a period.
pub fn get_revenue_report(conn: &mut DbConnection, start: &str, end: &str) -> Result<RevenueReport, AppError> {
    let rows = query_rows(conn, start, end)?;
    let by_doctor = query_by_doctor(conn, start, end)?;

    let total_revenue: f64 = rows.iter().map(|r| r.total).sum();
    let total_invoices = rows.len() as i64;

    Ok(RevenueReport {
        period_start: start.to_string(),
        period_end: end.to_string(),
        total_invoices,
        total_revenue,
        rows,
        by_doctor,
    })
}
