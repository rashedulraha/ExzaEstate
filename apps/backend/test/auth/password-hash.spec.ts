import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from '../../src/modules/auth/utils/password.util.js';

describe('S1: Password Hash & Policy (Argon2id)', () => {
  it('enforces minimum 12 characters', () => {
    expect(() => validatePasswordPolicy('Short1!')).toThrow(/at least 12 characters/i);
    expect(() => validatePasswordPolicy('12345678901')).toThrow(/at least 12 characters/i);
    expect(validatePasswordPolicy('StrongPass123!Safe')).toBe(true);
  });

  it('rejects common/breached passwords outright', () => {
    expect(() => validatePasswordPolicy('password123456')).toThrow(/common or breached/i);
    expect(() => validatePasswordPolicy('123456789012')).toThrow(/common or breached/i);
    expect(() => validatePasswordPolicy('administrator123')).toThrow(/common or breached/i);
    expect(() => validatePasswordPolicy('qwertyuiop12345')).toThrow(/common or breached/i);
  });

  it('hashes passwords using argon2id and verifies correctly', async () => {
    const rawPassword = 'Correct-Horse-Battery-Staple-2026!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toMatch(/^\$argon2id\$/);

    const isValid = await verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
  });
});
