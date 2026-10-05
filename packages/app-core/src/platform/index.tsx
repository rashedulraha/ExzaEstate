import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface FileDialogFilter {
  name: string;
  extensions: string[];
}

export interface OpenDialogOptions {
  title?: string;
  multiple?: boolean;
  directory?: boolean;
  filters?: FileDialogFilter[];
  defaultPath?: string;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileDialogFilter[];
}

export interface FileDialog {
  open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  save(options?: SaveDialogOptions): Promise<string | null>;
}

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export interface Updater {
  check(): Promise<UpdateInfo | null>;
  install(): Promise<void>;
  onStatusChange?(callback: (status: string) => void): () => void;
}

export type OpenExternalFn = (url: string) => Promise<void>;

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
}

export interface Notifier {
  send(options: NotificationOptions): Promise<void>;
  requestPermission(): Promise<boolean>;
}

export interface ApiConfig {
  baseUrl: string;
  runtimeMode: 'cloud' | 'local';
  localSecret?: string;
  clientType: 'web' | 'desktop';
  clientVersion: string;
}

export interface SidecarStatus {
  running: boolean;
  port?: number;
  error?: string;
}

export interface SidecarControl {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getStatus(): Promise<SidecarStatus>;
}

export interface MachineFingerprint {
  machineId: string;
  motherboardUuid: string;
  cpuSerial: string;
  diskSerial: string;
}

export interface StoredLicensePayload {
  companyId: string;
  kid: string;
  machineId: string | null;
  maxSeats: number;
  plan: string;
  validUntil: string;
}

export interface StoredLicenseRecord {
  payload: StoredLicensePayload;
  signature: string;
}

export interface LicenseVerificationOutcome {
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'CLOCK_TAMPERED' | 'INVALID';
  isWriteLocked: boolean;
  canExport: boolean;
  plan: string;
  maxSeats: number;
  validUntil: string;
  machineId?: string | null;
  message?: string;
  daysRemaining?: number;
}

export interface DesktopLicensing {
  getMachineFingerprint(): Promise<MachineFingerprint>;
  getStoredLicense(): Promise<StoredLicenseRecord | null>;
  saveStoredLicense(license: StoredLicenseRecord): Promise<void>;
  removeStoredLicense(): Promise<void>;
  verifyOfflineLicense(
    payload: StoredLicensePayload,
    signature: string,
  ): Promise<LicenseVerificationOutcome>;
  generateRenewalRequestCode(companyId: string, plan: string): Promise<string>;
  checkClockIntegrity(): Promise<{ isTampered: boolean; message?: string }>;
}

export interface PlatformAdapters {
  secureStorage: SecureStorage;
  fileDialog: FileDialog;
  updater: Updater;
  openExternal: OpenExternalFn;
  notifier: Notifier;
  apiConfig: ApiConfig;
  sidecarControl?: SidecarControl;
  licensing?: DesktopLicensing;
}

/**
 * In-memory fallback secure storage (used for tests or when no keychain is provided).
 */
export class InMemorySecureStorage implements SecureStorage {
  private readonly store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * No-op file dialog for fallback/testing.
 */
export class FallbackFileDialog implements FileDialog {
  async open(_options?: OpenDialogOptions): Promise<string | string[] | null> {
    return null;
  }

  async save(_options?: SaveDialogOptions): Promise<string | null> {
    return null;
  }
}

/**
 * No-op updater for fallback/testing.
 */
export class FallbackUpdater implements Updater {
  async check(): Promise<UpdateInfo | null> {
    return null;
  }

