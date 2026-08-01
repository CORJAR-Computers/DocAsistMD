import { apiCall } from "./api";
import type { LoginCredentials, LoginResponse, User } from "@/types/auth";

export const authService = {
  login: (credentials: LoginCredentials) =>
    apiCall<LoginResponse>("login", { request: credentials }),

  getCurrentUser: (token: string) =>
    apiCall<User>("get_current_user", { token }),

  getUsers: () => apiCall<User[]>("get_users"),
};
