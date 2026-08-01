use crate::db::get_database_path;
use crate::errors::AppError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

/// Sesión activa. El token se genera y valida **exclusivamente dentro del
/// proceso Rust** en memoria durante la ejecución de la aplicación.
/// Por razones de seguridad médica (equipos compartidos en clínicas), la sesión
/// NUNCA se persiste en disco ni se restaura tras reiniciar la app.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub token: String,
}

/// Estado gestionado por Tauri (`.manage()`). Accesible desde cualquier
/// comando a través de `State<SessionState>`.
pub struct SessionState {
    pub current: Mutex<Option<Session>>,
}

impl Default for SessionState {
    fn default() -> Self {
        SessionState {
            current: Mutex::new(None),
        }
    }
}

/// Ruta del archivo de sesión legacy en app-data (se elimina si existiera).
pub(crate) fn session_file_path() -> PathBuf {
    get_database_path().with_file_name("session.json")
}



/// Almacena la sesión en memoria gestionada durante la ejecución del proceso.
pub fn set_session(state: &SessionState, token: String) -> Result<(), AppError> {
    let session = Session { token };
    *state
        .current
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))? = Some(session);
    Ok(())
}

/// Elimina la sesión de memoria.
pub fn clear_session(state: &SessionState) -> Result<(), AppError> {
    let path = session_file_path();
    if path.exists() {
        let _ = std::fs::remove_file(&path);
    }
    if let Ok(mut guard) = state.current.lock() {
        *guard = None;
    }
    Ok(())
}

/// Devuelve el token de la sesión activa si hay una válida (no expirada).
pub fn current_token(state: &SessionState) -> Result<String, AppError> {
    let guard = state
        .current
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let session = guard
        .as_ref()
        .ok_or_else(|| AppError::Auth("Sesión no iniciada".to_string()))?;
    crate::commands::auth_commands::validate_token(&session.token)?;
    Ok(session.token.clone())
}

/// Requiere una sesión autenticada válida (cualquier rol) y devuelve el usuario.
pub fn require_session(
    state: &SessionState,
    conn: &mut rsfbclient::SimpleConnection,
) -> Result<crate::models::User, AppError> {
    let token = current_token(state)?;
    let user_id = crate::commands::auth_commands::validate_token(&token)?;
    crate::commands::auth_commands::get_user_by_id_conn(conn, &user_id)
}

/// Requiere una sesión válida de un usuario admin activo.
pub fn require_admin(
    state: &SessionState,
    conn: &mut rsfbclient::SimpleConnection,
) -> Result<crate::models::User, AppError> {
    let token = current_token(state)?;
    crate::commands::auth_commands::require_admin_conn(conn, &token)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::auth_commands::generate_token_at;
    use crate::test_utils::{make_user, AppDataGuard, SESSION_TEST_LOCK, TempDir};

    fn fresh_token() -> String {
        generate_token_at("user-1", chrono::Utc::now().timestamp())
    }

    #[test]
    fn set_and_load_roundtrip_persists_session() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());

        let state = SessionState::default();
        let token = fresh_token();
        set_session(&state, token.clone()).expect("set session");

        // Un estado nuevo (como un reinicio de la app) recarga desde disco.
        let reloaded = load_session_from_disk().expect("session should be on disk");
        assert_eq!(reloaded.token, token);
        assert!(session_file_path().exists());
    }

    #[test]
    fn in_memory_session_lifecycle() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());

        let state = SessionState::default();
        let token = fresh_token();
        set_session(&state, token.clone()).expect("set session");

        // En memoria el token está activo.
        assert_eq!(current_token(&state).expect("valid token"), token);

        // Al reiniciar la app (nuevo proceso / nuevo SessionState), la sesión no se restaura.
        assert!(load_session_from_disk().is_none());
        assert!(!session_file_path().exists());
    }

    #[test]
    fn clear_removes_session_from_memory() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());

        let state = SessionState::default();
        set_session(&state, fresh_token()).expect("set session");
        assert!(current_token(&state).is_ok());

        clear_session(&state).expect("clear session");
        assert!(current_token(&state).is_err(), "no session after clear");
        assert!(load_session_from_disk().is_none(), "file removed after clear");
    }

    #[test]
    fn no_session_returns_auth_error() {
        let state = SessionState::default();
        let err = current_token(&state).unwrap_err();
        assert!(matches!(err, AppError::Auth(_)));
    }

    #[test]
    fn require_admin_accepts_active_admin_and_rejects_doctor() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());
        let mut db = crate::test_utils::TestDb::new().expect("create test db");

        let admin_id = make_user(db.conn(), "admin_sess", "admin", "active");
        let doctor_id = make_user(db.conn(), "doc_sess", "doctor", "active");

        let state = SessionState::default();
        set_session(
            &state,
            generate_token_at(&admin_id, chrono::Utc::now().timestamp()),
        )
        .expect("admin session");
        let admin = require_admin(&state, db.conn()).expect("admin allowed");
        assert_eq!(admin.role, "admin");

        set_session(
            &state,
            generate_token_at(&doctor_id, chrono::Utc::now().timestamp()),
        )
        .expect("doctor session");
        let err = require_admin(&state, db.conn()).unwrap_err();
        assert!(matches!(err, AppError::Auth(_)), "doctor rejected");
    }
}
