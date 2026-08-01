use crate::db::{find_gbak, get_database_path, DbState};
use crate::errors::AppError;
use crate::models::{BackupResult, RestoreResult};
use crate::session::SessionState;
use chrono::Utc;
use std::path::PathBuf;
use std::process::Command;
use tauri::State;

/// Check the caller is an authenticated admin before proceeding.
fn require_admin(state: &State<DbState>, session: &SessionState) -> Result<(), AppError> {
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    crate::session::require_admin(session, &mut conn)?;
    Ok(())
}

fn gbak_args() -> [&'static str; 4] {
    ["-user", "SYSDBA", "-password", "masterkey"]
}

/// Run `gbak -b` (hot backup) of the live database into `destination_dir`.
/// Returns the generated file name and its size.
#[tauri::command]
pub fn backup_database(
    state: State<DbState>,
    session: State<SessionState>,
    destination_dir: String,
) -> Result<BackupResult, AppError> {
    require_admin(&state, &session)?;

    let gbak = find_gbak()
        .ok_or_else(|| AppError::Internal("No se encontró gbak de Firebird".to_string()))?;
    let db_path = get_database_path();

    let dir = PathBuf::from(&destination_dir);
    std::fs::create_dir_all(&dir).map_err(|e| AppError::Internal(e.to_string()))?;

    let stamp = Utc::now().format("%Y%m%d-%H%M%S");
    let file_name = format!("docasistmd-backup-{}.fbk", stamp);
    let dest = dir.join(&file_name);

    let db_str = db_path.to_string_lossy().to_string();
    let dest_str = dest.to_string_lossy().to_string();

    let out = Command::new(&gbak)
        .arg("-b")
        .arg(&db_str)
        .arg(&dest_str)
        .args(gbak_args())
        .output()
        .map_err(|e| AppError::Internal(format!("No se pudo ejecutar gbak: {}", e)))?;

    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(AppError::Internal(format!(
            "Error de gbak (backup): {}",
            err.trim()
        )));
    }

    let size_bytes = std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);
    Ok(BackupResult {
        path: dest_str,
        file_name,
        size_bytes,
    })
}

/// Stage a restore: validate the source `.fbk`, take a safety backup of the
/// current database, then schedule the actual restore to run on next startup
/// (the app can't replace a database it has open).
#[tauri::command]
pub fn restore_database(
    state: State<DbState>,
    session: State<SessionState>,
    source_path: String,
) -> Result<RestoreResult, AppError> {
    require_admin(&state, &session)?;

    let src = PathBuf::from(&source_path);
    if !src.exists() {
        return Err(AppError::Validation(
            "El archivo de respaldo no existe".to_string(),
        ));
    }

    let gbak = find_gbak()
        .ok_or_else(|| AppError::Internal("No se encontró gbak de Firebird".to_string()))?;
    let db_path = get_database_path();
    let db_dir = db_path
        .parent()
        .ok_or_else(|| AppError::Internal("Ruta de base de datos inválida".to_string()))?;
    std::fs::create_dir_all(db_dir).ok();

    let stamp = Utc::now().format("%Y%m%d-%H%M%S");
    let safety_name = format!("docasistmd-pre-restore-{}.fbk", stamp);
    let safety = db_dir.join(&safety_name);

    // 1) Safety backup of the current database.
    let db_str = db_path.to_string_lossy().to_string();
    let safety_str = safety.to_string_lossy().to_string();
    let out = Command::new(&gbak)
        .arg("-b")
        .arg(&db_str)
        .arg(&safety_str)
        .args(gbak_args())
        .output()
        .map_err(|e| AppError::Internal(format!("No se pudo ejecutar gbak: {}", e)))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(AppError::Internal(format!(
            "No se pudo crear el respaldo de seguridad: {}",
            err.trim()
        )));
    }

    // 2) Stage the restore file + pending flag for next startup.
    let staged = db_dir.join("docasistmd.restore.fbk");
    std::fs::copy(&src, &staged).map_err(|e| AppError::Internal(e.to_string()))?;
    std::fs::write(db_dir.join("restore_pending.flag"), "pending")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(RestoreResult {
        restart_required: true,
        message: "La restauración se aplicará al reiniciar la aplicación".to_string(),
        safety_backup_path: safety_str,
    })
}
