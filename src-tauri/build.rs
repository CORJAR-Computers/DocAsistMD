use std::path::{Path, PathBuf};

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn main() {
    tauri_build::build();

    #[cfg(target_os = "windows")]
    {
        // En Windows, copiar las DLLs de Firebird Embedded a la carpeta de salida
        // para que 'cargo run', 'cargo test' y 'npm run tauri dev' encuentren fbclient.dll sin problemas.
        if let Ok(out_dir) = std::env::var("OUT_DIR") {
            let out_path = PathBuf::from(&out_dir);
            if let Some(target_dir) = out_path.ancestors().nth(3) {
                let fb_dir = Path::new("../Firebird-5.0.3.1683-0-windows-x64");
                if fb_dir.exists() {
                    let files_to_copy = [
                        "fbclient.dll",
                        "ib_util.dll",
                        "icudt63.dll",
                        "icudt63l.dat",
                        "icuin63.dll",
                        "icuuc63.dll",
                        "firebird.msg",
                        "firebird.conf",
                        "databases.conf",
                        "plugins.conf",
                        "gbak.exe",
                    ];
                    for f in &files_to_copy {
                        let src = fb_dir.join(f);
                        let dst = target_dir.join(f);
                        if src.exists() && !dst.exists() {
                            let _ = std::fs::copy(&src, &dst);
                        }
                    }
                    let plugins_src = fb_dir.join("plugins");
                    let plugins_dst = target_dir.join("plugins");
                    if plugins_src.exists() && !plugins_dst.exists() {
                        let _ = copy_dir_all(&plugins_src, &plugins_dst);
                    }
                }
            }
        }
    }
}
