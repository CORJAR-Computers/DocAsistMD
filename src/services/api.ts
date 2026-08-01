import { invoke } from "@tauri-apps/api/core";

// Generic API wrapper for Tauri IPC commands
export async function apiCall<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const result = await invoke<T>(command, args);
    return result;
  } catch (error) {
    console.error(`API Error [${command}]:`, error);
    throw error;
  }
}
