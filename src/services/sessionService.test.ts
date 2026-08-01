import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@/types/auth";

// ── Mock del plugin store de Tauri (LazyStore) ──
// Guardamos el estado en un Map en memoria y exponemos spies para poder
// inspeccionar las llamadas (set/get/delete/save).
const { storeMap, storeSpies, StoreMock } = vi.hoisted(() => {
  const storeMap = new Map<string, unknown>();
  const storeSpies = {
    get: vi.fn(async (key: string) => storeMap.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      storeMap.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      storeMap.delete(key);
    }),
    save: vi.fn(async () => {}),
  };
  class StoreMock {
    constructor(_path: string) {}
    get = storeSpies.get;
    set = storeSpies.set;
    delete = storeSpies.delete;
    save = storeSpies.save;
  }
  return { storeMap, storeSpies, StoreMock };
});

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: StoreMock,
}));

const ADMIN: User = {
  id: "u1",
  username: "admin",
  fullName: "Administrador",
  email: "admin@clinica.co",
  role: "admin",
  status: "active",
  lastLogin: null,
  createdAt: "2026-01-01",
};

/** Carga el módulo con estado fresco (los singletons del servicio se reinician). */
async function freshService() {
  vi.resetModules();
  return import("./sessionService");
}

describe("sessionService", () => {
  beforeEach(() => {
    storeMap.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("save persiste la sesión con expiresAt = ahora + 24h y load la devuelve", async () => {
    const { sessionService, SESSION_DURATION_MS } = await freshService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));

    await sessionService.save("token-abc", ADMIN);

    // Se escribió en el store (set + save) con la clave esperada.
    expect(storeSpies.set).toHaveBeenCalledWith("session", expect.any(Object));
    expect(storeSpies.save).toHaveBeenCalled();

    const loaded = await sessionService.load();
    expect(loaded?.token).toBe("token-abc");
    expect(loaded?.user).toEqual(ADMIN);
    expect(loaded?.expiresAt).toBe(
      new Date("2026-08-01T12:00:00Z").getTime() + SESSION_DURATION_MS
    );
  });

  it("load devuelve null cuando no hay sesión guardada", async () => {
    const { sessionService } = await freshService();
    expect(await sessionService.load()).toBeNull();
  });

  it("clear elimina la sesión del store y load devuelve null", async () => {
    const { sessionService } = await freshService();

    await sessionService.save("token-abc", ADMIN);
    expect(await sessionService.load()).not.toBeNull();

    await sessionService.clear();

    expect(storeSpies.delete).toHaveBeenCalledWith("session");
    expect(await sessionService.load()).toBeNull();
  });

  it("isExpired detecta sesiones vencidas con fake timers", async () => {
    const { isExpired, sessionService } = await freshService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));

    await sessionService.save("token-abc", ADMIN);
    const session = (await sessionService.load())!;
    expect(isExpired(session)).toBe(false);

    // Avanza 24h + 1ms: la sesión debe estar vencida.
    vi.setSystemTime(new Date("2026-08-02T12:00:01Z"));
    expect(isExpired(session)).toBe(true);
  });

  it("save con store roto degrada a memoria (no lanza)", async () => {
    const { sessionService } = await freshService();
    // Romper el store: set() falla.
    storeSpies.set.mockRejectedValueOnce(new Error("store unavailable"));

    await expect(sessionService.save("token-abc", ADMIN)).resolves.toBeUndefined();

    // El fallback en memoria devuelve la sesión aunque el store esté roto.
    const loaded = await sessionService.load();
    expect(loaded?.token).toBe("token-abc");
  });

  it("load descarta la sesión vencida (null), igual que el lado Rust", async () => {
    const { sessionService } = await freshService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));

    await sessionService.save("token-abc", ADMIN);
    expect(await sessionService.load()).not.toBeNull();

    // Avanza 24h + 1ms: la sesión guardada ya venció.
    vi.setSystemTime(new Date("2026-08-02T12:00:01Z"));
    expect(await sessionService.load()).toBeNull();
  });

  it("load con store roto devuelve null sin lanzar", async () => {
    const { sessionService } = await freshService();
    storeSpies.get.mockRejectedValueOnce(new Error("store unavailable"));

    await expect(sessionService.load()).resolves.toBeNull();
  });
});
