use crate::errors::AppError;
use crate::exports::{csv_field, save_csv, save_xlsx};
use crate::invoice_pdf::{fmt_datetime, load_font_family};
use crate::models::AuditLogEntry;
use genpdf::elements::{Break, Paragraph};
use genpdf::style::Style;
use genpdf::{Alignment, Document, Element, PaperSize, SimplePageDecorator};
use rust_xlsxwriter::{Format, Workbook};
use std::path::PathBuf;

fn action_label(action: &str) -> String {
    let label = match action {
        // Inventario
        "dispensar_medicamento" => "Dispensación",
        "reversar_dispensacion" => "Reversión",
        "registrar_entrada" => "Entrada de Inventario",
        "registrar_salida" => "Salida de Inventario",
        // Pacientes
        "crear_paciente" => "Crear Paciente",
        "editar_paciente" => "Editar Paciente",
        "eliminar_paciente" => "Eliminar Paciente",
        // Citas
        "crear_cita" => "Crear Cita",
        "editar_cita" => "Editar Cita",
        // Facturas
        "crear_factura" => "Crear Factura",
        "editar_factura" => "Editar Factura",
        other => other,
    };
    label.to_string()
}

fn table_label(table: &str) -> String {
    let label = match table {
        "prescriptions" => "Recetas",
        "inventory_movements" => "Movimientos de Inventario",
        "patients" => "Pacientes",
        "appointments" => "Citas",
        "invoices" => "Facturas",
        other => other,
    };
    label.to_string()
}

/// Generate a CSV file with the audit log entries (UTF-8 with BOM so Excel
/// renders accents correctly).
pub fn generate_audit_csv(entries: &[AuditLogEntry], out_path: &PathBuf) -> Result<(), AppError> {
    let mut csv = String::from("\u{FEFF}");
    csv.push_str("Fecha,Usuario,Accion,Tabla,Registro,IP,Valores anteriores,Valores nuevos\n");

    for e in entries {
        let row = [
            csv_field(&e.created_at),
            csv_field(e.user_name.as_deref().unwrap_or("Sin usuario")),
            csv_field(&action_label(&e.action)),
            csv_field(&table_label(&e.table_name)),
            csv_field(e.record_id.as_deref().unwrap_or("")),
            csv_field(e.ip_address.as_deref().unwrap_or("")),
            csv_field(e.old_values.as_deref().unwrap_or("")),
            csv_field(e.new_values.as_deref().unwrap_or("")),
        ];
        csv.push_str(&row.join(","));
        csv.push('\n');
    }

    save_csv(&csv, out_path)?;

    Ok(())
}

/// Generate an XLSX file with the audit log entries (one sheet, styled header).
pub fn generate_audit_excel(entries: &[AuditLogEntry], out_path: &PathBuf) -> Result<(), AppError> {
    let mut workbook = Workbook::new();

    let header_fmt = Format::new()
        .set_bold()
        .set_background_color(rust_xlsxwriter::Color::RGB(0x1B6B93))
        .set_font_color(rust_xlsxwriter::Color::White);
    let wrap_fmt = Format::new().set_text_wrap();

    let sheet = workbook.add_worksheet();
    sheet.set_name("Auditoria")?;
    let widths = [19, 22, 22, 24, 36, 16, 40, 40];
    for (i, w) in widths.iter().enumerate() {
        sheet.set_column_width(i as u16, *w)?;
    }

    let headers = ["Fecha", "Usuario", "Accion", "Tabla", "Registro", "IP", "Valores anteriores", "Valores nuevos"];
    for (i, h) in headers.iter().enumerate() {
        sheet.write_string_with_format(0, i as u16, *h, &header_fmt)?;
    }

    for (i, e) in entries.iter().enumerate() {
        let row = i as u32 + 1;
        sheet.write_string(row, 0, &e.created_at)?;
        sheet.write_string(row, 1, e.user_name.as_deref().unwrap_or("Sin usuario"))?;
        sheet.write_string(row, 2, &action_label(&e.action))?;
        sheet.write_string(row, 3, &table_label(&e.table_name))?;
        sheet.write_string(row, 4, e.record_id.as_deref().unwrap_or(""))?;
        sheet.write_string(row, 5, e.ip_address.as_deref().unwrap_or(""))?;
        sheet.write_string_with_format(row, 6, e.old_values.as_deref().unwrap_or(""), &wrap_fmt)?;
        sheet.write_string_with_format(row, 7, e.new_values.as_deref().unwrap_or(""), &wrap_fmt)?;
    }

    save_xlsx(&mut workbook, out_path)?;

    Ok(())
}

