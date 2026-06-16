import axios from "axios";
import { API_CONFIG } from "./config";
import { createAuthenticatedClient } from "./http-client";
import {
  AuthResponse,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RefreshResponse,
  RegisterPayload,
  ResetPasswordPayload
} from "./types";

const authClient = createAuthenticatedClient();

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${API_CONFIG.baseUrl}/auth/login`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await authClient.post<AuthResponse>("/auth/register", payload);
    return response.data;
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const response = await axios.post<RefreshResponse>(
      `${API_CONFIG.baseUrl}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await authClient.post("/auth/logout", { refreshToken });
  },

  async me(): Promise<AuthUser> {
    const response = await authClient.get<AuthUser>("/auth/me");
    return response.data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    const response = await authClient.post<{ message: string }>("/auth/forgot-password", payload);
    return response.data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const response = await authClient.post<{ message: string }>("/auth/reset-password", payload);
    return response.data;
  }
};
