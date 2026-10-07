import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  customInstance,
  setAuthFailureHandler,
  setAuthToken,
  setRefreshHandler,
} from '@exzaestate/api-client';
import { usePlatform } from '../platform/index.js';

import type {
  AuthContextType,
  AuthProviderProps,
  BackendLoginResponse,
  BackendMeResponse,
  LoginCredentials,
  User,
} from './types.js';

export * from './types.js';

const AuthContext = createContext<AuthContextType | null>(null);

const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const ACCESS_TOKEN_STORAGE_KEY = 'access_token';

export function AuthProvider({ children }: AuthProviderProps) {
  const { secureStorage, apiConfig } = usePlatform();
  const isWeb = apiConfig.clientType === 'web';
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [stepUpRequired, setStepUpRequired] = useState<boolean>(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

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
        companyName: me.companyName,
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
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const task = (async () => {
      try {
        let payload: Record<string, string> = {};
        if (!isWeb) {
          const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
          if (!storedRefreshToken) {
            return null;
          }
          payload = { refreshToken: storedRefreshToken };
        }

        const res = await customInstance<{ accessToken: string; refreshToken?: string }>({
          url: '/api/v1/auth/refresh',
          method: 'POST',
          data: payload,
        });

        if (res.accessToken) {
          setAuthToken(res.accessToken);
          await secureStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, res.accessToken);
        }
        if (!isWeb && res.refreshToken) {
          await secureStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.refreshToken);
        }
        return res.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = task;
    return task;
  }, [secureStorage, isWeb]);

  // Configure api-client hooks
  useEffect(() => {
    setRefreshHandler(performTokenRefresh);
    setAuthFailureHandler(() => {
      setSessionExpired(true);
      setUser(null);
      setAuthToken(null);
      void secureStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      if (!isWeb) {
        void secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
    });
  }, [performTokenRefresh, secureStorage, isWeb]);

  async function restoreViaRefresh(
    isWeb: boolean,
    secureStorage: { getItem: (key: string) => Promise<string | null> },
    refresh: () => Promise<string | null>,
  ): Promise<string | null> {
    if (isWeb) {
      return refresh();
    }
    const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!storedRefreshToken) return null;
    return refresh();
  }

  // Initial bootstrap: restore session from keychain or web storage
  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        // Fast-path: Check if valid access token is already saved from prior active session
        const storedAccessToken = await secureStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (storedAccessToken && isMounted) {
          setAuthToken(storedAccessToken);
          const profile = await fetchUserProfile();
          if (profile && isMounted) {
            setIsLoading(false);
            return;
          }
        }

        // If access token expired or not stored, restore session via refresh
        const newAccessToken = await restoreViaRefresh(isWeb, secureStorage, performTokenRefresh);
        if (newAccessToken && isMounted) {
          setAuthToken(newAccessToken);
          await fetchUserProfile();
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
  }, [secureStorage, performTokenRefresh, fetchUserProfile, isWeb]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const response = await customInstance<BackendLoginResponse>({
        url: '/api/v1/auth/login',
        method: 'POST',
        data: credentials,
      });

      setAuthToken(response.accessToken);
      await secureStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.accessToken);
      if (!isWeb && response.refreshToken) {
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
        companyName: response.user.companyName,
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
    [secureStorage, fetchUserProfile, isWeb],
  );

  const setSession = useCallback(
    async (accessToken: string, refreshToken?: string, initialUser?: User): Promise<void> => {
      setAuthToken(accessToken);
      await secureStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
      if (!isWeb && refreshToken) {
        await secureStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      }
      if (initialUser) {
        setUser(initialUser);
      }
      setSessionExpired(false);
      void fetchUserProfile();
    },
    [secureStorage, fetchUserProfile, isWeb],
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
      await secureStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      if (!isWeb) {
        await secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
      setSessionExpired(false);
      setStepUpRequired(false);
      setTwoFactorRequired(false);
    }
  }, [secureStorage, isWeb]);

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
      await secureStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      if (!isWeb) {
        await secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
      setSessionExpired(false);
      setStepUpRequired(false);
      setTwoFactorRequired(false);
    }
  }, [secureStorage, isWeb]);

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
      setSession,
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
      setSession,
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
