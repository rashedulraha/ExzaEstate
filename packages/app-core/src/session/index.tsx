import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  customInstance,
  setAuthFailureHandler,
  setAuthToken,
  setRefreshHandler,
} from '@exzaestate/api-client';
import { usePlatform } from '../platform/index.js';

export interface User {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  isTwoFactorEnabled?: boolean;
  permissions: string[];
  scopes: Record<string, string>;
  branchIds: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  stepUpRequired: boolean;
  twoFactorRequired: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  verifyStepUp: (token: string) => Promise<boolean>;
  dismissSessionExpired: () => void;
  dismissStepUp: () => void;
  refreshUser: () => Promise<void>;
  setTwoFactorRequired: (required: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';

interface BackendLoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
    isTwoFactorEnabled?: boolean;
    permissions?: string[];
    scopes?: Record<string, string>;
    branchIds?: string[];
  };
}

interface BackendMeResponse {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  isTwoFactorEnabled?: boolean;
  permissions?: string[];
  scopes?: Record<string, string>;
  branchIds?: string[];
}

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { secureStorage } = usePlatform();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [stepUpRequired, setStepUpRequired] = useState<boolean>(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);

  const fetchUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const me = await customInstance<BackendMeResponse>({
        url: '/api/v1/auth/me',
        method: 'GET',
      });
      const resolvedUser: User = {
        id: me.id,
        email: me.email,
        fullName: me.fullName,
        companyId: me.companyId,
        isTwoFactorEnabled: me.isTwoFactorEnabled,
        permissions: me.permissions ?? [],
        scopes: me.scopes ?? {},
        branchIds: me.branchIds ?? [],
      };
      setUser(resolvedUser);
      return resolvedUser;
    } catch {
      return null;
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  const performTokenRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!storedRefreshToken) {
        return null;
      }

      const res = await customInstance<{ accessToken: string; refreshToken?: string }>({
        url: '/api/v1/auth/refresh',
        method: 'POST',
        data: { refreshToken: storedRefreshToken },
      });

      if (res.refreshToken) {
        await secureStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.refreshToken);
      }
      return res.accessToken;
    } catch {
      return null;
    }
  }, [secureStorage]);

  // Configure api-client hooks
  useEffect(() => {
    setRefreshHandler(performTokenRefresh);
    setAuthFailureHandler(() => {
      setSessionExpired(true);
      setUser(null);
      setAuthToken(null);
      void secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    });
  }, [performTokenRefresh, secureStorage]);

  // Initial bootstrap: restore session from keychain
  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
        if (storedRefreshToken) {
          const newAccessToken = await performTokenRefresh();
          if (newAccessToken && isMounted) {
            setAuthToken(newAccessToken);
            await fetchUserProfile();
          }
        }
      } catch (err) {
        console.error('Session bootstrap failed:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [secureStorage, performTokenRefresh, fetchUserProfile]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const response = await customInstance<BackendLoginResponse>({
        url: '/api/v1/auth/login',
        method: 'POST',
        data: credentials,
      });

      setAuthToken(response.accessToken);
      if (response.refreshToken) {
        await secureStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken);
      }

      // If user holds 2FA mandatory role and is not enabled, mark flag
      if (response.user.isTwoFactorEnabled === false) {
        // Can be set if needed
      }

      // Populate user state
      const initialUser: User = {
        id: response.user.id,
        email: response.user.email,
        fullName: response.user.fullName,
        companyId: response.user.companyId,
        isTwoFactorEnabled: response.user.isTwoFactorEnabled,
        permissions: response.user.permissions ?? [],
        scopes: response.user.scopes ?? {},
        branchIds: response.user.branchIds ?? [],
      };
      setUser(initialUser);
      setSessionExpired(false);

      // Refresh full profile in background to get all RBAC details
      void fetchUserProfile();
    },
    [secureStorage, fetchUserProfile],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await customInstance<void>({
        url: '/api/v1/auth/logout',
        method: 'POST',
      });
    } catch {
      // Logout even if network request fails
    } finally {
      setUser(null);
      setAuthToken(null);
      await secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      setSessionExpired(false);
      setStepUpRequired(false);
      setTwoFactorRequired(false);
    }
  }, [secureStorage]);

  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      await customInstance<void>({
        url: '/api/v1/auth/logout-all',
        method: 'POST',
      });
    } catch {
      // Logout even if network request fails
    } finally {
      setUser(null);
      setAuthToken(null);
      await secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      setSessionExpired(false);
      setStepUpRequired(false);
      setTwoFactorRequired(false);
    }
  }, [secureStorage]);

  const verifyStepUp = useCallback(async (token: string): Promise<boolean> => {
    try {
      await customInstance<void>({
        url: '/api/v1/auth/step-up',
        method: 'POST',
        data: { token },
      });
      setStepUpRequired(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const dismissStepUp = useCallback(() => {
    setStepUpRequired(false);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      sessionExpired,
      stepUpRequired,
      twoFactorRequired,
      login,
      logout,
      logoutAll,
      verifyStepUp,
      dismissSessionExpired,
      dismissStepUp,
      refreshUser,
      setTwoFactorRequired,
    }),
    [
      user,
      isLoading,
      sessionExpired,
      stepUpRequired,
      twoFactorRequired,
      login,
      logout,
      logoutAll,
      verifyStepUp,
      dismissSessionExpired,
      dismissStepUp,
      refreshUser,
      setTwoFactorRequired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
