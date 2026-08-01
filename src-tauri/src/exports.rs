use crate::errors::AppError;
use rust_xlsxwriter::Workbook;
use std::path::{Path, PathBuf};

/// Default export folder under the user's Documents directory:
/// Documents/DocAsistMD/<subfolder>.
fn default_dir(subfolder: &str) -> PathBuf {
    let docs_dir = std::env::var("USERPROFILE")
        .map(|p| PathBuf::from(p).join("Documents"))
        .or_else(|_| std::env::var("HOME").map(|h| PathBuf::from(h).join("Documents")))
        .unwrap_or_else(|_| PathBuf::from("."));
    docs_dir.join("DocAsistMD").join(subfolder)
}

/// Resolve the export folder: a user-chosen folder wins, otherwise the default
/// Documents/DocAsistMD/<subfolder>. Subfolder examples: "Reportes",
/// "Comprobantes", "Recetas".
pub fn resolve_dir(out_dir: Option<&str>, subfolder: &str) -> PathBuf {
    match out_dir {
        Some(dir) if !dir.trim().is_empty() => PathBuf::from(dir),
        _ => default_dir(subfolder),
    }
}

/// Escape a single CSV field: quote it and double inner quotes when needed.
pub fn csv_field(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

/// Create the parent directory of `out_path` if it doesn't exist yet.
fn ensure_parent_dir(out_path: &Path) -> Result<(), AppError> {
    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Internal(format!("Error creando directorio: {}", e)))?;
    }
    Ok(())
}

/// Write a CSV file (already built, UTF-8 with BOM) to `out_path`, creating
/// the parent directory if needed.
pub fn save_csv(content: &str, out_path: &Path) -> Result<(), AppError> {
    ensure_parent_dir(out_path)?;
    std::fs::write(out_path, content)
        .map_err(|e| AppError::Internal(format!("Error guardando CSV: {}", e)))
}

/// Save an XLSX workbook to `out_path`, creating the parent directory if needed.
pub fn save_xlsx(workbook: &mut Workbook, out_path: &Path) -> Result<(), AppError> {
    ensure_parent_dir(out_path)?;
    workbook
        .save(out_path)
        .map_err(|e| AppError::Internal(format!("Error guardando Excel: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn resolve_dir_uses_user_chosen_dir() {
        let picked = PathBuf::from("/user/picked/folder");
        assert_eq!(resolve_dir(Some("/user/picked/folder"), "Reportes"), picked);
    }

    #[test]
    fn resolve_dir_ignores_empty_and_whitespace_dirs() {
        // Empty or whitespace-only strings fall back to the default folder, which
        // always ends with DocAsistMD/<subfolder> regardless of the environment.
        for bad in ["", "   ", "\t"] {
            let resolved = resolve_dir(Some(bad), "Comprobantes");
            assert!(
                resolved.ends_with(Path::new("DocAsistMD").join("Comprobantes")),
                "expected fallback ending in DocAsistMD/Comprobantes, got {:?}",
                resolved
            );
        }
    }

    #[test]
    fn resolve_dir_none_falls_back_to_default() {
        let resolved = resolve_dir(None, "Recetas");
        assert!(resolved.ends_with(Path::new("DocAsistMD").join("Recetas")));
    }

    #[test]
    fn default_dir_resolution_order() {
        // Save original values so we can restore the environment afterwards.
        let old_userprofile = std::env::var_os("USERPROFILE");
        let old_home = std::env::var_os("HOME");

        // 1. USERPROFILE wins when set.
        std::env::remove_var("HOME");
        std::env::set_var("USERPROFILE", "/fake/profile");
        assert_eq!(
            default_dir("Reportes"),
            PathBuf::from("/fake/profile/Documents/DocAsistMD/Reportes")
        );

        // 2. HOME is used when USERPROFILE is missing.
        std::env::remove_var("USERPROFILE");
        std::env::set_var("HOME", "/fake/home");
        assert_eq!(
            default_dir("Recetas"),
            PathBuf::from("/fake/home/Documents/DocAsistMD/Recetas")
        );

        // 3. Current directory as last resort.
        std::env::remove_var("USERPROFILE");
        std::env::remove_var("HOME");
        assert_eq!(
            default_dir("Comprobantes"),
            PathBuf::from(".").join("DocAsistMD").join("Comprobantes")
        );

        // Restore environment.
        match old_userprofile {
            Some(v) => std::env::set_var("USERPROFILE", v),
            None => std::env::remove_var("USERPROFILE"),
        }
        match old_home {
            Some(v) => std::env::set_var("HOME", v),
            None => std::env::remove_var("HOME"),
        }
    }

    #[test]
    fn csv_field_leaves_plain_values_untouched() {
        assert_eq!(csv_field("Hola mundo"), "Hola mundo");
        assert_eq!(csv_field(""), "");
    }

    #[test]
    fn csv_field_quotes_values_with_special_chars() {
        assert_eq!(csv_field("a,b"), "\"a,b\"");
        assert_eq!(csv_field("a\nb"), "\"a\nb\"");
        assert_eq!(csv_field("a\rb"), "\"a\rb\"");
    }

    #[test]
    fn csv_field_doubles_inner_quotes() {
        assert_eq!(csv_field("dijo \"hola\""), "\"dijo \"\"hola\"\"\"");
    }
}
