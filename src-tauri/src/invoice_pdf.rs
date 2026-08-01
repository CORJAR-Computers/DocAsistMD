use crate::errors::AppError;
use crate::models::InvoiceDetail;
use genpdf::elements::{Break, Paragraph};
use genpdf::fonts::{FontData, FontFamily};
use genpdf::style::Style;
use genpdf::{Alignment, Document, Element, PaperSize, SimplePageDecorator};
use std::path::PathBuf;

/// Try to load a font family from common Windows system font paths.
/// pub(crate) so prescription_pdf can reuse it.
pub(crate) fn load_font_family() -> Result<FontFamily<FontData>, AppError> {
    let windir = std::env::var("WINDIR")
        .or_else(|_| std::env::var("SystemRoot"))
        .unwrap_or_else(|_| "C:\\Windows".to_string());
    let font_dir = PathBuf::from(&windir).join("Fonts");

    // Candidate families: (regular, bold, italic, bold_italic)
    let candidates: &[(&str, &str, &str, &str)] = &[
        ("arial.ttf", "arialbd.ttf", "ariali.ttf", "arialbi.ttf"),
        ("segoeui.ttf", "segoeuib.ttf", "segoeuii.ttf", "segoeuiz.ttf"),
        ("times.ttf", "timesbd.ttf", "timesi.ttf", "timesbi.ttf"),
    ];

    for (regular, bold, italic, bold_italic) in candidates {
        let regular_path = font_dir.join(regular);
        let bold_path = font_dir.join(bold);
        let italic_path = font_dir.join(italic);
        let bold_italic_path = font_dir.join(bold_italic);

        if !regular_path.exists() || !bold_path.exists() || !italic_path.exists() || !bold_italic_path.exists() {
            continue;
        }

        let load = |p: &PathBuf| -> Result<FontData, AppError> {
            FontData::load(p, None).map_err(|e| AppError::Internal(format!("Error cargando fuente: {}", e)))
        };

        return Ok(FontFamily {
            regular: load(&regular_path)?,
            bold: load(&bold_path)?,
            italic: load(&italic_path)?,
            bold_italic: load(&bold_italic_path)?,
        });
    }

    Err(AppError::Internal(
        "No se encontraron fuentes del sistema (arial/segoe/times) para generar el PDF".to_string(),
    ))
}

pub(crate) fn fmt_currency(n: f64) -> String {
    let s = format!("{:.0}", n);
    let mut result = String::new();
    let chars: Vec<char> = s.chars().collect();
    for (i, c) in chars.iter().enumerate() {
        if i > 0 && (chars.len() - i) % 3 == 0 {
            result.push('.');
        }
        result.push(*c);
    }
    format!("$ {}", result)
}

pub(crate) fn fmt_date(s: Option<&str>) -> String {
    match s {
        Some(v) if !v.is_empty() => {
            let d = v.split('T').next().unwrap_or(v);
            let parts: Vec<&str> = d.split('-').collect();
            if parts.len() == 3 {
                format!("{}/{}/{}", parts[2], parts[1], parts[0])
            } else {
                d.to_string()
            }
        }
        _ => "—".to_string(),
    }
}

pub(crate) fn fmt_datetime(s: Option<&str>) -> String {
    match s {
        Some(v) if !v.is_empty() => {
            let dt = v.replace('T', " ");
            if dt.len() >= 16 {
                dt[..16].to_string()
            } else {
                dt
            }
        }
        _ => "—".to_string(),
    }
}

pub(crate) fn push_key_value(doc: &mut Document, label: &str, value: &str, bold_value: bool) {
    let mut p = Paragraph::new(label);
    let style = if bold_value {
        Style::new().bold()
    } else {
        Style::new()
    };
    p.push_styled(value, style);
    doc.push(p);
}

pub(crate) fn push_section_title(doc: &mut Document, title: &str) {
    doc.push(Break::new(1));
    doc.push(Paragraph::new(title).styled(Style::new().bold().with_font_size(11)));
    doc.push(Break::new(1));
}

fn push_total_row(doc: &mut Document, label: &str, value: &str) {
    let mut p = Paragraph::new(label);
    p.push_styled(value, Style::new().bold().with_font_size(13));
    p.set_alignment(Alignment::Right);
    doc.push(p);
}

