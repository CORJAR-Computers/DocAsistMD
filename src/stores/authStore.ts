import { create } from "zustand";
import { authService } from "@/services/authService";
import type { User, AuthState, LoginCredentials } from "@/types/auth";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      // Store token for session persistence
      localStorage.setItem("docasistmd_token", response.token);
      localStorage.setItem("docasistmd_user", JSON.stringify(response.user));
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("docasistmd_token");
    localStorage.removeItem("docasistmd_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  initAuth: async () => {
    const token = localStorage.getItem("docasistmd_token");
    const userJson = localStorage.getItem("docasistmd_user");
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        // Validate the token is still good by fetching current user
        const currentUser = await authService.getCurrentUser(token);
        set({ user: currentUser, token, isAuthenticated: true });
      } catch {
        // Token expired or invalid - clear session
        localStorage.removeItem("docasistmd_token");
        localStorage.removeItem("docasistmd_user");
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },
}));
