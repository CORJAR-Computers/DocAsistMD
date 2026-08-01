import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  theme: "light" | "dark";
  activePage: string;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setActivePage: (page: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: "light",
  activePage: "dashboard",

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
  setActivePage: (page) => set({ activePage: page }),
}));
