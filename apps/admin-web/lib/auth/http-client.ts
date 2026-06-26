import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "./token-storage";
import { API_CONFIG } from "./config";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _retryCount?: number;
};

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];
const SESSION_INVALIDATED_EVENT = "auth:session-invalidated";
const MAX_REQUEST_RETRY = 1;
const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH_GATE === "true";

function processQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

function broadcastSessionInvalidated(reason: "refresh_failed" | "unauthorized" | "forbidden") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT, { detail: { reason } }));
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    tokenStorage.clear();
    return null;
  }

  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_CONFIG.baseUrl}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );

    const currentUser = tokenStorage.getUser();
    if (currentUser) {
      tokenStorage.setSession(response.data.accessToken, response.data.refreshToken, currentUser);
    } else {
      tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("auth:lastRefreshAt", new Date().toISOString());
    }

    if (DEBUG_AUTH) {
      console.info("[http-client] refresh succeeded", {
        accessTokenLength: response.data.accessToken.length
      });
    }

    return response.data.accessToken;
  } catch {
    const currentRefresh = tokenStorage.getRefreshToken();
    if (currentRefresh === refreshToken) {
      tokenStorage.clear();
      broadcastSessionInvalidated("refresh_failed");
    } else if (DEBUG_AUTH) {
      console.info("[http-client] refresh failed but tokens were replaced concurrently");
    }
    return null;
  }
}

export function createAuthenticatedClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_CONFIG.baseUrl,
    timeout: API_CONFIG.timeoutMs,
    headers: {
      "Content-Type": "application/json"
    }
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (DEBUG_AUTH) {
      console.info("[http-client] request", {
        method: config.method,
        url: config.url,
        hasAuthorization: Boolean(token)
      });
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequestConfig;

      const status = error.response?.status;

      if (status === 403) {
        return Promise.reject(error);
      }

      if (status !== 401) {
        return Promise.reject(error);
      }

      const retryCount = originalRequest?._retryCount ?? 0;
      if (retryCount >= MAX_REQUEST_RETRY) {
        broadcastSessionInvalidated("unauthorized");
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((newToken) => {
            if (!newToken) {
              reject(error);
              return;
            }
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(client(originalRequest));
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;
      originalRequest._retryCount = retryCount + 1;

      try {
        const newToken = await refreshAccessToken();
        processQueue(newToken);
        if (!newToken) {
          broadcastSessionInvalidated("unauthorized");
          return Promise.reject(error);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return client(originalRequest);
      } catch (refreshError) {
        processQueue(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  return client;
}
