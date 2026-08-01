import { open } from "@tauri-apps/plugin-dialog";

const LAST_FOLDER_KEY = "docasistmd_last_export_folder";

/** Returns the last folder the user chose for exports, or null. */
export function getLastExportFolder(): string | null {
  try {
    return localStorage.getItem(LAST_FOLDER_KEY);
  } catch {
    return null;
  }
}

/** Persists the last folder chosen for exports. */
export function setLastExportFolder(path: string): void {
  try {
    localStorage.setItem(LAST_FOLDER_KEY, path);
  } catch {
    // storage unavailable — ignore, feature degrades gracefully
  }
}

/** Clears the remembered export folder so exports fall back to the default. */
export function clearLastExportFolder(): void {
  try {
    localStorage.removeItem(LAST_FOLDER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Opens the native folder picker (starting at the last chosen folder when one
 * is remembered) and returns the selected directory path, or null when the
 * user cancels.
 *
 * On a real failure (plugin/permission error) it throws, so callers can show
 * an error message instead of silently doing nothing. A successful selection
 * is remembered for next time.
 */
export async function pickExportFolder(): Promise<string | null> {
  const last = getLastExportFolder();
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Seleccionar carpeta de destino",
    defaultPath: last ?? undefined,
  });
  if (typeof selected === "string" && selected.trim()) {
    setLastExportFolder(selected);
    return selected;
  }
  return null;
}

/**
 * Opens the native file picker for a Firebird backup (.fbk) file.
 * Returns the selected file path, or null when cancelled.
 */
export async function pickBackupFile(): Promise<string | null> {
  const last = getLastExportFolder();
  const selected = await open({
    directory: false,
    multiple: false,
    title: "Seleccionar respaldo (.fbk) a restaurar",
    defaultPath: last ?? undefined,
    filters: [{ name: "Respaldo Firebird", extensions: ["fbk"] }],
  });
  if (typeof selected === "string" && selected.trim()) {
    return selected;
  }
  return null;
}
