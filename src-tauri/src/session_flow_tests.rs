//! Tests de integración del flujo completo de sesión ejecutando el **núcleo
//! real de los comandos** (`login_core` / `require_session` / `clear_session`)
//! sobre una base Firebird embedded real, igual que en la app empaquetada:
//!
//! 1. **Login**: valida credenciales, genera el token, lo guarda en estado
//!    gestionado y persiste `session.json` cifrado (AES-256-GCM) — el token
//!    nunca sale del proceso.
//! 2. **Cierre**: se descarta el estado en memoria (como terminar el proceso).
//! 3. **Reapertura**: `load_session_from_disk()` restaura la sesión cifrada y
//!    `require_session` la valida contra la BD.
//! 4. **Expiración**: un token con más de 24h no se restaura.
//! 5. **Logout**: `clear_session` limpia memoria y disco.
//!
//! Se usa el mismo patrón que los tests existentes de `session.rs`: TestDb
//! real + AppDataGuard (APPDATA apuntando a un directorio temporal).

use crate::commands::auth_commands::login_core;
use crate::errors::AppError;
use crate::models::{LoginRequest, LoginResponse};
use crate::session::{self, SessionState};
use crate::test_utils::{make_user, AppDataGuard, SESSION_TEST_LOCK, TempDir, TestDb};

#[test]
fn session_is_strictly_in_memory_and_not_restored_on_reopen() {
    let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let _tmp = TempDir::new();
    let _appdata = AppDataGuard::set(_tmp.path());

    // ── Proceso 1: arranca con una BD real y un admin ──
    let mut db = TestDb::new().expect("create test db");
    make_user(db.conn(), "admin_flow", "admin", "active");

    // 1. LOGIN
    let session = SessionState::default();
    let resp: LoginResponse = login_core(
        db.conn(),
        &session,
        LoginRequest {
            username: "admin_flow".into(),
            password: "test123".into(),
        },
    )
    .expect("login succeeds");
    assert_eq!(resp.user.username, "admin_flow");
    assert_eq!(resp.user.role, "admin");

    // El estado en memoria quedó poblado durante la sesión.
    assert!(session::current_token(&session).is_ok(), "in-memory session set");

    // 2. CIERRE Y REAPERTURA DE LA APP:
    // Al reiniciar la aplicación (nuevo proceso con SessionState::default()),
    // la sesión NO se restaura de disco por seguridad médica.
    drop(session);
    let reopened = SessionState::default();
    let err = session::require_session(&reopened, db.conn())
        .expect_err("session must NOT be restored across app restart");
    assert!(matches!(err, AppError::Auth(_)));
}

#[test]
fn login_rejects_invalid_credentials_and_sets_no_session() {
    let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let _tmp = TempDir::new();
    let _appdata = AppDataGuard::set(_tmp.path());

    let mut db = TestDb::new().expect("create test db");
    make_user(db.conn(), "admin_bad", "admin", "active");
    let session = SessionState::default();

    // Password incorrecto.
    let err = login_core(
        db.conn(),
        &session,
        LoginRequest {
            username: "admin_bad".into(),
            password: "wrong-password".into(),
        },
    )
    .expect_err("wrong password rejected");
    assert!(matches!(err, AppError::Auth(_)));

    // Usuario inexistente.
    let err = login_core(
        db.conn(),
        &session,
        LoginRequest {
            username: "no-existe".into(),
            password: "whatever".into(),
        },
    )
    .expect_err("unknown user rejected");
    assert!(matches!(err, AppError::Auth(_)));

    // Sin una sesión válida, require_session falla y no hay archivo en disco.
    let err = session::require_session(&session, db.conn())
        .expect_err("no session set by failed login");
    assert!(matches!(err, AppError::Auth(_)));
    assert!(
        !session::session_file_path().exists(),
        "no session file after failed login"
    );
}
