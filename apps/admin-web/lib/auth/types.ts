export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "USER";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type AuthResponse = {
  user: AuthUser;
} & ({ tokens: AuthTokens } | { accessToken: string; refreshToken: string });

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loading: boolean;
  error: string | null;
};
