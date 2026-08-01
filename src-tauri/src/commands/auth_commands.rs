use crate::db::{hash_password, verify_password, DbState};
use crate::errors::AppError;
use crate::models::{CreateUserInput, LoginRequest, LoginResponse, User};
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

fn generate_token(user_id: &str) -> String {
    let timestamp = Utc::now().timestamp();
    let payload = format!("{}:{}", user_id, timestamp);
    let signature = hash_password(&format!("{}:DocAsistMD_Secret2026", payload));
    let sig_short = &signature[..16];
    format!("{}:{}:{}", user_id, timestamp, sig_short)
}

fn validate_token(token: &str) -> Result<String, AppError> {
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

#[tauri::command]
pub fn login(state: State<DbState>, request: LoginRequest) -> Result<LoginResponse, AppError> {
    if request.username.trim().is_empty() || request.password.trim().is_empty() {
        return Err(AppError::Validation(
            "Username y password son requeridos".to_string(),
        ));
    }

    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;

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
    let now = Utc::now().to_rfc3339();
    let _ = conn.execute(
        "UPDATE users SET last_login = ? WHERE id = ?",
        (&now, &user.id),
    );

    let token = generate_token(&user.id);
    Ok(LoginResponse { user, token })
}

#[tauri::command]
pub fn get_current_user(state: State<DbState>, token: String) -> Result<User, AppError> {
    let user_id = validate_token(&token)?;
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
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

#[tauri::command]
pub fn create_user(state: State<DbState>, input: CreateUserInput) -> Result<User, AppError> {
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
    let now = Utc::now().to_rfc3339();

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
pub fn get_users(state: State<DbState>) -> Result<Vec<User>, AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
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
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        (&new_hash, &now, &user_id),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}
