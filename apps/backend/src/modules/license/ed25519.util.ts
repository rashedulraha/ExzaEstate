import crypto from 'node:crypto';

export interface LicensePayload {
  companyId: string;
  kid: string;
  machineId: string | null;
  maxSeats: number;
  plan: string;
  validUntil: string;
}

// In-memory key store for development/test environment; in production loaded from secret reference / KMS
let cachedKeyPair: { publicKey: string; privateKey: string } | null = null;

export const DEFAULT_KID = 'exza-ed25519-v1';

export function getEd25519KeyPair(): { publicKey: string; privateKey: string } {
  if (!cachedKeyPair) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    cachedKeyPair = { publicKey, privateKey };
  }
  return cachedKeyPair;
}

export function serializeCanonicalPayload(payload: LicensePayload): string {
  return JSON.stringify({
    company_id: payload.companyId,
    kid: payload.kid,
    machine_id: payload.machineId,
    max_seats: payload.maxSeats,
    plan: payload.plan,
    valid_until: payload.validUntil,
  });
}

export function signLicensePayload(payload: LicensePayload): { signature: string; kid: string } {
  const { privateKey } = getEd25519KeyPair();
  const canonicalData = serializeCanonicalPayload(payload);
  const sign = crypto.sign(null, Buffer.from(canonicalData, 'utf-8'), privateKey);
  return {
    signature: sign.toString('base64url'),
    kid: DEFAULT_KID,
  };
}

export function verifyLicenseSignature(payload: LicensePayload, signature: string): boolean {
  try {
    const { publicKey } = getEd25519KeyPair();
    const canonicalData = serializeCanonicalPayload(payload);
    return crypto.verify(
      null,
      Buffer.from(canonicalData, 'utf-8'),
      publicKey,
      Buffer.from(signature, 'base64url'),
    );
  } catch {
    return false;
  }
}
