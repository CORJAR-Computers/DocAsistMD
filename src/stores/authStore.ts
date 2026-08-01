import { create } from "zustand";
import { authService } from "@/services/authService";
import type { User, AuthState, LoginCredentials } from "@/types/auth";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    try {
      // La sesión vive en Rust: el login solo devuelve el usuario, nunca un token.
      const response = await authService.login(credentials);
      set({ user: response.user, isAuthenticated: true });
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  initAuth: async () => {
    // Rust recarga la sesión persistida al arrancar; solo validamos contra él.
    try {
      const currentUser = await authService.getCurrentUser();
      set({ user: currentUser, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
