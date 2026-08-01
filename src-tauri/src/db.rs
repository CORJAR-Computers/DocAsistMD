use rsfbclient::{FbError, SimpleConnection, builder_native, Execute};
use std::sync::Mutex;
use std::path::PathBuf;

pub type DbConnection = SimpleConnection;

pub struct DbState {
    pub conn: Mutex<DbConnection>,
}

pub fn init_connection() -> Result<DbConnection, FbError> {
    println!("Init connection...");
    let db_path = get_database_path();
    println!("DB Path: {:?}", db_path);

    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let db_path_str = db_path.to_string_lossy().to_string();

    let mut builder = builder_native().with_dyn_link().with_embedded();
    builder.db_name(&db_path_str);
    // builder.user("SYSDBA");
    // builder.pass("masterkey");

    println!("Attempting to connect to existing DB...");
    // Try to connect to existing database, or create new one
    let conn = match builder.connect() {
        Ok(conn) => {
            println!("Successfully connected to existing DB.");
            conn.into()
        },
        Err(e) => {
            println!("Connection failed, attempting to create new DB. Error: {:?}", e);
            // Database doesn't exist, create it
            let conn = builder.create_database().map_err(|e| FbError::from(e))?;
            println!("Database created. Setting up simple connection...");
            let mut simple_conn: SimpleConnection = conn.into();
            // Create initial schema
            println!("Running initial schema...");
            run_initial_schema(&mut simple_conn)?;
            println!("Initial schema completed.");
            simple_conn
        }
    };

    println!("Database initialized successfully.");
    Ok(conn)
}

fn get_database_path() -> PathBuf {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("XDG_DATA_HOME"))
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.local/share", h)))
        .unwrap_or_else(|_| ".".to_string());

    PathBuf::from(app_data)
        .join("DocAsistMD")
        .join("docasistmd.fdb")
}

fn run_initial_schema(conn: &mut DbConnection) -> Result<(), FbError> {
    let schema = include_str!("../migrations/V001__create_patients.sql");
    conn.execute(schema, ()).ok();

    let schema = include_str!("../migrations/V002__create_doctors.sql");
    conn.execute(schema, ()).ok();

    let schema = include_str!("../migrations/V003__create_appointments.sql");
    conn.execute(schema, ()).ok();

    let schema = include_str!("../migrations/V009__create_users.sql");
    conn.execute(schema, ()).ok();

    Ok(())
}
