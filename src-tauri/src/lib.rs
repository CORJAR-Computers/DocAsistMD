mod db;
mod models;
mod errors;
mod repositories;
mod commands;

use db::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Starting docasist-md application...");
    // Initialize FireBird database connection
    let conn = match db::init_connection() {
        Ok(conn) => {
            println!("Connection obtained in main.");
            conn
        },
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
            // Auth commands
            commands::auth_commands::login,
            commands::auth_commands::get_current_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
