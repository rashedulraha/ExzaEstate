import { Injectable, Logger } from '@nestjs/common';
import type { CaptchaVerifier, CaptchaVerifyResult } from '../../ports/captcha-verifier.port.js';

@Injectable()
export class TurnstileCaptchaVerifier implements CaptchaVerifier {
  private readonly logger = new Logger(TurnstileCaptchaVerifier.name);

  async verify(token: string, remoteIp?: string): Promise<CaptchaVerifyResult> {
    if (!token) {
      return { success: false, errorCodes: ['missing-input-response'] };
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      if (process.env.NODE_ENV !== 'production') {
        return { success: token.length > 0 };
      }
      this.logger.warn('TURNSTILE_SECRET_KEY not configured in production');
      return { success: false, errorCodes: ['missing-secret-key'] };
    }

    try {
      const form = new URLSearchParams();
      form.append('secret', secretKey);
      form.append('response', token);
      if (remoteIp) {
        form.append('remoteip', remoteIp);
      }

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: form,
      });

      const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
      return {
        success: data.success,
        errorCodes: data['error-codes'],
      };
    } catch (err) {
      this.logger.error(`Turnstile verification failed: ${String(err)}`);
      return { success: false, errorCodes: ['verification-request-failed'] };
    }
  }
}
