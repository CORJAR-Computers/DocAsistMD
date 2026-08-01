use crate::db::{hash_password, verify_password, DbState};
use crate::errors::AppError;
use crate::models::{CreateUserInput, LoginRequest, LoginResponse, User};
use crate::session::SessionState;
use chrono::Utc;
use rsfbclient::{Execute, Queryable};
use tauri::State;
use uuid::Uuid;

type UserRow = (
    String,
    String,
    String,
    String,
    String,
    String,
    Option<String>,
    String,
);

fn map_user_row(row: UserRow) -> User {
    User {
        id: row.0,
        username: row.1,
        full_name: row.2,
        email: row.3,
        role: row.4,
        status: row.5,
        last_login: row.6,
        created_at: row.7,
    }
}

/// Genera un token firmado para `user_id` con el timestamp dado (test-friendly).
pub(crate) fn generate_token_at(user_id: &str, timestamp: i64) -> String {
    let payload = format!("{}:{}", user_id, timestamp);
    let signature = hash_password(&format!("{}:DocAsistMD_Secret2026", payload));
    let sig_short = &signature[..16];
    format!("{}:{}:{}", user_id, timestamp, sig_short)
}

fn generate_token(user_id: &str) -> String {
    generate_token_at(user_id, Utc::now().timestamp())
}

