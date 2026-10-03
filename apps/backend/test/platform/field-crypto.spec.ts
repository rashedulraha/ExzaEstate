import { describe, expect, it } from 'vitest';
import { FieldCryptoService } from '../../src/platform/security/field-crypto.service.js';

describe('S3: FieldCryptoService (Tier 1)', () => {
  const keys = {
    'key-2026-v1': '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'key-2026-v2': 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  };

  const service = new FieldCryptoService({
    defaultKeyId: 'key-2026-v1',
    keys,
  });

  const sensitiveNid = '19951234567890123';
  const tenantSalt = 'tenant-secret-salt-xyz';

  it('encrypts and decrypts with AES-256-GCM and stores keyId beside ciphertext', () => {
    const ciphertext = service.encrypt(sensitiveNid);

    expect(ciphertext).toMatch(/^enc:v1:key-2026-v1:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

    const decrypted = service.decrypt(ciphertext);
    expect(decrypted).toBe(sensitiveNid);
  });

  it('rotates ciphertext to a new key id without data loss', () => {
    const originalCiphertext = service.encrypt(sensitiveNid, 'key-2026-v1');
    expect(originalCiphertext).toContain(':key-2026-v1:');

    const rotatedCiphertext = service.rotate(originalCiphertext, 'key-2026-v2');
    expect(rotatedCiphertext).toContain(':key-2026-v2:');
    expect(rotatedCiphertext).not.toBe(originalCiphertext);

    const decrypted = service.decrypt(rotatedCiphertext);
    expect(decrypted).toBe(sensitiveNid);
  });

  it('generates deterministic HMAC-SHA256 blind index for equality lookup', () => {
    const blind1 = service.blindIndex(sensitiveNid, tenantSalt);
    const blind2 = service.blindIndex(sensitiveNid, tenantSalt);
    const differentBlind = service.blindIndex('98765432109876543', tenantSalt);
    const differentTenantBlind = service.blindIndex(sensitiveNid, 'another-tenant-salt');

    expect(blind1).toBe(blind2);
    expect(blind1).not.toBe(differentBlind);
    expect(blind1).not.toBe(differentTenantBlind);
    expect(blind1).toHaveLength(64); // SHA-256 hex length
  });
});
