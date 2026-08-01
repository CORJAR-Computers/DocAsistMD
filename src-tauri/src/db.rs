use rsfbclient::{builder_native, Execute, FbError, Queryable, SimpleConnection};
use std::path::PathBuf;
use std::sync::Mutex;

pub type DbConnection = SimpleConnection;

pub struct DbState {
    pub conn: Mutex<DbConnection>,
}

pub fn init_connection() -> Result<DbConnection, FbError> {
    println!("Init connection...");
    let db_path = get_database_path();
    println!("DB Path: {:?}", db_path);

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
        }
        Err(e) => {
            println!("Connection failed, creating new DB. Error: {:?}", e);
            let conn = builder.create_database().map_err(|e| FbError::from(e))?;
            let mut simple_conn: SimpleConnection = conn.into();
            println!("Running initial schema on new DB...");
            run_all_migrations(&mut simple_conn)?;
            println!("Initial schema completed.");
            simple_conn
        }
    };

    // For existing DBs: ensure migration tracking and run pending migrations
    let mut conn = conn;
    ensure_migration_table(&mut conn)?;
    run_pending_migrations(&mut conn)?;
    seed_default_admin(&mut conn)?;

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

fn ensure_migration_table(conn: &mut DbConnection) -> Result<(), FbError> {
    // Try to create the migration tracking table - ignore if exists
    let result = conn.execute(
        "CREATE TABLE schema_migrations (\
         version VARCHAR(10) NOT NULL PRIMARY KEY,\
         applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
        (),
    );
    match result {
        Ok(_) => println!("Created schema_migrations table."),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("already exists") || msg.contains("-204") {
                println!("schema_migrations table already exists.");
            } else {
                return Err(e);
            }
        }
    }
    Ok(())
}

fn is_migration_applied(conn: &mut DbConnection, version: &str) -> bool {
    let rows: Vec<(String,)> = conn
        .query(
            "SELECT version FROM schema_migrations WHERE version = ?",
            (version,),
        )
        .unwrap_or_default();
    !rows.is_empty()
}

fn record_migration(conn: &mut DbConnection, version: &str) -> Result<(), FbError> {
    conn.execute(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        (version,),
    )?;
    Ok(())
}

/// Run all migrations (used when creating a new DB)
fn run_all_migrations(conn: &mut DbConnection) -> Result<(), FbError> {
    ensure_migration_table(conn)?;

    let migrations: &[(&str, &[&str])] = &[
        ("V001", &MIGRATION_V001),
        ("V002", &MIGRATION_V002),
        ("V003", &MIGRATION_V003),
        ("V007", &MIGRATION_V007),
        ("V004", &MIGRATION_V004),
        ("V005", &MIGRATION_V005),
        ("V006", &MIGRATION_V006),
        ("V008", &MIGRATION_V008),
        ("V009", &MIGRATION_V009),
    ];

    for (version, statements) in migrations {
        println!("Applying migration {}...", version);
        for sql in *statements {
            conn.execute(*sql, ())?;
        }
        record_migration(conn, version)?;
        println!("Migration {} applied.", version);
    }

    Ok(())
}

/// Run only pending migrations (used when connecting to existing DB)
fn run_pending_migrations(conn: &mut DbConnection) -> Result<(), FbError> {
    let migrations: &[(&str, &[&str])] = &[
        ("V001", &MIGRATION_V001),
        ("V002", &MIGRATION_V002),
        ("V003", &MIGRATION_V003),
        ("V007", &MIGRATION_V007),
        ("V004", &MIGRATION_V004),
        ("V005", &MIGRATION_V005),
        ("V006", &MIGRATION_V006),
        ("V008", &MIGRATION_V008),
        ("V009", &MIGRATION_V009),
    ];

    for (version, statements) in migrations {
        if is_migration_applied(conn, version) {
            continue;
        }
        println!("Applying pending migration {}...", version);
        for sql in *statements {
            // For existing DBs, some tables/indexes may already exist
            match conn.execute(*sql, ()) {
                Ok(_) => {}
                Err(e) => {
                    let msg = e.to_string();
                    if msg.contains("already exists")
                        || msg.contains("-204")
                        || msg.contains("-603")
                    {
                        println!("Skipped (already exists): {}...", &sql[..sql.len().min(60)]);
                    } else {
                        return Err(e);
                    }
                }
            }
        }
        record_migration(conn, version)?;
        println!("Migration {} applied.", version);
    }

    Ok(())
}

