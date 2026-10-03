import argon2 from 'argon2';
import { ValidationException } from '../../../common/exceptions/app.exception.js';

// Common breached or weak password list based on OWASP Top 100/NIST guidelines
const COMMON_BREACHED_PASSWORDS = new Set([
  'password123456',
  '123456789012',
  'administrator123',
  'qwertyuiop123',
  'qwertyuiop12345',
  'welcome123456',
  'iloveyou123456',
  'changeme123456',
  'letmein123456',
  'monkey1234567',
  'dragon1234567',
  'master1234567',
  'sunshine12345',
  'princess12345',
  'football12345',
  'shadow1234567',
  'superman12345',
  'trustno112345',
]);

/**
 * Enforces ExzaEstate password policy:
 * - Minimum 12 characters (RULE-AUTH)
 * - Not present in common / breached password lists
 */
export function validatePasswordPolicy(password: string): boolean {
  if (!password || password.length < 12) {
    throw new ValidationException(
      'Password must be at least 12 characters long in accordance with enterprise security policy',
    );
  }

  const normalized = password.toLowerCase().trim();
  if (COMMON_BREACHED_PASSWORDS.has(normalized)) {
    throw new ValidationException(
      'Password chosen is in a known list of common or breached passwords. Please choose a stronger passphrase.',
    );
  }

  return true;
}

/**
 * Hashes a password using Argon2id with OWASP-recommended parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  validatePasswordPolicy(password);

  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
