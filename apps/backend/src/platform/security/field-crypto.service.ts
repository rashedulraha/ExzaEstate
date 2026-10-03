import crypto from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';

export interface FieldCryptoOptions {
  defaultKeyId?: string;
  keys?: Record<string, string>; // keyId -> 32-byte hex/base64 key
}

@Injectable()
export class FieldCryptoService {
  private defaultKeyId: string;
  private readonly keys = new Map<string, Buffer>();

  private readonly configService?: ConfigService;

  constructor(
    @Optional() configServiceOrOptions?: ConfigService | FieldCryptoOptions,
    @Optional() options?: FieldCryptoOptions,
  ) {
    const isOptions =
      configServiceOrOptions &&
      ('keys' in configServiceOrOptions || 'defaultKeyId' in configServiceOrOptions);
    const opts = isOptions ? (configServiceOrOptions as FieldCryptoOptions) : options;
    this.configService = isOptions
      ? undefined
      : (configServiceOrOptions as ConfigService | undefined);

    this.defaultKeyId = opts?.defaultKeyId ?? 'key-2026-v1';
    this.initKeys(opts);
  }

  private initKeys(opts?: FieldCryptoOptions): void {
    if (opts?.keys) {
      for (const [keyId, keyVal] of Object.entries(opts.keys)) {
        this.registerKey(keyId, keyVal);
      }
      return;
    }

    this.loadEnvKeys();
    if (this.keys.size === 0) {
      this.loadFallbackKey();
    }
  }

  private loadEnvKeys(): void {
    const envKeys = process.env.FIELD_ENCRYPTION_KEYS;
    if (!envKeys) return;
    try {
      const parsed = JSON.parse(envKeys) as Record<string, string>;
      for (const [keyId, keyVal] of Object.entries(parsed)) {
        this.registerKey(keyId, keyVal);
      }
    } catch {
      // ignore parsing error
    }
  }

  private loadFallbackKey(): void {
    const defaultSecret =
      this.configService?.jwt?.accessSecret ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const keyBuffer = crypto.createHash('sha256').update(defaultSecret).digest();
    this.keys.set(this.defaultKeyId, keyBuffer);
  }

  private registerKey(keyId: string, keyVal: string): void {
    let buf: Buffer;
    if (keyVal.length === 64 && /^[0-9a-fA-F]+$/.test(keyVal)) {
      buf = Buffer.from(keyVal, 'hex');
    } else if (keyVal.length === 44 && keyVal.endsWith('=')) {
      buf = Buffer.from(keyVal, 'base64');
    } else {
      buf = crypto.createHash('sha256').update(keyVal).digest();
    }
    this.keys.set(keyId, buf);
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Format: enc:v1:<keyId>:<ivHex>:<tagHex>:<ciphertextHex>
   */
  encrypt(plaintext: string, keyId: string = this.defaultKeyId): string {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key '${keyId}' not found`);
    }

    const iv = crypto.randomBytes(12); // 96-bit IV standard for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `enc:v1:${keyId}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts ciphertext in format enc:v1:<keyId>:<ivHex>:<tagHex>:<ciphertextHex>.
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext.startsWith('enc:v1:')) {
      throw new Error('Invalid ciphertext format: missing enc:v1 header');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 6) {
      throw new Error('Malformed ciphertext structure');
    }

    const keyId = parts[2]!;
    const iv = Buffer.from(parts[3]!, 'hex');
    const tag = Buffer.from(parts[4]!, 'hex');
    const encrypted = Buffer.from(parts[5]!, 'hex');

    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Decryption key '${keyId}' not found`);
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Rotates ciphertext to a new key id without data loss.
   */
  rotate(ciphertext: string, newKeyId: string): string {
    const plaintext = this.decrypt(ciphertext);
    return this.encrypt(plaintext, newKeyId);
  }

  /**
   * Computes deterministic HMAC-SHA256 blind index for equality lookup.
   * Encrypted columns must never be searched with LIKE; lookups query the blind index.
   */
  blindIndex(plaintext: string, tenantSalt: string): string {
    return crypto.createHmac('sha256', tenantSalt).update(plaintext.trim()).digest('hex');
  }
}
