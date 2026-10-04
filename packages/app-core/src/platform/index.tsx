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

export interface PlatformAdapters {
  secureStorage: SecureStorage;
  fileDialog: FileDialog;
  updater: Updater;
  openExternal: OpenExternalFn;
  notifier: Notifier;
  apiConfig: ApiConfig;
  sidecarControl?: SidecarControl;
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

export const defaultPlatformAdapters: PlatformAdapters = {
  secureStorage: new InMemorySecureStorage(),
  fileDialog: new FallbackFileDialog(),
  updater: new FallbackUpdater(),
  openExternal: defaultOpenExternal,
  notifier: new FallbackNotifier(),
  apiConfig: defaultApiConfig,
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
