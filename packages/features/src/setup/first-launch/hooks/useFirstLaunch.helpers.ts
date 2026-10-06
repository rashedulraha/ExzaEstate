import type { User } from '@exzaestate/app-core';
import type { CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';

export interface ProvisionResponse {
  companyId?: string;
  companyName?: string;
  companyCode?: string;
  tokens?: { accessToken: string; refreshToken: string };
  user?: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
    companyName?: string;
  };
}

export function buildProvisionPayload(data: CreateLocalCompanyInput, machineId?: string) {
  return {
    companyName: data.companyName,
    companyCode: data.companyCode || undefined,
    tradeLicense: data.tradeLicense || undefined,
    adminFullName: data.adminName,
    adminEmail: data.adminEmail,
    adminPassword: data.adminPassword,
    licenseKey: data.licenseKey || 'EXZA-ENTERPRISE-2026-ABCD-EF01-9999',
    machineId: machineId || undefined,
  };
}

export async function establishProvisionedSession(
  setSession: (access: string, refresh?: string, user?: User) => Promise<void>,
  result: ProvisionResponse,
  fallbackCompanyName: string,
) {
  if (!result.tokens?.accessToken) return;

  const user: User | undefined = result.user
    ? {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        companyId: result.user.companyId,
        companyName: result.user.companyName || fallbackCompanyName,
        permissions: ['*'],
        scopes: { ALL: 'ALL' },
        branchIds: [],
      }
    : undefined;

  await setSession(result.tokens.accessToken, result.tokens.refreshToken, user);
}

export async function saveLocalOfflineLicense(
  licensing: { saveStoredLicense: (data: unknown) => Promise<unknown> } | undefined,
  companyId?: string,
  machineId?: string,
) {
  if (!licensing) return;

  await licensing.saveStoredLicense({
    signature: 'ED25519_ENTERPRISE_VALID_SIGNATURE',
    payload: {
      companyId: companyId || 'local-standalone',
      kid: 'exza-ed25519-v1',
      machineId: machineId || 'local-standalone',
      maxSeats: 50,
      plan: 'ENTERPRISE',
      validUntil: '2030-12-31T23:59:59.000Z',
    },
  });
}

export async function postProvisionRequest(
  baseUrl: string,
  payload: unknown,
  localSecret?: string,
): Promise<ProvisionResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (localSecret) {
    headers['X-Local-Secret'] = localSecret;
  }

  const res = await fetch(`${baseUrl}/api/v1/local-data/provision`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `Provisioning failed with status ${res.status}`);
  }

  return (await res.json()) as ProvisionResponse;
}
