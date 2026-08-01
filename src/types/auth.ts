export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
  createdAt: string;
}

export type UserRole = "admin" | "doctor" | "receptionist";
export type UserStatus = "active" | "inactive" | "locked";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  doctor: "Medico",
  receptionist: "Recepcionista",
};
