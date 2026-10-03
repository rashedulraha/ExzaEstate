import crypto from 'node:crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class TotpUtil {
  /**
   * Generates a random Base32 secret string (20 bytes / 160 bits).
   */
  static generateSecret(length = 32): string {
    const randomBytes = crypto.randomBytes(length);
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += BASE32_CHARS[randomBytes[i]! % BASE32_CHARS.length];
    }
    return secret;
  }

  /**
   * Decodes a Base32 string into a Buffer.
   */
  private static base32Decode(base32: string): Buffer {
    const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < clean.length; i++) {
      const idx = BASE32_CHARS.indexOf(clean[i]!);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Generates otpauth:// URI for QR code generation.
   */
  static generateUri(email: string, secret: string, issuer = 'ExzaEstate'): string {
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generates a 6-digit TOTP code for a given timestamp (default: current time).
   */
  static generateCode(secret: string, timestamp = Date.now()): string {
    const counter = Math.floor(timestamp / 1000 / 30);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const secretBuffer = this.base32Decode(secret);
    const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();

    const offset = hmac[hmac.length - 1]! & 0x0f;
    const code =
      ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);

    const otp = (code % 1000000).toString().padStart(6, '0');
    return otp;
  }

  /**
   * Verifies a 6-digit TOTP code against a secret with window tolerance.
   */
  static verifyToken(secret: string, token: string, window = 1): boolean {
    const cleanToken = token.trim();
    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    const now = Date.now();
    for (let i = -window; i <= window; i++) {
      const checkTime = now + i * 30 * 1000;
      if (this.generateCode(secret, checkTime) === cleanToken) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates single-use recovery codes (format: XXXX-XXXX).
   */
  static generateRecoveryCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }

  /**
   * Hashes a recovery code for secure database storage using SHA-256.
   */
  static hashRecoveryCode(code: string): string {
    const normalized = code
      .trim()
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}
