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

use crate::commands::auth_commands::{generate_token_at, login_core};
use crate::errors::AppError;
use crate::models::{LoginRequest, LoginResponse};
use crate::session::{self, SessionState};
use crate::test_utils::{make_user, AppDataGuard, SESSION_TEST_LOCK, TempDir, TestDb};
use chrono::Utc;
use std::sync::Mutex;

#[test]
fn full_session_flow_login_close_reopen_logout() {
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
    // LoginResponse solo tiene `user` (por tipo): el token no sale del proceso.

    // El estado en memoria quedó poblado (no solo el archivo en disco).
    assert!(session::current_token(&session).is_ok(), "in-memory session set");

    // La sesión quedó persistida y CIFRADA en disco.
    assert!(
        session::session_file_path().exists(),
        "session.json on disk after login"
    );
    let contents =
        std::fs::read_to_string(session::session_file_path()).expect("read session file");
    assert!(!contents.contains("admin_flow"), "no plaintext username in file");
    assert!(hex::decode(contents.trim()).is_ok(), "expected hex ciphertext blob");

    // 2. CIERRE: el proceso termina → el estado en memoria se pierde.
    drop(session);    // 3. REAPERTURA: un nuevo proceso recarga la sesión desde disco
    //    (igual que `lib.rs::run()`: SessionState { current: load_session_from_disk() });
    //    `require_session` es el núcleo del comando `get_current_user`.
    let reopened = SessionState {
        current: Mutex::new(session::load_session_from_disk()),
    };
    let user = session::require_session(&reopened, db.conn())
        .expect("session restored across restart");
    assert_eq!(user.username, "admin_flow");
    assert_eq!(user.role, "admin");
    // La reapertura NO elimina el archivo cifrado.
    assert!(
        session::session_file_path().exists(),
        "session.json still on disk after reopen"
    );

    // 4. LOGOUT: limpia memoria y disco; la sesión ya no es válida.
    session::clear_session(&reopened).expect("logout succeeds");
    assert!(
        !session::session_file_path().exists(),
        "session.json removed after logout"
    );
    let err = session::require_session(&reopened, db.conn())
        .expect_err("no session after logout");
    assert!(matches!(err, AppError::Auth(_)));
}

#[test]
fn expired_session_is_not_restored_on_reopen() {
    let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let _tmp = TempDir::new();
    let _appdata = AppDataGuard::set(_tmp.path());

    // Sesión con token de hace 48h (> 24h de vida): se persiste cifrada.
    // El user_id no necesita existir en la BD: la expiración se detecta en
    // `validate_token` ANTES de cualquier consulta a `users`.
    let session = SessionState::default();
    session::set_session(
        &session,
        generate_token_at(
            "00000000-0000-0000-0000-000000000009",
            Utc::now().timestamp() - 172800,
        ),
    )
    .expect("persist expired session");

    // ...pero al reabrir, el token expirado se descarta.
    assert!(
        session::load_session_from_disk().is_none(),
        "expired token must not restore a session"
    );

    // Un proceso nuevo (sin sesión restaurada) no puede leer el usuario actual.
    let mut db = TestDb::new().expect("create test db");
    let fresh = SessionState::default();
    let err = session::require_session(&fresh, db.conn())
        .expect_err("no session after expiry");
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
