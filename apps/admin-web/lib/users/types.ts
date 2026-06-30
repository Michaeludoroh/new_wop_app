export type UserRole = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  subscription: {
    status: string;
    planCode: string | null;
    planName: string | null;
    trialActive?: boolean;
    trialEndsAt?: string | null;
    subscriptionEndsAt?: string | null;
    lastPaymentAt?: string | null;
  } | null;
};

export type UserFeedQuery = {
  search?: string;
  role?: UserRole | "";
  status?: "ACTIVE" | "DISABLED" | "ALL";
  limit?: number;
  offset?: number;
};

export type UserFeedResponse = {
  data: AdminUser[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
};
