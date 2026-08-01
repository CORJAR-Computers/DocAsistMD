/**
 * TEST-ONLY: wrapper del plugin store (LazyStore) para demostrar el patrón de
 * persistencia de sesión con expiración. NO está conectado a la app: la sesión
 * real vive 100% en el proceso Rust (src-tauri/src/session.rs, cifrada en
 * session.json) y el token nunca llega al webview. No usar para sesiones reales
 * ni conectarlo a authStore — reintroduciría el token en el frontend.
 */
import { LazyStore } from "@tauri-apps/plugin-store";
import type { User } from "@/types/auth";

export interface StoredSession {
  token: string;
  user: User;
  expiresAt: number;
}

const SESSION_KEY = "session";
/** Vida útil de la sesión: 24h, en sintonía con la expiración del token. */
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

// Fallback en memoria: permite que el servicio funcione en el navegador de
// desarrollo (sin runtime Tauri) aunque la sesión no persista entre recargas.
let memorySession: StoredSession | null = null;

let store: LazyStore | null = null;
let storeFailed = false;

function getStore(): LazyStore | null {
  if (storeFailed) return null;
  try {
    if (!store) store = new LazyStore("session.json");
    return store;
  } catch {
    storeFailed = true;
    return null;
  }
}

async function persist(session: StoredSession | null): Promise<void> {
  memorySession = session;
  const s = getStore();
  if (!s) return;
  try {
    if (session) {
      await s.set(SESSION_KEY, session);
    } else {
      await s.delete(SESSION_KEY);
    }
    await s.save();
  } catch (err) {
    console.error("Session store unavailable, using memory fallback:", err);
    storeFailed = true;
  }
}

/** True si la sesión ya venció según su `expiresAt`. */
export function isExpired(session: StoredSession): boolean {
  return session.expiresAt <= Date.now();
}

/**
 * Persistencia de la sesión en `session.json` del app-data vía plugin store,
 * con expiración de 24h. Si el plugin no está disponible (dev en navegador)
 * degrada a memoria sin persistir.
 */
export const sessionService = {
  async save(token: string, user: User): Promise<void> {
    await persist({ token, user, expiresAt: Date.now() + SESSION_DURATION_MS });
  },

  async load(): Promise<StoredSession | null> {
    const s = getStore();
    if (s) {
      try {
        const stored = await s.get<StoredSession>(SESSION_KEY);
        if (stored) memorySession = stored;
      } catch (err) {
        console.error("Session store read failed:", err);
        storeFailed = true;
      }
    }
    if (memorySession && isExpired(memorySession)) {
      // Sesión vencida: no se restaura (mismo contrato que el lado Rust).
      memorySession = null;
      return null;
    }
    return memorySession;
  },

  async clear(): Promise<void> {
    await persist(null);
  },
};
