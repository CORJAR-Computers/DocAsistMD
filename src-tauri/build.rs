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
                        "isql.exe",
                        "gfix.exe",
                        "gstat.exe",
                        "msvcp140.dll",
                        "vcruntime140.dll",
                        "vcruntime140_1.dll",
                        "zlib1.dll",
                    ];
                    for f in &files_to_copy {
                        let src = fb_dir.join(f);
                        let dst = target_dir.join(f);
                        if src.exists() && !dst.exists() {
                            let _ = std::fs::copy(&src, &dst);
                        }
                    }
                    let dirs_to_copy = ["plugins", "intl", "tzdata"];
                    for d in &dirs_to_copy {
                        let d_src = fb_dir.join(d);
                        let d_dst = target_dir.join(d);
                        if d_src.exists() && !d_dst.exists() {
                            let _ = copy_dir_all(&d_src, &d_dst);
                        }
                    }
                }
            }
        }
    }
}
