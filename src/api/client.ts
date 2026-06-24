import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth-store";
import type { ApiError, AuthResultDto } from "@/api/types";
import { getErrorMessage } from "@/api/error-messages";
import { createSingleFlight } from "@/api/single-flight";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code;
    this.details = error.details;
  }
}

export const normalizeApiError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: ApiError } | undefined;

    if (payload?.error) {
      const apiErr = payload.error;
      return new ApiClientError({
        ...apiErr,
        message: getErrorMessage(apiErr.code, apiErr.message),
      });
    }
  }

  return new ApiClientError({
    code: "UNKNOWN_ERROR",
    message: getErrorMessage("UNKNOWN_ERROR", error instanceof Error ? error.message : "An unexpected error occurred"),
  });
};

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const runRefreshSingleFlight = createSingleFlight<AuthResultDto>();

const refreshAccessToken = async () => {
  return runRefreshSingleFlight(async () => {
    try {
      const response = await refreshClient.post<AuthResultDto>("/auth/refresh");
      useAuthStore.getState().setSession(response.data.user, response.data.accessToken);

      return response.data;
    } catch (error) {
      useAuthStore.getState().clearSession();
      throw error;
    }
  });
};

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;

    const isAuthRoute = request?.url?.startsWith("/auth/");
    if (error.response?.status !== 401 || request === undefined || request._retry || isAuthRoute) {
      throw normalizeApiError(error);
    }

    request._retry = true;

    try {
      const refreshed = await refreshAccessToken();
      request.headers = request.headers ?? {};
      request.headers.Authorization = `Bearer ${refreshed.accessToken}`;

      return http(request);
    } catch (refreshError) {
      throw normalizeApiError(refreshError);
    }
  },
);
