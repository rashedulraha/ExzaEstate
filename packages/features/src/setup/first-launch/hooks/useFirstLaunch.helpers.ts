import {
  getEnvApiBaseUrl,
  getEnvInitialLicenseKey,
  type DesktopLicensing,
  type User,
} from '@exzaestate/app-core';
import { http } from '@exzaestate/api-client';
import type { CreateLocalCompanyInput, CloudConfigInput } from '../schemas/first-launch.schema.js';

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

function resolveCompanyCode(code?: string, name?: string): string {
  const custom = code?.trim().toUpperCase();
  if (custom) return custom;
  const fallback = (name || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  if (!fallback) {
    throw new Error('Company code could not be determined');
  }
  return fallback;
}

function validateAdminFields(
  adminName?: string,
  adminEmail?: string,
  adminPassword?: string,
): void {
  if (!adminName) throw new Error('Administrator full name is required');
  if (!adminEmail) throw new Error('Administrator email is required');
  if (!adminPassword || adminPassword.length < 8) {
    throw new Error('Administrator password must be at least 8 characters');
  }
}

function resolveLicenseKey(licenseKey?: string): string {
  const key = licenseKey?.trim() || getEnvInitialLicenseKey();
  if (!key) throw new Error('Software purchase license key is required');
  return key;
}

export function parseCloudConfig(config: CloudConfigInput | string) {
  function getValidString(val?: string, fallback = ''): string {
    if (val && val.trim()) return val.trim();
    return fallback;
  }

  if (typeof config === 'string') {
    const baseUrl = getValidString(config, getEnvApiBaseUrl());
    if (!baseUrl) throw new Error('Server URL is required');
    return { baseUrl, companyName: '', licenseKey: getEnvInitialLicenseKey() };
  }
  const baseUrl = getValidString(config.baseUrl, getEnvApiBaseUrl());
  const companyName = getValidString(config.companyName);
  if (!baseUrl) throw new Error('Server URL is required');
  if (!companyName) throw new Error('Organization name is required');
  return {
    baseUrl,
    companyName,
    licenseKey: getValidString(config.licenseKey, getEnvInitialLicenseKey()),
  };
}

export function buildProvisionPayload(data: CreateLocalCompanyInput, machineId?: string) {
  const companyName = data.companyName?.trim();
  if (!companyName) {
    throw new Error('Organization legal name is required');
  }

  const code = resolveCompanyCode(data.companyCode, companyName);
  const adminName = data.adminName?.trim();
  const adminEmail = data.adminEmail?.trim().toLowerCase();
  validateAdminFields(adminName, adminEmail, data.adminPassword);
  const licenseKey = resolveLicenseKey(data.licenseKey);

  return {
    companyName,
    companyCode: code,
    tradeLicense: data.tradeLicense?.trim() || undefined,
    adminName,
    adminFullName: adminName,
    adminEmail,
    adminPassword: data.adminPassword,
    licenseKey,
    machineId: machineId || undefined,
    timezone: 'Asia/Dhaka',
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
  licensing: Pick<DesktopLicensing, 'saveStoredLicense'> | undefined,
  companyId?: string,
  machineId?: string,
) {
  if (!licensing) return;
  if (!companyId) {
    throw new Error('Cannot save offline license: company identifier is required');
  }

  await licensing.saveStoredLicense({
    signature: 'OFFLINE_PROVISIONED_STANDALONE',
    payload: {
      companyId,
      kid: 'exza-ed25519-v1',
      machineId: machineId || 'local-standalone',
      maxSeats: 50,
      plan: 'ENTERPRISE',
      validUntil: '2030-12-31T23:59:59.000Z',
    },
  });
}

export async function postProvisionRequest(
  payload: unknown,
  localSecret?: string,
): Promise<ProvisionResponse> {
  const headers = localSecret ? { 'X-Local-Secret': localSecret } : undefined;
  return http.post<ProvisionResponse>('/api/v1/local-data/provision', payload, { headers });
}
