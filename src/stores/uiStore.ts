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

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  activePage: string;
  toasts: Toast[];
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  setActivePage: (page: string) => void;
  toast: (t: { type: ToastType; title: string; message?: string }) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  theme: getStoredTheme(),
  activePage: "dashboard",
  toasts: [],

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    setStoredTheme(theme);
  },

  setActivePage: (page) => set({ activePage: page }),

  toast: (t) => {
    const id = ++toastSeq;
    set((state) => ({ toasts: [...state.toasts, { id, ...t }] }));
    // Auto-dismiss
    window.setTimeout(() => get().dismissToast(id), 5000);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) => useUIStore.getState().toast({ type: "success", title, message }),
  error: (title: string, message?: string) => useUIStore.getState().toast({ type: "error", title, message }),
  info: (title: string, message?: string) => useUIStore.getState().toast({ type: "info", title, message }),
  warning: (title: string, message?: string) => useUIStore.getState().toast({ type: "warning", title, message }),
};
