export const AUTH_STORAGE_KEYS = {
  accessToken: "ministry_admin_access_token",
  refreshToken: "ministry_admin_refresh_token",
  user: "ministry_admin_user"
} as const;

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1",
  timeoutMs: 15000
} as const;

export const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MODERATOR: 2,
  USER: 1
} as const;

/** Roles permitted to authenticate into the admin web console. */
export const ADMIN_CONSOLE_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const;

export type AdminConsoleRole = (typeof ADMIN_CONSOLE_ROLES)[number];

export function isAdminConsoleRole(role: string | null | undefined): role is AdminConsoleRole {
  if (!role) return false;
  return (ADMIN_CONSOLE_ROLES as readonly string[]).includes(role);
}
