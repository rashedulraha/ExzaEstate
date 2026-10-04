import { useState, useCallback } from 'react';
import { useAuth, getErrorMessage, getErrorCode } from '@exzaestate/app-core';
import { customInstance } from '@exzaestate/api-client';
import type { LoginFormData } from '../schemas/auth.schema.js';

export interface Generate2FaResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface Enable2FaResponse {
  recoveryCodes: string[];
}

export function useAuthFlow() {
  const { login, verifyStepUp, dismissStepUp, dismissSessionExpired, user, isAuthenticated } =
    useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (data: LoginFormData): Promise<boolean> => {
      setIsSubmitting(true);
      setErrorMessage(null);
      setErrorCode(null);

      try {
        await login(data);
        return true;
      } catch (err) {
        const code = getErrorCode(err);
        const msg = getErrorMessage(err);
        setErrorCode(code);
        setErrorMessage(msg);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [login],
  );

  const generate2FaSecret = useCallback(async (): Promise<Generate2FaResponse> => {
    return customInstance<Generate2FaResponse>({
      url: '/api/v1/auth/2fa/generate',
      method: 'POST',
    });
  }, []);

  const enable2Fa = useCallback(async (secret: string, token: string): Promise<string[]> => {
    const res = await customInstance<Enable2FaResponse>({
      url: '/api/v1/auth/2fa/enable',
      method: 'POST',
      data: { secret, token },
    });
    return res.recoveryCodes;
  }, []);

  return {
    handleLogin,
    generate2FaSecret,
    enable2Fa,
    verifyStepUp,
    dismissStepUp,
    dismissSessionExpired,
    isSubmitting,
    errorMessage,
    errorCode,
    clearError: () => {
      setErrorMessage(null);
      setErrorCode(null);
    },
    user,
    isAuthenticated,
  };
}
