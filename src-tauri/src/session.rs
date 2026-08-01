use crate::db::get_database_path;
use crate::errors::AppError;
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::digest::{digest, SHA256};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

/// Sesión activa. El token se genera y valida **exclusivamente dentro del
/// proceso Rust**: nunca se envía al webview ni aparece en argumentos de
/// comandos. Se persiste en `session.json` del app-data — cifrado con
/// AES-256-GCM — para sobrevivir reinicios, y se recarga/valida al arrancar.
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

/// Ruta del archivo de sesión: junto a la base de datos, en app-data.
pub(crate) fn session_file_path() -> PathBuf {
    get_database_path().with_file_name("session.json")
}

/// Ruta del salt de cifrado por-instalación.
fn session_salt_path() -> PathBuf {
    get_database_path().with_file_name("session.salt")
}

/// Secret de la app para el cifrado (nunca se escribe en disco).
const SESSION_CRYPT_VERSION: &str = "DocAsistMD::Session::V1";
const NONCE_LEN: usize = 12;

/// Lee el salt de 32 bytes por-instalación o lo genera una vez. El salt se
/// guarda en `session.salt`: copiar `session.json` a otra instalación no
/// permite descifrarlo porque la clave derivada incluye este salt.
fn load_or_create_salt() -> Result<[u8; 32], AppError> {
    let path = session_salt_path();
    if let Ok(data) = std::fs::read(&path) {
        if data.len() == 32 {
            let mut salt = [0u8; 32];
            salt.copy_from_slice(&data);
            return Ok(salt);
        }
    }
    let mut salt = [0u8; 32];
    SystemRandom::new()
        .fill(&mut salt)
        .map_err(|e| AppError::Internal(format!("No se pudo generar el salt: {}", e)))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Internal(format!("No se pudo crear app-data: {}", e)))?;
    }
    std::fs::write(&path, &salt)
        .map_err(|e| AppError::Internal(format!("No se pudo guardar el salt: {}", e)))?;
    restrict_permissions(&path);
    Ok(salt)
}

/// Restringe permisos del archivo a solo el usuario (solo Unix; en Windows
/// el app-data ya está protegido por ACL del perfil de usuario).
#[cfg(unix)]
fn restrict_permissions(path: &PathBuf) {
    use std::os::unix::fs::PermissionsExt;
    let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &PathBuf) {}

/// Deriva la clave AES-256 (32 bytes) a partir del secreto de la app + salt
/// por-instalación. Nunca se serializa ni se escribe en disco.
fn session_key() -> Result<[u8; 32], AppError> {
    let salt = load_or_create_salt()?;
    let mut source = Vec::with_capacity(SESSION_CRYPT_VERSION.len() + salt.len());
    source.extend_from_slice(SESSION_CRYPT_VERSION.as_bytes());
    source.extend_from_slice(&salt);
    let hash = digest(&SHA256, &source);
    let mut key = [0u8; 32];
    key.copy_from_slice(hash.as_ref());
    Ok(key)
}

/// Cifra el token: nonce (12B) + ciphertext+tag, todo en hex.
fn encrypt_token(key: &[u8; 32], token: &str) -> Result<String, AppError> {
    let unbound = UnboundKey::new(&AES_256_GCM, key)
        .map_err(|e| AppError::Internal(format!("Clave inválida: {}", e)))?;
    let sealing_key = LessSafeKey::new(unbound);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    SystemRandom::new()
        .fill(&mut nonce_bytes)
        .map_err(|e| AppError::Internal(format!("No se pudo generar el nonce: {}", e)))?;
    let nonce = Nonce::try_assume_unique_for_key(&nonce_bytes)
        .map_err(|e| AppError::Internal(format!("Nonce inválido: {}", e)))?;

    let mut in_out = token.as_bytes().to_vec();
    sealing_key
        .seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out)
        .map_err(|e| AppError::Internal(format!("Error al cifrar la sesión: {}", e)))?;

    let mut blob = nonce_bytes.to_vec();
    blob.extend_from_slice(&in_out);
    Ok(hex::encode(blob))
}

/// Descifra un blob hex (nonce + ciphertext). Devuelve `None` si el formato
/// no es válido, la clave no coincide o la autenticación falla.
fn decrypt_token(key: &[u8; 32], blob_hex: &str) -> Option<String> {
    let blob = hex::decode(blob_hex.trim()).ok()?;
    if blob.len() <= NONCE_LEN {
        return None;
    }
    let (nonce_bytes, ciphertext) = blob.split_at(NONCE_LEN);
    let nonce = Nonce::try_assume_unique_for_key(nonce_bytes).ok()?;
    let unbound = UnboundKey::new(&AES_256_GCM, key).ok()?;
    let opening_key = LessSafeKey::new(unbound);

    let mut in_out = ciphertext.to_vec();
    let plaintext = opening_key
        .open_in_place(nonce, Aad::empty(), &mut in_out)
        .ok()?;
    String::from_utf8(plaintext.to_vec()).ok()
}

