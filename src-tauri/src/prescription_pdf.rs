use crate::errors::AppError;
use crate::invoice_pdf::{fmt_datetime, load_font_family, push_key_value, push_section_title};
use crate::models::PrescriptionDetail;
use genpdf::elements::{Break, Image, Paragraph};
use genpdf::style::Style;
use genpdf::{Alignment, Document, Element, PaperSize, Scale, SimplePageDecorator};
use std::path::PathBuf;

/// Deterministic verification code for a prescription, derived from the
/// consultation id and its creation timestamp (SHA-256, hex, grouped in 4s).
/// Allows verifying a printed prescription against the clinic's records.
pub fn build_verification_code(consultation_id: &str, created_at: &str) -> String {
    use ring::digest::{digest, SHA256};
    let input = format!("DOCASISTMD|RECETA|{}|{}", consultation_id, created_at);
    let hash = digest(&SHA256, input.as_bytes());
    let hex_str = hex::encode(hash);
    let raw: String = hex_str.chars().take(16).collect();
    let upper = raw.to_uppercase();
    // Group in blocks of 4: XXXX-XXXX-XXXX-XXXX
    let mut grouped = String::new();
    for (i, c) in upper.chars().enumerate() {
        if i > 0 && i % 4 == 0 {
            grouped.push('-');
        }
        grouped.push(c);
    }
    grouped
}

/// Render a QR code (PNG) to a temp file and embed it centered with the given
/// scale. Returns the temp file path so the caller can clean it up.
fn push_qr_code(
    doc: &mut Document,
    payload: &str,
    tmp_path: &PathBuf,
) -> Result<(), AppError> {
    let code = qrcode::QrCode::new(payload.as_bytes())
        .map_err(|e| AppError::Internal(format!("Error generando QR: {}", e)))?;
    // Render to a grayscale image and encode as PNG. Note: qrcode uses
    // image 0.25 while genpdf uses image 0.23 internally, so we pass data
    // through a file instead of sharing image buffers.
    let img = code
        .render::<image::Luma<u8>>()
        .min_dimensions(240, 240)
        .build();
    img.save(tmp_path)
        .map_err(|e| AppError::Internal(format!("Error guardando QR: {}", e)))?;

    let image = Image::from_path(tmp_path)
        .map_err(|e| AppError::Internal(format!("Error cargando QR: {}", e)))?;
    let scaled = image
        .with_scale(Scale::new(0.55, 0.55))
        .with_alignment(Alignment::Center);
    doc.push(scaled);
    Ok(())
}

/// Generate a prescription PDF and save it to the given path.
pub fn generate_prescription_pdf(detail: &PrescriptionDetail, out_path: &PathBuf) -> Result<(), AppError> {
    let font_family = load_font_family()?;

    let mut doc = Document::new(font_family);
    doc.set_title(format!("Receta {}", &detail.consultation_id[..detail.consultation_id.len().min(8)]));
    doc.set_paper_size(PaperSize::A4);

    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(12);
    doc.set_page_decorator(decorator);

    // ── Header ──
    doc.push(Paragraph::new("DocAsistMD").styled(Style::new().bold().with_font_size(22)));
    doc.push(
        Paragraph::new("RECETA MEDICA")
            .aligned(Alignment::Right)
            .styled(Style::new().bold().with_font_size(16)),
    );

    doc.push(Break::new(1));

    // ── Prescription info ──
    let rx_num = detail.consultation_id.chars().take(8).collect::<String>().to_uppercase();
    push_key_value(&mut doc, "Receta N°: ", &rx_num, true);
    push_key_value(&mut doc, "Fecha: ", &fmt_datetime(Some(&detail.created_at)), false);

    // ── Patient ──
    push_section_title(&mut doc, "PACIENTE");
    push_key_value(&mut doc, "Nombre: ", &detail.patient_name, true);
    if let Some(doc_id) = &detail.patient_document {
        push_key_value(&mut doc, "Documento: ", doc_id, false);
    }
    if let Some(phone) = &detail.patient_phone {
        push_key_value(&mut doc, "Telefono: ", phone, false);
    }

    // ── Doctor ──
    push_section_title(&mut doc, "MEDICO TRATANTE");
    push_key_value(&mut doc, "Medico: ", &detail.doctor_name, true);
    push_key_value(&mut doc, "Especialidad: ", &detail.doctor_specialty, false);
    push_key_value(&mut doc, "Registro / Licencia: ", &detail.doctor_license, false);

    // ── Diagnosis ──
    push_section_title(&mut doc, "DIAGNOSTICO");
    push_key_value(
        &mut doc,
        "Diagnostico: ",
        detail.diagnosis.as_deref().unwrap_or("—"),
        true,
    );
    if let Some(cie10) = &detail.cie10_code {
        push_key_value(&mut doc, "Codigo CIE-10: ", cie10, false);
    }

    // ── Medications ──
    push_section_title(&mut doc, "MEDICAMENTOS PRESCRITOS");
    if detail.items.is_empty() {
        push_key_value(&mut doc, "", "Sin medicamentos prescritos", false);
    } else {
        for (i, item) in detail.items.iter().enumerate() {
            doc.push(Break::new(1));
            let mut p = Paragraph::new(format!("{}. {}", i + 1, item.medication_name));
            if !item.presentation.is_empty() {
                p.push_styled(format!(" ({})", item.presentation), Style::new());
            }
            doc.push(p.styled(Style::new().bold()));

            push_key_value(&mut doc, "    Cantidad: ", &item.quantity.to_string(), false);
            push_key_value(&mut doc, "    Dosis: ", &item.dosage, false);
            push_key_value(&mut doc, "    Frecuencia: ", &item.frequency, false);
            push_key_value(&mut doc, "    Duracion: ", &item.duration, false);
            if let Some(instr) = &item.instructions {
                if !instr.is_empty() {
                    push_key_value(&mut doc, "    Indicaciones: ", instr, false);
                }
            }
        }
    }

    // ── Treatment plan ──
    if let Some(plan) = &detail.treatment_plan {
        if !plan.is_empty() {
            push_section_title(&mut doc, "PLAN DE TRATAMIENTO");
            push_key_value(&mut doc, "", plan, false);
        }
    }

    // ── Verification QR ──
    push_section_title(&mut doc, "VERIFICACION");
    let verification_code = build_verification_code(&detail.consultation_id, &detail.created_at);
    let payload = format!(
        "DOCASISTMD|RECETA|{}|{}",
        detail.consultation_id,
        verification_code.replace('-', "")
    );

    let tmp_path = std::env::temp_dir().join(format!("docasistmd_qr_{}.png", detail.consultation_id));
    push_qr_code(&mut doc, &payload, &tmp_path)?;

    doc.push(Break::new(1));
    let mut code_line = Paragraph::new(format!("Codigo de verificacion: {}", verification_code));
    code_line.set_alignment(Alignment::Center);
    doc.push(code_line.styled(Style::new().bold().with_font_size(10)));

    // ── Footer ──
    doc.push(Break::new(3));
    doc.push(
        Paragraph::new(
            "Escanee el codigo QR o verifique el codigo con el consultorio. Este documento es generado por DocAsistMD.",
        )
        .aligned(Alignment::Center)
        .styled(Style::new().with_font_size(8)),
    );

    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Internal(format!("Error creando directorio: {}", e)))?;
    }

    doc.render_to_file(out_path)
        .map_err(|e| AppError::Internal(format!("Error generando PDF: {}", e)))?;

    // Clean up temp QR file
    let _ = std::fs::remove_file(&tmp_path);

    Ok(())
}
