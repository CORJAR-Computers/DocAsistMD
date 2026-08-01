use rsfbclient::Execute;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Serializes creation of embedded Firebird databases. The embedded engine
/// can race when several threads call create_database() concurrently within
/// one process, so tests create their databases one at a time.
static DB_CREATE_LOCK: Mutex<()> = Mutex::new(());

/// Serializes tests that mutate the global APPDATA/XDG_DATA_HOME/HOME env
/// vars (the database and session file paths derive from them). Same pattern
/// as DB_CREATE_LOCK: those tests cannot run in parallel without stepping on
/// each other.
pub static SESSION_TEST_LOCK: Mutex<()> = Mutex::new(());

/// Points APPDATA at a temporary directory during the test and restores it on
/// drop. Used by session tests: the app-data path derives from APPDATA.
pub struct AppDataGuard(Option<OsString>);

impl AppDataGuard {
    pub fn set(dir: &Path) -> Self {
        let old = std::env::var_os("APPDATA");
        std::env::set_var("APPDATA", dir);
        AppDataGuard(old)
    }
}

impl Drop for AppDataGuard {
    fn drop(&mut self) {
        match &self.0 {
            Some(v) => std::env::set_var("APPDATA", v),
            None => std::env::remove_var("APPDATA"),
        }
    }
}

/// Restores USERPROFILE/HOME env vars on drop, so a panicking assertion in a
/// test cannot leak mutated environment into other parallel tests.
pub struct EnvGuard(Option<OsString>, Option<OsString>);

impl EnvGuard {
    pub fn new() -> Self {
        EnvGuard(std::env::var_os("USERPROFILE"), std::env::var_os("HOME"))
    }

    fn restore(var: &Option<OsString>, name: &str) {
        match var {
            Some(v) => std::env::set_var(name, v),
            None => std::env::remove_var(name),
        }
    }
}

impl Drop for EnvGuard {
    fn drop(&mut self) {
        Self::restore(&self.0, "USERPROFILE");
        Self::restore(&self.1, "HOME");
    }
}

/// Creates a unique directory under the OS temp dir and removes it on drop,
/// so a panicking assertion can't leak test artifacts on disk.
pub struct TempDir(PathBuf);

impl TempDir {
    pub fn new() -> Self {
        let unique = format!(
            "docasistmd_test_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system clock before unix epoch")
                .as_nanos()
        );
        let dir = std::env::temp_dir().join(unique);
        std::fs::create_dir_all(&dir).expect("failed to create temp dir");
        TempDir(dir)
    }

    pub fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// A throwaway Firebird embedded database for repository tests. Creates a
/// fresh database under the OS temp dir (unique per instance) with the full
/// schema, and cleans up the connection and files on drop.
pub struct TestDb {
    conn: Option<crate::db::DbConnection>,
    dir: PathBuf,
}

impl TestDb {
    pub fn new() -> Result<Self, rsfbclient::FbError> {
        let unique = format!(
            "docasistmd_db_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system clock before unix epoch")
                .as_nanos()
        );
        let dir = std::env::temp_dir().join(unique);
        let db_path = dir.join("test.fdb");
        // Serialize DB creation; ignore poisoning so a panicked test thread
        // doesn't break the remaining tests.
        let _guard = DB_CREATE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let conn = match crate::db::create_test_db_at(&db_path) {
            Ok(conn) => conn,
            Err(e) => {
                let _ = std::fs::remove_dir_all(&dir);
                return Err(e);
            }
        };
        Ok(TestDb {
            conn: Some(conn),
            dir,
        })
    }

    pub fn conn(&mut self) -> &mut crate::db::DbConnection {
        self.conn.as_mut().expect("TestDb connection is present")
    }
}

impl Drop for TestDb {
    fn drop(&mut self) {
        // Release the connection before removing the files so Windows doesn't
        // keep the .fdb locked.
        self.conn = None;
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

/// Seed a patient in the given connection and return its id. `document_id`
/// must be unique within the test database (unique index on patients.document_id).
pub fn make_patient(conn: &mut crate::db::DbConnection, document_id: &str) -> String {
    let input = crate::models::CreatePatientInput {
        first_name: "Ana".to_string(),
        last_name: "García".to_string(),
        document_id: document_id.to_string(),
        document_type: "CC".to_string(),
        date_of_birth: "1990-05-15".to_string(),
        gender: "F".to_string(),
        phone: "555-0100".to_string(),
        email: "ana@example.com".to_string(),
        address: "Calle 1".to_string(),
        blood_type: Some("O+".to_string()),
        allergies: None,
        emergency_contact_name: None,
        emergency_contact_phone: None,
        insurance_provider: Some("SaludCo".to_string()),
        insurance_policy_number: None,
        insurance_expiry_date: None,
        notes: None,
    };
    crate::repositories::patient_repo::create(conn, input, None)
        .expect("create patient")
        .id
}

/// Seed a doctor in the given connection and return its id. `license` must be
/// unique within the test database (unique index on doctors.license_number).
pub fn make_doctor(conn: &mut crate::db::DbConnection, license: &str) -> String {
    let input = crate::models::CreateDoctorInput {
        first_name: "Carlos".to_string(),
        last_name: "López".to_string(),
        specialty: "Cardiología".to_string(),
        license_number: license.to_string(),
        phone: "555-0200".to_string(),
        email: "carlos@example.com".to_string(),
        schedule_start: "08:00".to_string(),
        schedule_end: "17:00".to_string(),
    };
    crate::repositories::doctor_repo::create(conn, input)
        .expect("create doctor")
        .id
}

/// Seed a user in the given connection and return its id. `username` must be
/// unique within the test database (unique index on users.username).
pub fn make_user(
    conn: &mut crate::db::DbConnection,
    username: &str,
    role: &str,
    status: &str,
) -> String {
    let id = uuid::Uuid::new_v4().to_string();
    let password_hash = crate::db::hash_password("test123");
    let now = crate::db::now_timestamp();
    conn.execute(
        "INSERT INTO users (id, username, password_hash, full_name, email, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            &id,
            username,
            &password_hash,
            "Usuario Test",
            "test@example.com",
            role,
            status,
            &now,
            &now,
        ),
    )
    .expect("create user");
    id
}