/// Generate a PDF invoice and save it to the given path. Returns the path on success.
pub fn generate_invoice_pdf(detail: &InvoiceDetail, out_path: &PathBuf) -> Result<(), AppError> {
    let font_family = load_font_family()?;

    let mut doc = Document::new(font_family);
    doc.set_title(format!("Factura {}", &detail.id[..detail.id.len().min(8)]));
    doc.set_paper_size(PaperSize::A4);

    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(12);
    doc.set_page_decorator(decorator);

    // ── Header ──
    doc.push(Paragraph::new("DocAsistMD").styled(Style::new().bold().with_font_size(22)));
    doc.push(
        Paragraph::new("Comprobante de Factura")
            .aligned(Alignment::Right)
            .styled(Style::new().with_font_size(12)),
    );

    doc.push(Break::new(1));

    // ── Invoice info ──
    let inv_num = detail.id.chars().take(8).collect::<String>().to_uppercase();
    push_key_value(&mut doc, "Factura N°: ", &inv_num, true);
    push_key_value(&mut doc, "Fecha de emision: ", &fmt_datetime(Some(&detail.created_at)), false);
    let status_label = match detail.status.as_str() {
        "paid" => "Pagada",
        "pending" => "Pendiente",
        "overdue" => "Vencida",
        "cancelled" => "Anulada",
        _ => &detail.status,
    };
    push_key_value(&mut doc, "Estado: ", status_label, true);
    let method_label = match detail.payment_method.as_deref() {
        Some("cash") => "Efectivo",
        Some("card") => "Tarjeta",
        Some("transfer") => "Transferencia",
        Some("insurance") => "Seguro Medico",
        Some(other) => other,
        None => "—",
    };
    push_key_value(&mut doc, "Metodo de pago: ", method_label, false);
    push_key_value(&mut doc, "Fecha de pago: ", &fmt_datetime(detail.paid_at.as_deref()), false);
    push_key_value(&mut doc, "Vencimiento: ", &fmt_date(detail.due_date.as_deref()), false);

    // ── Patient ──
    push_section_title(&mut doc, "DATOS DEL PACIENTE");
    push_key_value(&mut doc, "Paciente: ", &detail.patient_name, true);
    if let Some(doc_id) = &detail.patient_document {
        push_key_value(&mut doc, "Documento: ", doc_id, false);
    }
    if let Some(phone) = &detail.patient_phone {
        push_key_value(&mut doc, "Telefono: ", phone, false);
    }
    if let Some(email) = &detail.patient_email {
        if !email.is_empty() {
            push_key_value(&mut doc, "Email: ", email, false);
        }
    }
    if let Some(addr) = &detail.patient_address {
        if !addr.is_empty() {
            push_key_value(&mut doc, "Direccion: ", addr, false);
        }
    }

    // ── Appointment / Doctor ──
    if let Some(doctor) = &detail.doctor_name {
        push_section_title(&mut doc, "CONSULTA");
        push_key_value(&mut doc, "Medico: ", doctor, false);
        push_key_value(
            &mut doc,
            "Fecha de consulta: ",
            &fmt_datetime(detail.appointment_date_time.as_deref()),
            false,
        );
    }

    // ── Totals ──
    push_section_title(&mut doc, "RESUMEN");
    push_key_value(&mut doc, "Subtotal: ", &fmt_currency(detail.subtotal), false);
    push_key_value(
        &mut doc,
        &format!("IVA ({}%): ", (detail.tax_rate * 100.0) as i64),
        &fmt_currency(detail.tax_amount),
        false,
    );
    doc.push(Break::new(1));
    push_total_row(&mut doc, "TOTAL: ", &fmt_currency(detail.total));

    // ── Footer ──
    doc.push(Break::new(3));
    doc.push(
        Paragraph::new("Gracias por su visita. Este documento es un comprobante electronico generado por DocAsistMD.")
            .aligned(Alignment::Center)
            .styled(Style::new().with_font_size(8)),
    );

    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| AppError::Internal(format!("Error creando directorio: {}", e)))?;
    }

    doc.render_to_file(out_path)
        .map_err(|e| AppError::Internal(format!("Error generando PDF: {}", e)))?;

    Ok(())
}
