import { createAuthenticatedClient } from "../auth/http-client";
import { AdminUser, UserFeedQuery, UserFeedResponse } from "./types";

const usersClient = createAuthenticatedClient();

function normalizeUser(raw: unknown): AdminUser {
  const item = raw as Record<string, unknown>;
  const subscription = item.subscription as Record<string, unknown> | null | undefined;
  return {
    id: String(item.id ?? ""),
    email: String(item.email ?? ""),
    fullName: String(item.fullName ?? ""),
    role: (item.role as AdminUser["role"]) ?? "USER",
    lastLoginAt: item.lastLoginAt ? String(item.lastLoginAt) : null,
    createdAt: String(item.createdAt ?? ""),
    updatedAt: String(item.updatedAt ?? ""),
    active: item.active !== false,
    emailVerified: item.emailVerified === true,
    emailVerifiedAt: item.emailVerifiedAt ? String(item.emailVerifiedAt) : null,
    subscription: subscription
      ? {
          status: String(subscription.status ?? "NONE"),
          planCode:
            typeof subscription.planCode === "string" ? subscription.planCode : null,
          planName:
            typeof subscription.planName === "string" ? subscription.planName : null,
          trialActive: subscription.trialActive === true,
          trialEndsAt:
            typeof subscription.trialEndsAt === "string" ? subscription.trialEndsAt : null,
          subscriptionEndsAt:
            typeof subscription.subscriptionEndsAt === "string"
              ? subscription.subscriptionEndsAt
              : null,
          lastPaymentAt:
            typeof subscription.lastPaymentAt === "string" ? subscription.lastPaymentAt : null
        }
      : null
  };
}

export const usersApi = {
  async getUsers(query?: UserFeedQuery): Promise<UserFeedResponse> {
    const response = await usersClient.get<{ data: unknown[]; meta: UserFeedResponse["meta"] }>(
      "/users",
      {
        params: {
          ...query,
          role: query?.role || undefined,
          status: query?.status === "ALL" ? undefined : query?.status,
          emailVerification:
            query?.emailVerification === "ALL" ? undefined : query?.emailVerification
        }
      }
    );
    return {
      data: (response.data.data ?? []).map(normalizeUser),
      meta: response.data.meta ?? { total: 0, limit: 50, offset: 0 }
    };
  },

  async getUser(id: string): Promise<{ data: AdminUser }> {
    const response = await usersClient.get<{ data: unknown }>(`/users/${id}`);
    return { data: normalizeUser(response.data.data ?? response.data) };
  },

  async updateRole(id: string, role: AdminUser["role"]): Promise<{ data: AdminUser }> {
    const response = await usersClient.patch<{ data: unknown }>(`/users/${id}/role`, { role });
    return { data: normalizeUser(response.data.data ?? response.data) };
  },

  async updateStatus(id: string, active: boolean): Promise<{ data: AdminUser }> {
    const response = await usersClient.patch<{ data: unknown }>(`/users/${id}/status`, {
      active
    });
    return { data: normalizeUser(response.data.data ?? response.data) };
  },

  async verifyEmail(id: string): Promise<{ data: AdminUser }> {
    const response = await usersClient.patch<{ data: unknown }>(`/users/${id}/verify-email`);
    return { data: normalizeUser(response.data.data ?? response.data) };
  },

  async resendVerificationEmail(id: string): Promise<{ message: string }> {
    const response = await usersClient.post<{ message: string }>(
      `/users/${id}/resend-verification`
    );
    return { message: response.data.message ?? "Verification email sent." };
  }
};