fn seed_default_admin(conn: &mut DbConnection) -> Result<(), FbError> {
    let rows: Vec<(String,)> = conn
        .query("SELECT id FROM users WHERE username = 'admin'", ())
        .unwrap_or_default();

    if rows.is_empty() {
        println!("Seeding default admin user...");
        let password_hash = hash_password("admin123");
        conn.execute(
            "INSERT INTO users (id, username, password_hash, full_name, email, role, status)\
             VALUES ('00000000-0000-0000-0000-000000000001', 'admin', ?, 'Administrador', 'admin@docasistmd.com', 'admin', 'active')",
            (&password_hash,),
        )?;
        println!("Default admin created. User: admin / Pass: admin123");
    }
    Ok(())
}

// ── Password hashing (SHA-256 for MVP, use argon2 in production) ──

pub fn hash_password(password: &str) -> String {
    use ring::digest::{digest, SHA256};
    let hash = digest(&SHA256, password.as_bytes());
    hex::encode(hash)
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let computed = hash_password(password);
    use ring::constant_time::verify_slices_are_equal;
    verify_slices_are_equal(computed.as_bytes(), hash.as_bytes()).is_ok()
}

// ============================================================
// MIGRATIONS - Each SQL statement as a SEPARATE string
// This fixes the rsfbclient bug where execute() cannot
// parse multi-statement SQL or SQL with comments
// ============================================================

static MIGRATION_V001: &[&str] = &[
    "CREATE TABLE patients (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        first_name VARCHAR(100) NOT NULL,\
        last_name VARCHAR(100) NOT NULL,\
        document_id VARCHAR(50) NOT NULL,\
        document_type VARCHAR(10) NOT NULL DEFAULT 'CC',\
        date_of_birth DATE NOT NULL,\
        gender VARCHAR(1) NOT NULL DEFAULT 'M',\
        phone VARCHAR(20) NOT NULL,\
        email VARCHAR(150),\
        address VARCHAR(300),\
        blood_type VARCHAR(5),\
        allergies VARCHAR(500),\
        emergency_contact_name VARCHAR(150),\
        emergency_contact_phone VARCHAR(20),\
        insurance_provider VARCHAR(100),\
        insurance_policy_number VARCHAR(50),\
        insurance_expiry_date DATE,\
        notes VARCHAR(1000),\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE UNIQUE INDEX idx_patients_document ON patients(document_id)",
    "CREATE INDEX idx_patients_name ON patients(last_name, first_name)",
];

static MIGRATION_V002: &[&str] = &[
    "CREATE TABLE doctors (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        first_name VARCHAR(100) NOT NULL,\
        last_name VARCHAR(100) NOT NULL,\
        specialty VARCHAR(100) NOT NULL,\
        license_number VARCHAR(50) NOT NULL,\
        phone VARCHAR(20) NOT NULL,\
        email VARCHAR(150),\
        schedule_start VARCHAR(5) NOT NULL DEFAULT '08:00',\
        schedule_end VARCHAR(5) NOT NULL DEFAULT '17:00',\
        working_days VARCHAR(20) NOT NULL DEFAULT '[1,2,3,4,5]',\
        status VARCHAR(20) NOT NULL DEFAULT 'active',\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE UNIQUE INDEX idx_doctors_license ON doctors(license_number)",
];

static MIGRATION_V003: &[&str] = &[
    "CREATE TABLE appointments (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        patient_id VARCHAR(36) NOT NULL,\
        doctor_id VARCHAR(36) NOT NULL,\
        date_time TIMESTAMP NOT NULL,\
        duration_minutes INTEGER NOT NULL DEFAULT 30,\
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',\
        appointment_type VARCHAR(20) NOT NULL DEFAULT 'consultation',\
        reason VARCHAR(500),\
        notes VARCHAR(1000),\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        FOREIGN KEY (patient_id) REFERENCES patients(id),\
        FOREIGN KEY (doctor_id) REFERENCES doctors(id))",
    "CREATE INDEX idx_appointments_date ON appointments(date_time)",
    "CREATE INDEX idx_appointments_patient ON appointments(patient_id)",
    "CREATE INDEX idx_appointments_doctor ON appointments(doctor_id)",
    "CREATE INDEX idx_appointments_status ON appointments(status)",
];

