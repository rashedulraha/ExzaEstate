import type { PlatformAdapters, ApiConfig } from '@exzaestate/app-core';
import { DesktopKeychainSecureStorage } from './secure-storage.js';
import { DesktopFileDialog } from './file-dialog.js';
import { DesktopUpdater } from './updater.js';
import { desktopOpenExternal } from './open-external.js';
import { DesktopNotifier } from './notifier.js';
import { DesktopSidecarControl } from './sidecar.js';
import { DesktopLicensingService } from './license.js';

export const desktopApiConfig: ApiConfig = {
  baseUrl:
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
        ?.VITE_API_BASE_URL) ||
    'http://localhost:3000',
  runtimeMode: 'cloud',
  clientType: 'desktop',
  clientVersion: '0.1.0',
};

const secureStorage = new DesktopKeychainSecureStorage();

export const desktopPlatformAdapters: PlatformAdapters = {
  secureStorage,
  fileDialog: new DesktopFileDialog(),
  updater: new DesktopUpdater(),
  openExternal: desktopOpenExternal,
  notifier: new DesktopNotifier(),
  apiConfig: desktopApiConfig,
  sidecarControl: new DesktopSidecarControl(),
  licensing: new DesktopLicensingService(secureStorage),
};

export * from './secure-storage.js';
export * from './file-dialog.js';
export * from './updater.js';
export * from './open-external.js';
export * from './notifier.js';
export * from './sidecar.js';
export * from './license.js';
