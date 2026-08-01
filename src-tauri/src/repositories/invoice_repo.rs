use crate::errors::AppError;
use crate::models::{Invoice, InvoiceWithPatient, CreateInvoiceInput};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;
use chrono::Utc;

type InvoiceRow = (
    String, Option<String>, String, f64, f64, f64, f64,
    String, Option<String>, Option<String>, Option<String>, String,
);

fn map_row(row: InvoiceRow) -> Invoice {
    Invoice {
        id: row.0, appointment_id: row.1, patient_id: row.2, subtotal: row.3,
        tax_rate: row.4, tax_amount: row.5, total: row.6, status: row.7,
        payment_method: row.8, due_date: row.9, paid_at: row.10, created_at: row.11,
    }
}

type InvoiceWithPatientRow = (
    String, Option<String>, String, String, f64, f64, f64, f64,
    String, Option<String>, Option<String>, Option<String>, String,
);

fn map_with_patient_row(row: InvoiceWithPatientRow) -> InvoiceWithPatient {
    InvoiceWithPatient {
        id: row.0, appointment_id: row.1, patient_id: row.2, patient_name: row.3,
        subtotal: row.4, tax_rate: row.5, tax_amount: row.6, total: row.7,
        status: row.8, payment_method: row.9, due_date: row.10, paid_at: row.11, created_at: row.12,
    }
}

pub fn get_all(conn: &mut DbConnection) -> Result<Vec<InvoiceWithPatient>, AppError> {
    let rows: Vec<InvoiceWithPatientRow> = conn.query(
        "SELECT i.id, i.appointment_id, i.patient_id, p.first_name || ' ' || p.last_name,
                i.subtotal, i.tax_rate, i.tax_amount, i.total, i.status,
                i.payment_method, i.due_date, i.paid_at, i.created_at
         FROM invoices i
         JOIN patients p ON i.patient_id = p.id
         ORDER BY i.created_at DESC",
        (),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_with_patient_row).collect())
}

pub fn get_by_id(conn: &mut DbConnection, id: &str) -> Result<Invoice, AppError> {
    let rows: Vec<InvoiceRow> = conn.query(
        "SELECT id, appointment_id, patient_id, subtotal, tax_rate, tax_amount, total,
                status, payment_method, due_date, paid_at, created_at
         FROM invoices WHERE id = ?",
        (id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    rows.into_iter().map(map_row).next()
        .ok_or(AppError::NotFound(format!("Factura {} no encontrada", id)))
}

pub fn create(conn: &mut DbConnection, input: CreateInvoiceInput) -> Result<Invoice, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tax_amount = input.subtotal * input.tax_rate;
    let total = input.subtotal + tax_amount;

    conn.execute(
        "INSERT INTO invoices (id, appointment_id, patient_id, subtotal, tax_rate,
         tax_amount, total, status, payment_method, due_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
        (&id, &input.appointment_id, &input.patient_id, &input.subtotal,
         &input.tax_rate, &tax_amount, &total, &input.payment_method,
         &input.due_date, &now),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    get_by_id(conn, &id)
}

pub fn update_status(conn: &mut DbConnection, id: &str, status: &str, payment_method: Option<&str>) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();

    if status == "paid" {
        conn.execute(
            "UPDATE invoices SET status = ?, payment_method = ?, paid_at = ? WHERE id = ?",
            (status, payment_method, &now, id),
        ).map_err(|e| AppError::Database(e.to_string()))?;
    } else {
        conn.execute(
            "UPDATE invoices SET status = ? WHERE id = ?",
            (status, id),
        ).map_err(|e| AppError::Database(e.to_string()))?;
    }

    Ok(())
}
