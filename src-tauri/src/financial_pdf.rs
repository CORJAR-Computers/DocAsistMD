use crate::errors::AppError;
use crate::invoice_pdf::{
    fmt_currency, fmt_date, fmt_datetime, load_font_family, push_key_value, push_section_title,
};
use crate::models::RevenueReport;
use genpdf::elements::{Break, Paragraph};
use genpdf::style::Style;
use genpdf::{Alignment, Document, Element, PaperSize, SimplePageDecorator};
use std::path::PathBuf;

fn payment_method_label(m: Option<&str>) -> &str {
    match m {
        Some("cash") => "Efectivo",
        Some("card") => "Tarjeta",
        Some("transfer") => "Transferencia",
        Some("insurance") => "Seguro Medico",
        Some(other) => other,
        None => "—",
    }
}

/// Generate a revenue report PDF (period summary + per-doctor breakdown + detail rows).
pub fn generate_revenue_pdf(report: &RevenueReport, out_path: &PathBuf) -> Result<(), AppError> {
    let font_family = load_font_family()?;

    let mut doc = Document::new(font_family);
    doc.set_title(format!("Reporte Financiero {}", &report.period_start));
    doc.set_paper_size(PaperSize::A4);

    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(12);
    doc.set_page_decorator(decorator);

    // ── Header ──
    doc.push(Paragraph::new("DocAsistMD").styled(Style::new().bold().with_font_size(22)));
    doc.push(
        Paragraph::new("REPORTE FINANCIERO")
            .aligned(Alignment::Right)
            .styled(Style::new().bold().with_font_size(16)),
    );
    doc.push(Break::new(1));

    // ── Period ──
    push_key_value(
        &mut doc,
        "Periodo: ",
        &format!("{} a {}", fmt_date(Some(&report.period_start)), fmt_date(Some(&report.period_end))),
        true,
    );
    push_key_value(&mut doc, "Facturas pagadas: ", &report.total_invoices.to_string(), false);
    push_key_value(&mut doc, "Total ingresos: ", &fmt_currency(report.total_revenue), true);

    // ── Per-doctor breakdown ──
    push_section_title(&mut doc, "INGRESOS POR MEDICO");
    for d in &report.by_doctor {
        let mut p = Paragraph::new(&d.doctor_name);
        p.push_styled(format!("  ({} facturas)  ", d.invoice_count), Style::new());
        p.push_styled(fmt_currency(d.total), Style::new().bold());
        doc.push(p);
    }

    // ── Detail rows ──
    push_section_title(&mut doc, "DETALLE DE FACTURAS");
    if report.rows.is_empty() {
        push_key_value(&mut doc, "", "No hay facturas pagadas en el periodo", false);
    } else {
        for r in &report.rows {
            let inv_num = r.invoice_id.chars().take(8).collect::<String>().to_uppercase();
            let mut p = Paragraph::new(format!("{inv_num}  "));
            p.push_styled(format!("{}  ", r.patient_name), Style::new().bold());
            let doctor = r.doctor_name.as_deref().unwrap_or("Sin medico");
            let dt = fmt_datetime(r.payment_date.as_deref());
            p.push_styled(
                format!("{doctor}  {dt}  {}  ", payment_method_label(r.payment_method.as_deref())),
                Style::new(),
            );
            p.push_styled(fmt_currency(r.total), Style::new().bold());
            doc.push(p);
        }
    }

    // ── Footer ──
    doc.push(Break::new(3));
    doc.push(
        Paragraph::new("Reporte generado por DocAsistMD.")
            .aligned(Alignment::Center)
            .styled(Style::new().with_font_size(8)),
    );

    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Internal(format!("Error creando directorio: {}", e)))?;
    }

    doc.render_to_file(out_path)
        .map_err(|e| AppError::Internal(format!("Error generando PDF: {}", e)))?;

    Ok(())
}
