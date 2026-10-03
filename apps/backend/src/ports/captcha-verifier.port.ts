export interface CaptchaVerifyResult {
  success: boolean;
  score?: number;
  errorCodes?: string[];
}

/**
 * CaptchaVerifier Port (OQ-07)
 * Validates bot-defense tokens (Cloudflare Turnstile in Cloud, local stub in Local).
 */
export interface CaptchaVerifier {
  verify(token: string, remoteIp?: string): Promise<CaptchaVerifyResult>;
}