/// Short id helper for the PDF (first 12 chars), matching the UI table.
/// Uses chars().take(12) so non-ASCII ids don't panic on byte slicing.
fn short_id(id: &str) -> String {
    let head: String = id.chars().take(12).collect();
    if id.chars().count() > 12 {
        format!("{}…", head)
    } else {
        id.to_string()
    }
}

/// Generate a PDF file with the audit log entries, reproducing the same
/// layout as the Audit Log table: Fecha, Usuario, Acción, Tabla, Registro
/// and the old/new values detail.
pub fn generate_audit_pdf(entries: &[AuditLogEntry], out_path: &PathBuf) -> Result<(), AppError> {
    let font_family = load_font_family()?;

    let mut doc = Document::new(font_family);
    doc.set_title("Log de Auditoría".to_string());
    doc.set_paper_size(PaperSize::A4);

    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(12);
    doc.set_page_decorator(decorator);

    // ── Header ──
    doc.push(Paragraph::new("DocAsistMD").styled(Style::new().bold().with_font_size(22)));
    doc.push(
        Paragraph::new("LOG DE AUDITORÍA")
            .aligned(Alignment::Right)
            .styled(Style::new().bold().with_font_size(16)),
    );
    doc.push(Break::new(1));
    doc.push(
        Paragraph::new(format!("{} evento(s) registrados", entries.len()))
            .styled(Style::new().with_font_size(10)),
    );
    doc.push(Break::new(2));

    // ── Table header ──
    let mut header = Paragraph::new("FECHA".to_string());
    header.push_styled("  USUARIO".to_string(), Style::new());
    header.push_styled("  ACCIÓN".to_string(), Style::new());
    header.push_styled("  TABLA".to_string(), Style::new());
    header.push_styled("  REGISTRO".to_string(), Style::new());
    doc.push(header.styled(Style::new().bold().with_font_size(9)));
    doc.push(Break::new(1));

    // ── Rows ──
    if entries.is_empty() {
        doc.push(Paragraph::new("No hay eventos de auditoría."));
    } else {
        for e in entries {
            let mut row = Paragraph::new(fmt_datetime(Some(&e.created_at)));
            row.push_styled(
                format!("  {}", e.user_name.as_deref().unwrap_or("Sin usuario")),
                Style::new(),
            );
            row.push_styled(format!("  {}", action_label(&e.action)), Style::new());
            row.push_styled(format!("  {}", table_label(&e.table_name)), Style::new());
            row.push_styled(
                format!("  {}", e.record_id.as_deref().map(short_id).unwrap_or_else(|| "—".to_string())),
                Style::new(),
            );
            doc.push(row.styled(Style::new().with_font_size(8)));

            // Old/New values detail line (when present)
            if e.old_values.is_some() || e.new_values.is_some() {
                let mut detail = Paragraph::new("    ".to_string());
                if let Some(old) = &e.old_values {
                    detail.push_styled(format!("Antes: {}  ", old), Style::new());
                }
                if let Some(new) = &e.new_values {
                    detail.push_styled(format!("Después: {}", new), Style::new());
                }
                doc.push(detail.styled(Style::new().with_font_size(7)));
            }
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
