import { create } from "zustand";

export type ThemeMode = "auto" | "light" | "dark";

const THEME_STORAGE_KEY = "docasistmd-theme";

/** Aplica el modo de tema como atributo `data-theme` en <html>. */
export function applyTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", mode);
}

/** Lee la preferencia guardada (auto por defecto). */
export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "auto") {
      return stored;
    }
  } catch {
    // localStorage no disponible (p. ej. modo privado restringido)
  }
  return "auto";
}

/** Persiste la preferencia de tema. */
export function setStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignorar: la sesión conserva el tema aunque no se persista
  }
}

interface UIState {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  activePage: string;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  setActivePage: (page: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: getStoredTheme(),
  activePage: "dashboard",

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    setStoredTheme(theme);
  },

  setActivePage: (page) => set({ activePage: page }),
}));
