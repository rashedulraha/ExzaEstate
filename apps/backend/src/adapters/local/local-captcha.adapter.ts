import { Injectable } from '@nestjs/common';
import type { CaptchaVerifier, CaptchaVerifyResult } from '../../ports/captcha-verifier.port.js';

@Injectable()
export class LocalCaptchaVerifier implements CaptchaVerifier {
  async verify(_token: string): Promise<CaptchaVerifyResult> {
    return { success: true };
  }
}
