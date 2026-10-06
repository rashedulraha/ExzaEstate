import type { ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  companyName?: string;
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
  setSession: (accessToken: string, refreshToken?: string, initialUser?: User) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  verifyStepUp: (token: string) => Promise<boolean>;
  dismissSessionExpired: () => void;
  dismissStepUp: () => void;
  refreshUser: () => Promise<void>;
  setTwoFactorRequired: (required: boolean) => void;
}

export interface BackendLoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
    companyName?: string;
    isTwoFactorEnabled?: boolean;
    permissions?: string[];
    scopes?: Record<string, string>;
    branchIds?: string[];
  };
}

export interface BackendMeResponse {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  companyName?: string;
  isTwoFactorEnabled?: boolean;
  permissions?: string[];
  scopes?: Record<string, string>;
  branchIds?: string[];
}

export interface AuthProviderProps {
  children: ReactNode;
}