static MIGRATION_V004: &[&str] = &[
    "CREATE TABLE consultations (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        appointment_id VARCHAR(36) NOT NULL,\
        patient_id VARCHAR(36) NOT NULL,\
        doctor_id VARCHAR(36) NOT NULL,\
        vital_signs VARCHAR(500),\
        symptoms VARCHAR(1000),\
        diagnosis VARCHAR(500),\
        cie10_code VARCHAR(10),\
        treatment_plan VARCHAR(2000),\
        clinical_notes VARCHAR(3000),\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        FOREIGN KEY (appointment_id) REFERENCES appointments(id),\
        FOREIGN KEY (patient_id) REFERENCES patients(id),\
        FOREIGN KEY (doctor_id) REFERENCES doctors(id))",
    "CREATE INDEX idx_consultations_patient ON consultations(patient_id)",
    "CREATE INDEX idx_consultations_date ON consultations(created_at)",
];

static MIGRATION_V005: &[&str] = &[
    "CREATE TABLE prescriptions (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        consultation_id VARCHAR(36) NOT NULL,\
        medication_id VARCHAR(36) NOT NULL,\
        dosage VARCHAR(100) NOT NULL,\
        frequency VARCHAR(100) NOT NULL,\
        duration VARCHAR(100) NOT NULL,\
        instructions VARCHAR(500),\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        FOREIGN KEY (consultation_id) REFERENCES consultations(id),\
        FOREIGN KEY (medication_id) REFERENCES medications(id))",
    "CREATE INDEX idx_prescriptions_consultation ON prescriptions(consultation_id)",
];

static MIGRATION_V006: &[&str] = &[
    "CREATE TABLE invoices (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        appointment_id VARCHAR(36),\
        patient_id VARCHAR(36) NOT NULL,\
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,\
        tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1900,\
        tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,\
        total DECIMAL(12,2) NOT NULL DEFAULT 0,\
        status VARCHAR(20) NOT NULL DEFAULT 'pending',\
        payment_method VARCHAR(20),\
        due_date DATE,\
        paid_at TIMESTAMP,\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        FOREIGN KEY (appointment_id) REFERENCES appointments(id),\
        FOREIGN KEY (patient_id) REFERENCES patients(id))",
    "CREATE INDEX idx_invoices_patient ON invoices(patient_id)",
    "CREATE INDEX idx_invoices_status ON invoices(status)",
];

static MIGRATION_V007: &[&str] = &[
    "CREATE TABLE medications (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        name VARCHAR(200) NOT NULL,\
        active_ingredient VARCHAR(200) NOT NULL,\
        presentation VARCHAR(100) NOT NULL,\
        concentration VARCHAR(100),\
        current_stock INTEGER NOT NULL DEFAULT 0,\
        minimum_stock INTEGER NOT NULL DEFAULT 10,\
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,\
        expiry_date DATE,\
        supplier VARCHAR(150),\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE INDEX idx_medications_name ON medications(name)",
    "CREATE INDEX idx_medications_stock ON medications(current_stock)",
];

static MIGRATION_V008: &[&str] = &[
    "CREATE TABLE audit_log (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        user_id VARCHAR(36),\
        action VARCHAR(50) NOT NULL,\
        table_name VARCHAR(50) NOT NULL,\
        record_id VARCHAR(36),\
        old_values VARCHAR(4000),\
        new_values VARCHAR(4000),\
        ip_address VARCHAR(45),\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE INDEX idx_audit_table ON audit_log(table_name)",
    "CREATE INDEX idx_audit_user ON audit_log(user_id)",
    "CREATE INDEX idx_audit_date ON audit_log(created_at)",
];

static MIGRATION_V009: &[&str] = &[
    "CREATE TABLE users (\
        id VARCHAR(36) NOT NULL PRIMARY KEY,\
        username VARCHAR(50) NOT NULL,\
        password_hash VARCHAR(200) NOT NULL,\
        full_name VARCHAR(150) NOT NULL,\
        email VARCHAR(150),\
        role VARCHAR(20) NOT NULL DEFAULT 'receptionist',\
        status VARCHAR(20) NOT NULL DEFAULT 'active',\
        last_login TIMESTAMP,\
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE UNIQUE INDEX idx_users_username ON users(username)",
];