  async install(): Promise<void> {
    // no-op
  }
}

/**
 * Fallback notifier.
 */
export class FallbackNotifier implements Notifier {
  async send(options: NotificationOptions): Promise<void> {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(options.title, { body: options.body, icon: options.icon });
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return false;
  }
}

export const defaultOpenExternal: OpenExternalFn = async (url: string) => {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const defaultApiConfig: ApiConfig = {
  baseUrl: 'http://localhost:3000',
  runtimeMode: 'cloud',
  clientType: 'desktop',
  clientVersion: '0.1.0',
};

export class InMemoryDesktopLicensing implements DesktopLicensing {
  private license: StoredLicenseRecord | null = null;
  private readonly defaultHardware: MachineFingerprint = {
    machineId: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c5e3d1f9a7b5c3d1e9f7a5b3c1d9e7f5a',
    motherboardUuid: 'MB-SYS-DEFAULT-001',
    cpuSerial: 'CPU-GEN-DEFAULT-001',
    diskSerial: 'DISK-PRIMARY-DEFAULT-001',
  };

  async getMachineFingerprint(): Promise<MachineFingerprint> {
    return this.defaultHardware;
  }

  async getStoredLicense(): Promise<StoredLicenseRecord | null> {
    return this.license;
  }

  async saveStoredLicense(license: StoredLicenseRecord): Promise<void> {
    this.license = license;
  }

  async removeStoredLicense(): Promise<void> {
    this.license = null;
  }

  async verifyOfflineLicense(
    payload: StoredLicensePayload,
    signature: string,
  ): Promise<LicenseVerificationOutcome> {
    if (signature === 'INVALID_SIGNATURE' || payload.validUntil === 'INVALID') {
      return {
        status: 'INVALID',
        isWriteLocked: true,
        canExport: true,
        plan: payload.plan,
        maxSeats: payload.maxSeats,
        validUntil: payload.validUntil,
        machineId: payload.machineId,
        message: 'Cryptographic signature mismatch or corrupted license',
      };
    }

    if (payload.machineId && payload.machineId !== this.defaultHardware.machineId) {
      return {
        status: 'INVALID',
        isWriteLocked: true,
        canExport: true,
        plan: payload.plan,
        maxSeats: payload.maxSeats,
        validUntil: payload.validUntil,
        machineId: payload.machineId,
        message: 'Hardware binding mismatch: license is bound to another machine',
      };
    }

    const expiryTime = new Date(payload.validUntil).getTime();
    const now = Date.now();
    const gracePeriodMs = 7 * 86400 * 1000;

    if (now <= expiryTime) {
      return {
        status: 'ACTIVE',
        isWriteLocked: false,
        canExport: true,
        plan: payload.plan,
        maxSeats: payload.maxSeats,
        validUntil: payload.validUntil,
        machineId: payload.machineId,
      };
    }

    if (now <= expiryTime + gracePeriodMs) {
      const remainingMs = expiryTime + gracePeriodMs - now;
      const daysRemaining = Math.max(1, Math.ceil(remainingMs / (86400 * 1000)));
      return {
        status: 'GRACE',
        isWriteLocked: false,
        canExport: true,
        plan: payload.plan,
        maxSeats: payload.maxSeats,
        validUntil: payload.validUntil,
        machineId: payload.machineId,
        daysRemaining,
      };
    }

    return {
      status: 'EXPIRED',
      isWriteLocked: true,
      canExport: true,
      plan: payload.plan,
      maxSeats: payload.maxSeats,
      validUntil: payload.validUntil,
      machineId: payload.machineId,
      message: 'License has expired. Write operations are locked. Data export is available.',
    };
  }

  async generateRenewalRequestCode(companyId: string, plan: string): Promise<string> {
    const mShort = this.defaultHardware.machineId
      .replace(/[^a-zA-Z0-9]/g, '')
      .padEnd(8, '0')
      .slice(0, 8)
      .toUpperCase();
    const cShort = companyId
      .replace(/[^a-zA-Z0-9]/g, '')
      .padEnd(8, '0')
      .slice(0, 8)
      .toUpperCase();
    return `EXZA-REQ-${mShort}-${cShort}-${plan.toUpperCase()}-B10RNW`;
  }

  async checkClockIntegrity(): Promise<{ isTampered: boolean; message?: string }> {
    return { isTampered: false };
  }
}

export const defaultPlatformAdapters: PlatformAdapters = {
  secureStorage: new InMemorySecureStorage(),
  fileDialog: new FallbackFileDialog(),
  updater: new FallbackUpdater(),
  openExternal: defaultOpenExternal,
  notifier: new FallbackNotifier(),
  apiConfig: defaultApiConfig,
  licensing: new InMemoryDesktopLicensing(),
};

const PlatformContext = createContext<PlatformAdapters>(defaultPlatformAdapters);

export interface PlatformProviderProps {
  adapters: PlatformAdapters;
  children: ReactNode;
}

export function PlatformProvider({ adapters, children }: PlatformProviderProps) {
  const value = useMemo(() => adapters, [adapters]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformAdapters {
  return useContext(PlatformContext);
}
