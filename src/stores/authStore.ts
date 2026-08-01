import { create } from "zustand";
import type { User, AuthState, LoginCredentials } from "@/types/auth";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    // In production, this calls Tauri invoke -> Rust backend
    // For now, simulate authentication
    if (credentials.username && credentials.password) {
      const mockUser: User = {
        id: "1",
        username: credentials.username,
        fullName: "Dr. Carlos Mendez",
        email: "carlos@docasistmd.com",
        role: "doctor",
        status: "active",
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      set({ user: mockUser, token: "mock-jwt-token", isAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: () => set({ user: null, token: null, isAuthenticated: false }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
