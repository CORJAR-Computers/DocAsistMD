mod commands;
mod db;
mod errors;
mod models;
mod repositories;

use db::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Starting docasist-md application...");
    // Initialize FireBird database connection
    let conn = match db::init_connection() {
        Ok(conn) => {
            println!("Connection obtained in main.");
            conn
        }
        Err(e) => {
            eprintln!("Failed to initialize database: {}", e);
            std::process::exit(1);
        }
    };

    println!("Building Tauri application...");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState {
            conn: std::sync::Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            // Patient commands
            commands::patient_commands::get_patients,
            commands::patient_commands::get_patient,
            commands::patient_commands::create_patient,
            commands::patient_commands::search_patients,
            commands::patient_commands::delete_patient,
            // Appointment commands
            commands::appointment_commands::get_appointments,
            commands::appointment_commands::create_appointment,
            commands::appointment_commands::update_appointment_status,
            // Doctor commands
            commands::doctor_commands::get_doctors,
            commands::doctor_commands::get_doctor,
            commands::doctor_commands::create_doctor,
            // Consultation commands
            commands::consultation_commands::get_consultations,
            commands::consultation_commands::get_consultation,
            commands::consultation_commands::get_patient_consultations,
            commands::consultation_commands::create_consultation,
            // Invoice commands
            commands::invoice_commands::get_invoices,
            commands::invoice_commands::get_invoice,
            commands::invoice_commands::create_invoice,
            commands::invoice_commands::update_invoice_status,
            // Medication commands
            commands::medication_commands::get_medications,
            commands::medication_commands::create_medication,
            commands::medication_commands::update_medication_stock,
            // Prescription commands
            commands::prescription_commands::get_consultation_prescriptions,
            commands::prescription_commands::create_prescription,
            // Auth commands
            commands::auth_commands::login,
            commands::auth_commands::get_current_user,
            commands::auth_commands::create_user,
            commands::auth_commands::get_users,
            commands::auth_commands::change_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
