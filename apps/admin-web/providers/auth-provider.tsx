"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "../lib/auth/api-client";
import { tokenStorage } from "../lib/auth/token-storage";
import { AuthState, AuthUser, LoginPayload, UserRole } from "../lib/auth/types";

type AuthContextValue = AuthState & {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitializing: true,
  loading: false,
  error: null
};

const PUBLIC_ROUTES = new Set(["/login"]);
const SESSION_INVALIDATED_EVENT = "auth:session-invalidated";
const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH_GATE === "true";
const ADMIN_PORTAL_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

function readLatestTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: tokenStorage.getAccessToken(),
    refreshToken: tokenStorage.getRefreshToken()
  };
}

function extractTokens(result: unknown): { accessToken: string; refreshToken: string } {
  const payload = result as
    | { accessToken?: unknown; refreshToken?: unknown; tokens?: { accessToken?: unknown; refreshToken?: unknown } }
    | null
    | undefined;

  const nestedAccess = payload?.tokens?.accessToken;
  const nestedRefresh = payload?.tokens?.refreshToken;
  const flatAccess = payload?.accessToken;
  const flatRefresh = payload?.refreshToken;

  const accessToken = typeof nestedAccess === "string" ? nestedAccess : typeof flatAccess === "string" ? flatAccess : null;
  const refreshToken = typeof nestedRefresh === "string" ? nestedRefresh : typeof flatRefresh === "string" ? flatRefresh : null;

  if (!accessToken) {
    throw new Error("Login response missing accessToken (expected `accessToken` or `tokens.accessToken`).");
  }

  if (!refreshToken) {
    throw new Error("Login response missing refreshToken (expected `refreshToken` or `tokens.refreshToken`).");
  }

  return { accessToken, refreshToken };
}

function normalizeRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  const normalized = role.toUpperCase().replace(/[-\s]/g, "_");
  if (normalized === "SUPERADMIN" || normalized === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "MODERATOR") return "MODERATOR";
  if (normalized === "USER") return "USER";
  return null;
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  const role = normalizeRole(user.role);
  return role ? { ...user, role } : user;
}

function assertAdminPortalAccess(user: AuthUser) {
  const role = normalizeRole(user.role);
  if (!role || !ADMIN_PORTAL_ROLES.includes(role)) {
    throw new Error("This account does not have admin portal access.");
  }
}

function normalizeError(error: unknown): string {
  if (typeof error === "object" && error && "response" in error) {
    const maybeError = error as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const msg = maybeError.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
    if (maybeError.message) return maybeError.message;
  }
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);
  const router = useRouter();
  const pathname = usePathname();
  const bootstrapGeneration = useRef(0);

  const applySession = useCallback((user: AuthUser, accessToken: string, refreshToken: string) => {
    const normalizedUser = normalizeAuthUser(user);
    tokenStorage.setSession(accessToken, refreshToken, normalizedUser);
    setState({
      user: normalizedUser,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isInitializing: false,
      loading: false,
      error: null
    });
  }, []);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setState({
      ...defaultState,
      isInitializing: false
    });
  }, []);

  const bootstrap = useCallback(async () => {
    const generation = ++bootstrapGeneration.current;
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();
    const storedUser = tokenStorage.getUser();

    if (!accessToken || !refreshToken || !storedUser) {
      setState((prev) => ({ ...prev, isInitializing: false }));
      return;
    }

    if (DEBUG_AUTH) {
      console.info("[auth-provider.bootstrap] starting", {
        generation,
        storedUserRole: storedUser.role,
        accessTokenLength: accessToken.length
      });
    }

    setState((prev) => ({
      ...prev,
      loading: true
    }));

    try {
      const me = await authApi.me();
      if (generation !== bootstrapGeneration.current) {
        if (DEBUG_AUTH) {
          console.info("[auth-provider.bootstrap] abandoning stale me() success", { generation });
        }
        return;
      }

      assertAdminPortalAccess(me);

      const latest = readLatestTokens();
      applySession(
        me,
        latest.accessToken ?? accessToken,
        latest.refreshToken ?? refreshToken
      );

      if (DEBUG_AUTH) {
        console.info("[auth-provider.bootstrap] me() succeeded", { role: me.role });
      }
    } catch (error) {
      if (generation !== bootstrapGeneration.current) {
        if (DEBUG_AUTH) {
          console.info("[auth-provider.bootstrap] abandoning stale me() failure", { generation });
        }
        return;
      }

      if (DEBUG_AUTH) {
        console.warn("[auth-provider.bootstrap] me() failed, trying refresh", error);
      }

      try {
        const refreshed = await authApi.refresh(refreshToken);
        if (generation !== bootstrapGeneration.current) {
          return;
        }

        tokenStorage.setTokens(refreshed.accessToken, refreshed.refreshToken);
        const me = await authApi.me();
        if (generation !== bootstrapGeneration.current) {
          return;
        }

        assertAdminPortalAccess(me);

        const latest = readLatestTokens();
        applySession(
          me,
          latest.accessToken ?? refreshed.accessToken,
          latest.refreshToken ?? refreshed.refreshToken
        );

        if (DEBUG_AUTH) {
          console.info("[auth-provider.bootstrap] refresh + me() succeeded", { role: me.role });
        }
      } catch (refreshError) {
        if (generation !== bootstrapGeneration.current) {
          return;
        }

        if (DEBUG_AUTH) {
          console.warn("[auth-provider.bootstrap] refresh failed, clearing session", refreshError);
        }

        clearSession();
      }
    } finally {
      if (generation === bootstrapGeneration.current) {
        setState((prev) => ({ ...prev, loading: false, isInitializing: false }));
      }
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null) {
        clearSession();
        return;
      }
      if (event.key === "ministry_admin_access_token" && !event.newValue) {
        clearSession();
      }
    };

    const onSessionInvalidated = () => {
      clearSession();
      router.replace("/login");
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_INVALIDATED_EVENT, onSessionInvalidated as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_INVALIDATED_EVENT, onSessionInvalidated as EventListener);
    };
  }, [clearSession, router]);

  useEffect(() => {
    if (state.isInitializing) return;

    if (!state.isAuthenticated && pathname && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
      return;
    }

    if (state.isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [pathname, router, state.isAuthenticated, state.isInitializing]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      bootstrapGeneration.current += 1;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await authApi.login(payload);
        const { accessToken, refreshToken } = extractTokens(result);

        assertAdminPortalAccess(result.user);

        if (DEBUG_AUTH) {
          console.info("[auth-provider.login] succeeded", {
            role: result.user.role,
            accessTokenLength: accessToken.length
          });
        }

        applySession(result.user, accessToken, refreshToken);
      } catch (error) {
        console.error("[auth-provider.login] login flow exception", error);
        clearSession();
        setState((prev) => ({
          ...prev,
          loading: false,
          error: normalizeError(error)
        }));
        throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // ignore remote logout failures and clear local session regardless
    } finally {
      clearSession();
      router.replace("/login");
    }
  }, [clearSession, router]);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!state.user) return false;
      return roles.includes(state.user.role);
    },
    [state.user]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      hasRole,
      clearError
    }),
    [state, login, logout, hasRole, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
