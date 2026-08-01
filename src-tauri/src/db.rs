use rsfbclient::{FbError, SimpleConnection, builder_native, Execute, Queryable};
use std::sync::Mutex;
use std::path::PathBuf;

pub type DbConnection = SimpleConnection;

pub struct DbState {
    pub conn: Mutex<DbConnection>,
}

/// Migration record from the schema_migrations table
#[derive(Debug)]
struct MigrationRecord {
    version: String,
    applied: bool,
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

    println!("Attempting to connect to existing DB...");
    let conn = match builder.connect() {
        Ok(conn) => {
            println!("Successfully connected to existing DB.");
            conn.into()
        },
        Err(e) => {
            println!("Connection failed, attempting to create new DB. Error: {:?}", e);
            let conn = builder.create_database().map_err(|e| FbError::from(e))?;
            println!("Database created. Setting up simple connection...");
            let mut simple_conn: SimpleConnection = conn.into();
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

/// Create the schema_migrations tracking table if it doesn't exist
fn ensure_migration_table(conn: &mut DbConnection) -> Result<(), FbError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(10) NOT NULL PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        (),
    )?;
    Ok(())
}

/// Check if a migration version has already been applied
fn is_migration_applied(conn: &mut DbConnection, version: &str) -> bool {
    let rows: Vec<(String,)> = conn.query(
        "SELECT version FROM schema_migrations WHERE version = ?",
        (version,),
    ).unwrap_or_default();
    !rows.is_empty()
}

/// Record a successful migration
fn record_migration(conn: &mut DbConnection, version: &str) -> Result<(), FbError> {
    conn.execute(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        (version,),
    )?;
    Ok(())
}

/// Run a single migration: check if applied, execute if not, record it
fn run_migration(
    conn: &mut DbConnection,
    version: &str,
    sql: &str,
) -> Result<(), FbError> {
    if is_migration_applied(conn, version) {
        println!("Migration {} already applied, skipping.", version);
        return Ok(());
    }

    println!("Applying migration {}...", version);
    conn.execute(sql, ())?;
    record_migration(conn, version)?;
    println!("Migration {} applied successfully.", version);
    Ok(())
}

/// Run all migrations in dependency order
fn run_initial_schema(conn: &mut DbConnection) -> Result<(), FbError> {
    // First, ensure the migration tracking table exists
    ensure_migration_table(conn)?;

    // Run migrations in dependency order:
    // V001 (patients) -> V002 (doctors) -> V003 (appointments, depends on patients+doctors)
    // -> V007 (medications, standalone) -> V004 (consultations, depends on appointments)
    // -> V005 (prescriptions, depends on consultations+medications)
    // -> V006 (invoices, depends on appointments) -> V008 (audit_log, standalone)
    // -> V009 (users, standalone)
    let migrations: &[(&str, &str)] = &[
        ("V001", include_str!("../migrations/V001__create_patients.sql")),
        ("V002", include_str!("../migrations/V002__create_doctors.sql")),
        ("V003", include_str!("../migrations/V003__create_appointments.sql")),
        ("V007", include_str!("../migrations/V007__create_medications.sql")),
        ("V004", include_str!("../migrations/V004__create_consultations.sql")),
        ("V005", include_str!("../migrations/V005__create_prescriptions.sql")),
        ("V006", include_str!("../migrations/V006__create_invoices.sql")),
        ("V008", include_str!("../migrations/V008__create_audit_log.sql")),
        ("V009", include_str!("../migrations/V009__create_users.sql")),
    ];

    for (version, sql) in migrations {
        run_migration(conn, version, sql)?;
    }

    // Seed default admin user if not exists
    seed_default_admin(conn)?;

    Ok(())
}

/// Seed a default admin user with properly hashed password
fn seed_default_admin(conn: &mut DbConnection) -> Result<(), FbError> {
    // Check if admin user already exists
    let rows: Vec<(String,)> = conn.query(
        "SELECT id FROM users WHERE username = 'admin'",
        (),
    ).unwrap_or_default();

    if rows.is_empty() {
        println!("Seeding default admin user...");
        // Default password: admin123 (must be changed on first login)
        // Using SHA-256 hash for MVP (argon2 would be better but requires more deps)
        let password_hash = hash_password("admin123");
        conn.execute(
            "INSERT INTO users (id, username, password_hash, full_name, email, role, status)
             VALUES ('00000000-0000-0000-0000-000000000001', 'admin', ?, 'Administrador', 'admin@docasistmd.com', 'admin', 'active')",
            (&password_hash,),
        )?;
        println!("Default admin user created. Username: admin, Password: admin123");
    }

    Ok(())
}

/// Hash a password using SHA-256 (for MVP).
/// In production, replace with argon2 hashing.
pub fn hash_password(password: &str) -> String {
    use ring::digest::{digest, SHA256};
    let hash = digest(&SHA256, password.as_bytes());
    hex::encode(hash)
}

/// Verify a password against its hash
pub fn verify_password(password: &str, hash: &str) -> bool {
    let computed = hash_password(password);
    // Constant-time comparison to prevent timing attacks
    use ring::constant_time::verify_slices_are_equal;
    verify_slices_are_equal(computed.as_bytes(), hash.as_bytes()).is_ok()
}
