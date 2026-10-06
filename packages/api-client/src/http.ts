import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly status?: number;
  readonly raw?: unknown;

  constructor(code: string, message: string, status?: number, details?: unknown, raw?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.raw = raw;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Client configuration state
let currentAuthToken: string | null = null;
let tokenGetter: (() => string | null | Promise<string | null>) | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let authFailureHandler: (() => void) | null = null;
let clientType = 'web';
let clientVersion = '0.1.0';
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

export function setTokenGetter(getter: () => string | null | Promise<string | null>): void {
  tokenGetter = getter;
}

export function setRefreshHandler(handler: () => Promise<string | null>): void {
  refreshHandler = handler;
}

export function setAuthFailureHandler(handler: () => void): void {
  authFailureHandler = handler;
}

export function setClientInfo(type: string, version: string): void {
  clientType = type;
  clientVersion = version;
}

export function setBaseUrl(url: string): void {
  apiClient.defaults.baseURL = url;
}

export function resetClientState(): void {
  currentAuthToken = null;
  tokenGetter = null;
  refreshHandler = null;
  authFailureHandler = null;
  clientType = 'web';
  clientVersion = '0.1.0';
  isRefreshing = false;
  refreshSubscribers = [];
}

// Axios instance with default base URL
export const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token, X-Client, X-Client-Version
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = currentAuthToken;
    if (!token && tokenGetter) {
      token = await tokenGetter();
    }

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['X-Client'] = clientType;
    config.headers['X-Client-Version'] = clientVersion;

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

async function executeRefresh(
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
): Promise<AxiosResponse> {
  isRefreshing = true;
  originalRequest._retry = true;

  try {
    const newToken = await refreshHandler!();
    isRefreshing = false;
    setAuthToken(newToken);
    onRefreshed(newToken);

    if (newToken) {
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return await apiClient(originalRequest);
    }

    authFailureHandler?.();
    throw new ApiError('UNAUTHORIZED', 'Session expired', 401);
  } catch (refreshErr) {
    isRefreshing = false;
    onRefreshed(null);
    authFailureHandler?.();
    throw mapAxiosError(refreshErr);
  }
}

function queueRefresh(
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
  error: unknown,
): Promise<AxiosResponse> {
  originalRequest._retry = true;
  return new Promise((resolve, reject) => {
    subscribeTokenRefresh((newToken) => {
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        resolve(apiClient(originalRequest));
      } else {
        reject(mapAxiosError(error));
      }
    });
  });
}

// Response interceptor: handle 401 with single refresh attempt and error mapping
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<{ success?: boolean; error?: ApiErrorPayload }>) => {
    const originalRequest = (error.config ?? error.response?.config) as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Handle 401 Unauthorized with single refresh attempt
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (refreshHandler) {
        if (!isRefreshing) {
          return executeRefresh(originalRequest);
        }
        return queueRefresh(originalRequest, error);
      }
      authFailureHandler?.();
    }

    return Promise.reject(mapAxiosError(error));
  },
);

function subscribeTokenRefresh(cb: (token: string | null) => void): void {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

const STATUS_CODE_MAP: Record<number, string> = {
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  426: 'CLIENT_UPGRADE_REQUIRED',
};

function resolveDefaultErrorCode(status?: number): string {
  if (status && STATUS_CODE_MAP[status]) {
    return STATUS_CODE_MAP[status];
  }
  if (status && status >= 500) {
    return 'INTERNAL_SERVER_ERROR';
  }
  return 'NETWORK_ERROR';
}

function extractErrorPayload(
  axiosErr: AxiosError<{ success?: boolean; error?: ApiErrorPayload }>,
  status?: number,
): ApiError | null {
  const errorData = axiosErr.response?.data?.error;
  if (!errorData || typeof errorData !== 'object') {
    return null;
  }
  const code = errorData.code || `HTTP_${status || 500}`;
  const message = errorData.message || axiosErr.message || 'An error occurred';
  return new ApiError(code, message, status, errorData.details, axiosErr.response?.data);
}

export function mapAxiosError(
  error: AxiosError<{ success?: boolean; error?: ApiErrorPayload }> | unknown,
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const axiosErr = error as AxiosError<{ success?: boolean; error?: ApiErrorPayload }>;
  const status = axiosErr.response?.status;
  const payloadError = extractErrorPayload(axiosErr, status);
  if (payloadError) {
    return payloadError;
  }

  return new ApiError(
    resolveDefaultErrorCode(status),
    axiosErr.message || 'Request failed',
    status,
    undefined,
    axiosErr.response?.data,
  );
}

/**
 * Custom Orval mutator function.
 * Attaches auth, headers, maps errors, and unwraps backend response envelopes.
 */
export const customInstance = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  try {
    const response = await apiClient({
      ...config,
      ...options,
    });

    const body = response.data;
    // Unwrap { success: true, data: T, meta?: ... }
    if (body && typeof body === 'object' && body.success === true && 'data' in body) {
      return body.data as T;
    }

    return body as T;
  } catch (error) {
    throw mapAxiosError(error);
  }
};

export default customInstance;
