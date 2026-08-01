import { create } from "zustand";
import { authService } from "@/services/authService";
import type { User, AuthState, LoginCredentials } from "@/types/auth";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
      });
      // Persist token
      localStorage.setItem("docasistmd_token", response.token);
      localStorage.setItem("docasistmd_user", JSON.stringify(response.user));
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem("docasistmd_token");
    localStorage.removeItem("docasistmd_user");
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  checkAuth: () => {
    const token = localStorage.getItem("docasistmd_token");
    const userStr = localStorage.getItem("docasistmd_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        get().logout();
      }
    }
  },
}));
