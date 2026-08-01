use crate::db::DbState;
use rsfbclient::Queryable;
use crate::errors::AppError;
use crate::models::{LoginRequest, LoginResponse, User};
use tauri::State;

type UserRow = (
    String, String, String, String, String, String, Option<String>, String,
);

fn map_user_row(row: UserRow) -> User {
    User {
        id: row.0, username: row.1, full_name: row.2, email: row.3,
        role: row.4, status: row.5, last_login: row.6, created_at: row.7,
    }
}

#[tauri::command]
pub fn login(state: State<DbState>, request: LoginRequest) -> Result<LoginResponse, AppError> {
    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    // In production: verify password hash using ring crate
    // For MVP: simple credential check
    let rows: Vec<UserRow> = conn.query(
        "SELECT id, username, full_name, email, role, status, last_login, created_at
         FROM users WHERE username = ? AND status = 'active'",
        (&request.username,),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    let user = rows.into_iter().map(map_user_row).next().ok_or(AppError::Auth("Invalid credentials".to_string()))?;

    // Generate JWT token (in production: use jsonwebtoken crate)
    let token = format!("jwt-{}-{}", user.id, chrono::Utc::now().timestamp());

    Ok(LoginResponse { user, token })
}

#[tauri::command]
pub fn get_current_user(state: State<DbState>, token: String) -> Result<User, AppError> {
    // In production: validate JWT token and extract user
    // For MVP: parse token format
    let parts: Vec<&str> = token.split('-').collect();
    if parts.len() < 2 {
        return Err(AppError::Auth("Invalid token".to_string()));
    }

    let mut conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let rows: Vec<UserRow> = conn.query(
        "SELECT id, username, full_name, email, role, status, last_login, created_at
         FROM users WHERE id = ?",
        (parts[1],),
    ).map_err(|e| AppError::Database(e.to_string()))?;

    rows.into_iter().map(map_user_row).next().ok_or(AppError::Auth("User not found".to_string()))
}
