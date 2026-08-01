use crate::errors::AppError;
use crate::exports::{csv_field, save_csv, save_xlsx};
use crate::models::InventoryMovement;
use rust_xlsxwriter::{Format, Workbook};
use std::path::PathBuf;

fn movement_type_label(t: &str) -> String {
    match t {
        "in" => "Entrada".to_string(),
        "out" => "Salida".to_string(),
        other => other.to_string(),
    }
}

fn origin_label_value(mv: &InventoryMovement) -> String {
    match mv.origin.as_str() {
        "reversion" => "Reversión".to_string(),
        "receta" => "Dispensación".to_string(),
        _ => "Manual".to_string(),
    }
}

/// Generate a CSV file with the inventory movements (UTF-8 with BOM so Excel
/// renders accents correctly).
pub fn generate_movements_csv(entries: &[InventoryMovement], out_path: &PathBuf) -> Result<(), AppError> {
    let mut csv = String::from("\u{FEFF}");
    csv.push_str("Fecha,Medicamento,Tipo,Origen,Cantidad,Motivo,Referencia,Estado\n");

    for e in entries {
        let estado = if e.reversed_at.is_some() { "Reversado" } else { "Activo" };
        let row = [
            csv_field(&e.created_at),
            csv_field(&e.medication_name),
            csv_field(&movement_type_label(&e.movement_type)),
            csv_field(&origin_label_value(e)),
            e.quantity.to_string(),
            csv_field(e.reason.as_deref().unwrap_or("")),
            csv_field(e.reference.as_deref().unwrap_or("")),
            estado.to_string(),
        ];
        csv.push_str(&row.join(","));
        csv.push('\n');
    }

    save_csv(&csv, out_path)?;

    Ok(())
}

/// Generate an XLSX file with the inventory movements (one sheet, styled header).
pub fn generate_movements_excel(entries: &[InventoryMovement], out_path: &PathBuf) -> Result<(), AppError> {
    let mut workbook = Workbook::new();

    let header_fmt = Format::new()
        .set_bold()
        .set_background_color(rust_xlsxwriter::Color::RGB(0x1B6B93))
        .set_font_color(rust_xlsxwriter::Color::White);

    let sheet = workbook.add_worksheet();
    sheet.set_name("Movimientos")?;
    let widths = [19, 28, 12, 16, 10, 32, 24, 12];
    for (i, w) in widths.iter().enumerate() {
        sheet.set_column_width(i as u16, *w)?;
    }

    let headers = ["Fecha", "Medicamento", "Tipo", "Origen", "Cantidad", "Motivo", "Referencia", "Estado"];
    for (i, h) in headers.iter().enumerate() {
        sheet.write_string_with_format(0, i as u16, *h, &header_fmt)?;
    }

    for (i, e) in entries.iter().enumerate() {
        let row = i as u32 + 1;
        let estado = if e.reversed_at.is_some() { "Reversado" } else { "Activo" };
        sheet.write_string(row, 0, &e.created_at)?;
        sheet.write_string(row, 1, &e.medication_name)?;
        sheet.write_string(row, 2, &movement_type_label(&e.movement_type))?;
        sheet.write_string(row, 3, &origin_label_value(e))?;
        sheet.write_number(row, 4, e.quantity as f64)?;
        sheet.write_string(row, 5, e.reason.as_deref().unwrap_or(""))?;
        sheet.write_string(row, 6, e.reference.as_deref().unwrap_or(""))?;
        sheet.write_string(row, 7, estado)?;
    }

    save_xlsx(&mut workbook, out_path)?;

    Ok(())
}