/// Load a user by id (without the password hash).
pub fn get_user_by_id_conn(
    conn: &mut rsfbclient::SimpleConnection,
    user_id: &str,
) -> Result<User, AppError> {
    let rows: Vec<UserRow> = conn
        .query(
            "SELECT id, username, full_name, email, role, status, last_login, created_at
         FROM users WHERE id = ?",
            (&user_id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    rows.into_iter()
        .map(map_user_row)
        .next()
        .ok_or(AppError::Auth("Usuario no encontrado".to_string()))
}

/// RBAC: validate the token and require the caller to be an active admin.
/// Used by sensitive commands (backup/restore, user & audit management).
pub fn require_admin_conn(
    conn: &mut rsfbclient::SimpleConnection,
    token: &str,
) -> Result<User, AppError> {
    let user_id = validate_token(token)?;
    let user = get_user_by_id_conn(conn, &user_id)?;
    if user.status != "active" {
        return Err(AppError::Auth("Usuario inactivo o bloqueado".to_string()));
    }
    if user.role != "admin" {
        return Err(AppError::Auth(
            "Se requieren permisos de administrador".to_string(),
        ));
    }
    Ok(user)
}

pub(crate) fn validate_token(token: &str) -> Result<String, AppError> {
    let parts: Vec<&str> = token.split(':').collect();
    if parts.len() != 3 {
        return Err(AppError::Auth("Token invalido".to_string()));
    }
    let user_id = parts[0];
    let timestamp: i64 = parts[1]
        .parse()
        .map_err(|_| AppError::Auth("Token invalido".to_string()))?;
    if Utc::now().timestamp() - timestamp > 86400 {
        return Err(AppError::Auth("Token expirado".to_string()));
    }
    let payload = format!("{}:{}", user_id, timestamp);
    let expected_sig = hash_password(&format!("{}:DocAsistMD_Secret2026", payload));
    let expected_short = &expected_sig[..16];
    if parts[2] != expected_short {
        return Err(AppError::Auth("Token invalido".to_string()));
    }
    Ok(user_id.to_string())
}

/// Núcleo del login (testeable sin Tauri): valida credenciales contra la BD,
/// genera el token y lo guarda en el estado de sesión gestionado + disco
/// cifrado. El token nunca sale del proceso Rust.
pub(crate) fn login_core(
    conn: &mut rsfbclient::SimpleConnection,
    session: &SessionState,
    request: LoginRequest,
) -> Result<LoginResponse, AppError> {
    if request.username.trim().is_empty() || request.password.trim().is_empty() {
        return Err(AppError::Validation(
            "Username y password son requeridos".to_string(),
        ));
    }

    // Fetch user with password hash for verification
    type UserWithHashRow = (
        String,
        String,
        String,
        String,
        String,
        String,
        String,
        Option<String>,
        String,
    );
    let rows: Vec<UserWithHashRow> = conn.query(
        "SELECT id, username, password_hash, full_name, email, role, status, last_login, created_at
         FROM users WHERE username = ?",
        (&request.username,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let row = rows
        .into_iter()
        .next()
        .ok_or(AppError::Auth("Credenciales invalidas".to_string()))?;

    // Check status
    if row.6 != "active" {
        return Err(AppError::Auth("Usuario inactivo o bloqueado".to_string()));
    }

    // Verify password hash (row.2 = password_hash)
    if !verify_password(&request.password, &row.2) {
        return Err(AppError::Auth("Credenciales invalidas".to_string()));
    }

    let user = User {
        id: row.0,
        username: row.1,
        full_name: row.3,
        email: row.4,
        role: row.5,
        status: row.6,
        last_login: row.7,
        created_at: row.8,
    };

    // Update last_login
    let now = crate::db::now_timestamp();
    let _ = conn.execute(
        "UPDATE users SET last_login = ? WHERE id = ?",
        (&now, &user.id),
    );

    let token = generate_token(&user.id);
    // La sesión queda en estado gestionado de Rust; el token NO sale del proceso.
    crate::session::set_session(session, token)?;
    Ok(LoginResponse { user })
}

#[tauri::command]
pub fn login(
    state: State<DbState>,
    session: State<SessionState>,
    request: LoginRequest,
) -> Result<LoginResponse, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    login_core(&mut conn, &session, request)
}

/// Cierra la sesión actual (elimina la sesión de memoria y de disco).
#[tauri::command]
pub fn logout(session: State<SessionState>) -> Result<(), AppError> {
    crate::session::clear_session(&session)
}

#[tauri::command]
pub fn get_current_user(
    state: State<DbState>,
    session: State<SessionState>,
) -> Result<User, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_session(&session, &mut conn)
}

#[tauri::command]
pub fn create_user(
    state: State<DbState>,
    session: State<SessionState>,
    input: CreateUserInput,
) -> Result<User, AppError> {
    {
        let mut conn = state
            .conn
            .lock()
            .map_err(|e| AppError::Internal(e.to_string()))?;
        crate::session::require_admin(&session, &mut conn)?;
    }
    if input.username.trim().is_empty()
        || input.password.trim().is_empty()
        || input.full_name.trim().is_empty()
    {
        return Err(AppError::Validation(
            "Username, password y nombre son requeridos".to_string(),
        ));
    }
    if input.password.len() < 6 {
        return Err(AppError::Validation(
            "Password debe tener al menos 6 caracteres".to_string(),
        ));
    }

    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Check for duplicate username
    let existing: Vec<(String,)> = conn
        .query(
            "SELECT id FROM users WHERE username = ?",
            (&input.username,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    if !existing.is_empty() {
        return Err(AppError::Validation("Username ya existe".to_string()));
    }

    let id = Uuid::new_v4().to_string();
    let password_hash = hash_password(&input.password);
    let now = crate::db::now_timestamp();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, full_name, email, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)",
        (&id, &input.username, &password_hash, &input.full_name, &input.email, &input.role, &now, &now),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let rows: Vec<UserRow> = conn
        .query(
            "SELECT id, username, full_name, email, role, status, last_login, created_at
         FROM users WHERE id = ?",
            (&id,),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    rows.into_iter()
        .map(map_user_row)
        .next()
        .ok_or(AppError::Internal("Error al crear usuario".to_string()))
}

#[tauri::command]
pub fn get_users(
    state: State<DbState>,
    session: State<SessionState>,
) -> Result<Vec<User>, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_admin(&session, &mut conn)?;
    let rows: Vec<UserRow> = conn
        .query(
            "SELECT id, username, full_name, email, role, status, last_login, created_at
         FROM users ORDER BY full_name",
            (),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(rows.into_iter().map(map_user_row).collect())
}

#[tauri::command]
pub fn change_password(
    state: State<DbState>,
    session: State<SessionState>,
    user_id: String,
    current_password: String,
    new_password: String,
) -> Result<(), AppError> {
    if new_password.len() < 6 {
        return Err(AppError::Validation(
            "Nuevo password debe tener al menos 6 caracteres".to_string(),
        ));
    }

    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_session(&session, &mut conn)?;

    let rows: Vec<(String,)> = conn
        .query("SELECT password_hash FROM users WHERE id = ?", (&user_id,))
        .map_err(|e| AppError::Database(e.to_string()))?;

    let current_hash = rows
        .into_iter()
        .next()
        .ok_or(AppError::NotFound("Usuario no encontrado".to_string()))?
        .0;

    if !verify_password(&current_password, &current_hash) {
        return Err(AppError::Auth("Password actual incorrecto".to_string()));
    }

    let new_hash = hash_password(&new_password);
    let now = crate::db::now_timestamp();
    conn.execute(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        (&new_hash, &now, &user_id),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{make_user, TestDb};

    #[test]
    fn validate_token_accepts_well_formed_token() {
        let token = generate_token("user-123");
        let user_id = validate_token(&token).expect("valid token");
        assert_eq!(user_id, "user-123");
    }

    #[test]
    fn validate_token_rejects_malformed_tokens() {
        // Sin separadores
        assert!(validate_token("solo-una-parte").is_err());
        // Demasiadas partes
        assert!(validate_token("a:b:c:d").is_err());
        // Timestamp no numérico
        assert!(validate_token("user:abc:deadbeef").is_err());
    }

    #[test]
    fn validate_token_rejects_expired_token() {
        // Firma válida pero con timestamp de hace 48h (> 24h de vida)
        let timestamp = Utc::now().timestamp() - 172800;
        let payload = format!("user-123:{}", timestamp);
        let sig = hash_password(&format!("{}:DocAsistMD_Secret2026", payload));
        let token = format!("user-123:{}:{}", timestamp, &sig[..16]);
        let err = validate_token(&token).unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
        assert!(err.to_string().contains("expirado"));
    }

    #[test]
    fn validate_token_rejects_tampered_signature() {
        let token = generate_token("user-123");
        let parts: Vec<&str> = token.split(':').collect();
        // Corromper la firma (última parte)
        let tampered = format!("{}:{}:0000000000000000", parts[0], parts[1]);
        let err = validate_token(&tampered).unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
    }

    #[test]
    fn require_admin_allows_active_admin() {
        let mut db = TestDb::new().expect("create test db");
        let admin_id = make_user(db.conn(), "admin_test", "admin", "active");
        let token = generate_token(&admin_id);

        let user = require_admin_conn(db.conn(), &token).expect("admin allowed");
        assert_eq!(user.role, "admin");
        assert_eq!(user.status, "active");
    }

    #[test]
    fn require_admin_rejects_doctor() {
        let mut db = TestDb::new().expect("create test db");
        let doctor_id = make_user(db.conn(), "doctor_test", "doctor", "active");
        let token = generate_token(&doctor_id);

        let err = require_admin_conn(db.conn(), &token).unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
        assert!(err.to_string().contains("administrador"));
    }

    #[test]
    fn require_admin_rejects_receptionist() {
        let mut db = TestDb::new().expect("create test db");
        let recep_id = make_user(db.conn(), "recep_test", "receptionist", "active");
        let token = generate_token(&recep_id);

        let err = require_admin_conn(db.conn(), &token).unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
    }

    #[test]
    fn require_admin_rejects_inactive_admin() {
        let mut db = TestDb::new().expect("create test db");
        let inactive_id = make_user(db.conn(), "inactive_admin", "admin", "inactive");
        let token = generate_token(&inactive_id);

        let err = require_admin_conn(db.conn(), &token).unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
        assert!(err.to_string().contains("inactivo"));
    }

    #[test]
    fn require_admin_rejects_invalid_token() {
        let mut db = TestDb::new().expect("create test db");

        let err = require_admin_conn(db.conn(), "token-invalido").unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
    }

    #[test]
    fn get_user_by_id_conn_returns_matching_user() {
        let mut db = TestDb::new().expect("create test db");
        let id = make_user(db.conn(), "user_find", "doctor", "active");

        let user = get_user_by_id_conn(db.conn(), &id).expect("user found");
        assert_eq!(user.username, "user_find");
        assert_eq!(user.role, "doctor");
    }

    #[test]
    fn get_user_by_id_conn_missing_user_errors() {
        let mut db = TestDb::new().expect("create test db");

        let err = get_user_by_id_conn(db.conn(), "no-existe").unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
    }
}