/// Recarga la sesión persistida si existe, se descifra y su token sigue
/// válido. Se llama al arrancar la app; un token expirado o un archivo
/// ilegible se descartan silenciosamente. Migra el formato legacy en claro
/// (versiones anteriores) re-cifrándolo.
pub fn load_session_from_disk() -> Option<Session> {
    let path = session_file_path();
    let contents = std::fs::read_to_string(path).ok()?;
    let key = session_key().ok()?;

    // Nuevo formato: blob hex cifrado.
    if let Some(token) = decrypt_token(&key, &contents) {
        if crate::commands::auth_commands::validate_token(&token).is_ok() {
            return Some(Session { token });
        }
        return None;
    }

    // Migración: formato legacy en claro (JSON con el campo `token`).
    if let Ok(legacy) = serde_json::from_str::<Session>(&contents) {
        if crate::commands::auth_commands::validate_token(&legacy.token).is_ok() {
            let _ = save_session_to_disk(&legacy); // re-cifrar
            return Some(legacy);
        }
    }
    None
}

fn save_session_to_disk(session: &Session) -> Result<(), AppError> {
    let path = session_file_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Internal(format!("No se pudo crear app-data: {}", e)))?;
    }
    let key = session_key()?;
    let encrypted = encrypt_token(&key, &session.token)?;
    std::fs::write(&path, encrypted)
        .map_err(|e| AppError::Internal(format!("No se pudo guardar la sesión: {}", e)))?;
    restrict_permissions(&path);
    Ok(())
}

/// Almacena la sesión en memoria gestionada y la persiste cifrada en disco.
pub fn set_session(state: &SessionState, token: String) -> Result<(), AppError> {
    let session = Session { token };
    save_session_to_disk(&session)?;
    *state
        .current
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))? = Some(session);
    Ok(())
}

/// Elimina la sesión de memoria y de disco.
///
/// Primero sobrescribe el archivo con contenido no parseable y luego lo borra:
/// si el borrado falla (permisos, lock transitorio), `load_session_from_disk`
/// no podrá restaurar el token, así la sesión no revive tras un reinicio.
pub fn clear_session(state: &SessionState) -> Result<(), AppError> {
    let path = session_file_path();
    let _ = std::fs::write(&path, "{}");
    let removal = std::fs::remove_file(&path);
    if let Ok(mut guard) = state.current.lock() {
        *guard = None;
    }
    removal.map_err(|e| AppError::Internal(format!("No se pudo eliminar la sesión: {}", e)))
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
    fn clear_removes_session_from_memory_and_disk() {
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
    fn expired_session_is_discarded_on_load() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());

        // Token de hace 48h (expirado; la vida útil es de 24h).
        let old_ts = chrono::Utc::now().timestamp() - 172800;
        let state = SessionState::default();
        set_session(&state, generate_token_at("user-1", old_ts)).expect("set session");

        assert!(current_token(&state).is_err(), "expired token rejected");
        assert!(
            load_session_from_disk().is_none(),
            "expired session not restored on restart"
        );
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

    #[test]
    fn session_file_is_encrypted_at_rest() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());

        let state = SessionState::default();
        let token = fresh_token();
        set_session(&state, token.clone()).expect("set session");

        let contents = std::fs::read_to_string(session_file_path()).expect("read session file");
        // El token NUNCA aparece en claro en disco.
        assert!(
            !contents.contains(&token),
            "token must not appear in plaintext in session.json"
        );
        // Formato esperado: hex (nonce + ciphertext), sin JSON legible.
        assert!(hex::decode(contents.trim()).is_ok(), "expected hex blob");
        assert!(!contents.contains("token"), "no JSON token field expected");
    }

    #[test]
    fn tampered_session_salt_breaks_decryption() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());

        let state = SessionState::default();
        set_session(&state, fresh_token()).expect("set session");

        // Corromper el salt: la clave derivada cambia y el descifrado falla.
        std::fs::write(session_salt_path(), [0xABu8; 32]).expect("overwrite salt");

        assert!(
            load_session_from_disk().is_none(),
            "session with mismatched salt must not load"
        );
    }

    #[test]
    fn legacy_plaintext_session_is_migrated_and_reencrypted() {
        let _lock = SESSION_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let _tmp = TempDir::new();
        let _appdata = AppDataGuard::set(_tmp.path());

        // Escribir el formato legacy de versiones anteriores (JSON en claro).
        let token = fresh_token();
        let legacy = serde_json::json!({ "token": token }).to_string();
        let path = session_file_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).expect("create app-data dir");
        }
        std::fs::write(&path, legacy).expect("write legacy session");

        let loaded = load_session_from_disk().expect("legacy session migrates");
        assert_eq!(loaded.token, token);

        // Tras la migración el archivo queda cifrado.
        let contents = std::fs::read_to_string(session_file_path()).expect("read session file");
        assert!(
            !contents.contains(&token),
            "migrated file must be re-encrypted"
        );
    }
}
