use crate::errors::AppError;
use crate::exports::save_xlsx;
use crate::models::RevenueReport;
use rust_xlsxwriter::{Format, Workbook};
use std::path::PathBuf;

fn payment_method_label(m: Option<&str>) -> String {
    match m {
        Some("cash") => "Efectivo".to_string(),
        Some("card") => "Tarjeta".to_string(),
        Some("transfer") => "Transferencia".to_string(),
        Some("insurance") => "Seguro Medico".to_string(),
        Some(other) => other.to_string(),
        None => "-".to_string(),
    }
}

/// Generate a revenue report XLSX with three sheets: Resumen, Por Medico, Detalle.
pub fn generate_revenue_excel(report: &RevenueReport, out_path: &PathBuf) -> Result<(), AppError> {
    let mut workbook = Workbook::new();

    // ── Formats ──
    let title_fmt = Format::new().set_bold().set_font_size(16);
    let header_fmt = Format::new()
        .set_bold()
        .set_background_color(rust_xlsxwriter::Color::RGB(0x1B6B93))
        .set_font_color(rust_xlsxwriter::Color::White);
    let money_fmt = Format::new().set_num_format("#,##0");

    // ── Sheet 1: Resumen ──
    let summary = workbook.add_worksheet();
    summary.set_name("Resumen")?;
    summary.set_column_width(0, 26)?;
    summary.set_column_width(1, 18)?;

    summary.write_string_with_format(0, 0, "Reporte Financiero", &title_fmt)?;
    summary.write_string(2, 0, "Periodo")?;
    summary.write_string(2, 1, &format!("{} a {}", report.period_start, report.period_end))?;
    summary.write_string(3, 0, "Facturas pagadas")?;
    summary.write_number(3, 1, report.total_invoices as f64)?;
    summary.write_string(4, 0, "Total ingresos")?;
    summary.write_number_with_format(4, 1, report.total_revenue, &money_fmt)?;

    // ── Sheet 2: Por Medico ──
    let by_doctor = workbook.add_worksheet();
    by_doctor.set_name("Por Medico")?;
    by_doctor.set_column_width(0, 30)?;
    by_doctor.set_column_width(1, 16)?;
    by_doctor.set_column_width(2, 16)?;

    by_doctor.write_string_with_format(0, 0, "Medico", &header_fmt)?;
    by_doctor.write_string_with_format(0, 1, "Facturas", &header_fmt)?;
    by_doctor.write_string_with_format(0, 2, "Total", &header_fmt)?;

    for (i, d) in report.by_doctor.iter().enumerate() {
        let row = i as u32 + 1;
        by_doctor.write_string(row, 0, &d.doctor_name)?;
        by_doctor.write_number(row, 1, d.invoice_count as f64)?;
        by_doctor.write_number_with_format(row, 2, d.total, &money_fmt)?;
    }

    // ── Sheet 3: Detalle ──
    let detail = workbook.add_worksheet();
    detail.set_name("Detalle")?;
    let widths = [14, 24, 26, 20, 14, 14, 14, 14];
    for (i, w) in widths.iter().enumerate() {
        detail.set_column_width(i as u16, *w)?;
    }

    let headers = ["Factura", "Paciente", "Medico", "Fecha pago", "Metodo", "Subtotal", "IVA", "Total"];
    for (i, h) in headers.iter().enumerate() {
        detail.write_string_with_format(0, i as u16, *h, &header_fmt)?;
    }

    for (i, r) in report.rows.iter().enumerate() {
        let row = i as u32 + 1;
        let inv_num = r.invoice_id.chars().take(8).collect::<String>().to_uppercase();
        detail.write_string(row, 0, &inv_num)?;
        detail.write_string(row, 1, &r.patient_name)?;
        detail.write_string(row, 2, r.doctor_name.as_deref().unwrap_or("Sin medico"))?;
        detail.write_string(row, 3, r.payment_date.as_deref().unwrap_or(""))?;
        detail.write_string(row, 4, &payment_method_label(r.payment_method.as_deref()))?;
        detail.write_number_with_format(row, 5, r.subtotal, &money_fmt)?;
        detail.write_number_with_format(row, 6, r.tax_amount, &money_fmt)?;
        detail.write_number_with_format(row, 7, r.total, &money_fmt)?;
    }

    save_xlsx(&mut workbook, out_path)?;

    Ok(())
}
