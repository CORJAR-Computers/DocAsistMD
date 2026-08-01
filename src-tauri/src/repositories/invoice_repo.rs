use crate::errors::AppError;
use crate::models::{Invoice, InvoiceWithPatient, CreateInvoiceInput, InvoiceDetail};
use crate::db::DbConnection;
use rsfbclient::{Queryable, Execute};
use uuid::Uuid;

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

pub fn create(
    conn: &mut DbConnection,
    input: CreateInvoiceInput,
    user_id: Option<&str>,
) -> Result<Invoice, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = crate::db::now_timestamp();
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

    let invoice = get_by_id(conn, &id)?;

    let new_values = format!(
        "{{\"patient_id\":\"{}\",\"appointment_id\":\"{}\",\"subtotal\":{},\"tax_rate\":{},\"tax_amount\":{},\"total\":{},\"status\":\"{}\"}}",
        crate::repositories::audit_repo::json_escape(&invoice.patient_id),
        crate::repositories::audit_repo::json_escape(invoice.appointment_id.as_deref().unwrap_or("")),
        invoice.subtotal,
        invoice.tax_rate,
        invoice.tax_amount,
        invoice.total,
        crate::repositories::audit_repo::json_escape(&invoice.status),
    );
    crate::repositories::audit_repo::log(
        conn,
        user_id,
        "crear_factura",
        "invoices",
        Some(&id),
        None,
        Some(&new_values),
    )?;

    Ok(invoice)
}

pub fn get_detail(conn: &mut DbConnection, id: &str) -> Result<InvoiceDetail, AppError> {
    type DetailRow1 = (
        String, Option<String>, String, String, Option<String>, Option<String>,
        Option<String>, Option<String>, f64, f64, f64, f64, String, Option<String>, String,
    );
    let rows1: Vec<DetailRow1> = conn.query(
        "SELECT i.id, i.appointment_id, i.patient_id,
                p.first_name || ' ' || p.last_name,
                p.document_id, p.phone, p.email, p.address,
                i.subtotal, i.tax_rate, i.tax_amount, i.total, i.status,
                i.payment_method, i.created_at
         FROM invoices i
         JOIN patients p ON i.patient_id = p.id
         WHERE i.id = ?",
        (id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let r1 = rows1.into_iter().next()
        .ok_or(AppError::NotFound(format!("Factura {} no encontrada", id)))?;

    type DetailRow2 = (Option<String>, Option<String>, Option<String>, Option<String>);
    let rows2: Vec<DetailRow2> = conn.query(
        "SELECT d.first_name || ' ' || d.last_name, a.date_time, i.due_date, i.paid_at
         FROM invoices i
         LEFT JOIN appointments a ON i.appointment_id = a.id
         LEFT JOIN doctors d ON a.doctor_id = d.id
         WHERE i.id = ?",
        (id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let r2 = rows2.into_iter().next().unwrap_or((None, None, None, None));

    Ok(InvoiceDetail {
        id: r1.0,
        appointment_id: r1.1,
        patient_id: r1.2,
        patient_name: r1.3,
        patient_document: r1.4,
        patient_phone: r1.5,
        patient_email: r1.6,
        patient_address: r1.7,
        subtotal: r1.8,
        tax_rate: r1.9,
        tax_amount: r1.10,
        total: r1.11,
        status: r1.12,
        payment_method: r1.13,
        created_at: r1.14,
        doctor_name: r2.0,
        appointment_date_time: r2.1,
        due_date: r2.2,
        paid_at: r2.3,
    })
}

pub fn update_status(
    conn: &mut DbConnection,
    id: &str,
    status: &str,
    payment_method: Option<&str>,
    user_id: Option<&str>,
) -> Result<(), AppError> {
    let now = crate::db::now_timestamp();

    // Capture previous status for the audit log before updating
    let old_rows: Vec<(String,)> = conn.query(
        "SELECT status FROM invoices WHERE id = ?",
        (id,),
    ).map_err(|e| AppError::Database(e.to_string()))?;
    let old_status = old_rows
        .into_iter()
        .next()
        .ok_or_else(|| AppError::NotFound(format!("Factura {} no encontrada", id)))?
        .0;

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

    let old_values = format!(
        "{{\"status\":\"{}\"}}",
        crate::repositories::audit_repo::json_escape(&old_status)
    );
    let new_values = format!(
        "{{\"status\":\"{}\",\"payment_method\":\"{}\"}}",
        crate::repositories::audit_repo::json_escape(status),
        crate::repositories::audit_repo::json_escape(payment_method.unwrap_or("")),
    );
    crate::repositories::audit_repo::log(
        conn,
        user_id,
        "editar_factura",
        "invoices",
        Some(id),
        Some(&old_values),
        Some(&new_values),
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{make_patient, TestDb};

    #[test]
    fn create_and_get_roundtrip() {
        let mut db = TestDb::new().expect("create test db");
        let patient_id = make_patient(db.conn(), "CC-INV-1001");

        let input = CreateInvoiceInput {
            patient_id: patient_id.clone(),
            appointment_id: None,
            subtotal: 100.0,
            tax_rate: 0.19,
            tax_amount: 19.0,
            total: 119.0,
            payment_method: Some("efectivo".to_string()),
            due_date: Some("2026-09-01".to_string()),
        };
        let created = create(db.conn(), input, None).expect("create invoice");
        assert!(!created.id.is_empty());
        assert_eq!(created.status, "pending");

        let fetched = get_by_id(db.conn(), &created.id).expect("get by id");
        assert_eq!(fetched.patient_id, patient_id);
        assert_eq!(fetched.subtotal, 100.0);
        assert_eq!(fetched.payment_method.as_deref(), Some("efectivo"));
    }

    #[test]
    fn update_status_marks_paid() {
        let mut db = TestDb::new().expect("create test db");
        let patient_id = make_patient(db.conn(), "CC-INV-1002");

        let input = CreateInvoiceInput {
            patient_id,
            appointment_id: None,
            subtotal: 50.0,
            tax_rate: 0.19,
            tax_amount: 9.5,
            total: 59.5,
            payment_method: None,
            due_date: None,
        };
        let created = create(db.conn(), input, None).expect("create invoice");

        update_status(db.conn(), &created.id, "paid", Some("efectivo"), None)
            .expect("mark paid");

        let fetched = get_by_id(db.conn(), &created.id).expect("get by id");
        assert_eq!(fetched.status, "paid");
        assert!(fetched.paid_at.is_some(), "paid_at should be set");
    }
}
