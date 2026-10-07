import { type PlatformAdapters, type ApiConfig, getEnvApiBaseUrl } from '@exzaestate/app-core';
import { WebSecureStorage } from './secure-storage.js';
import { WebFileDialog } from './file-dialog.js';
import { WebUpdater } from './updater.js';
import { webOpenExternal } from './open-external.js';
import { WebNotifier } from './notifier.js';

function getDefaultBaseUrl(): string {
  return getEnvApiBaseUrl();
}

export const webApiConfig: ApiConfig = {
  baseUrl: getDefaultBaseUrl(),
  runtimeMode: 'cloud',
  clientType: 'web',
  clientVersion: '0.1.0',
};

const secureStorage = new WebSecureStorage();

export const webPlatformAdapters: PlatformAdapters = {
  secureStorage,
  fileDialog: new WebFileDialog(),
  updater: new WebUpdater(),
  openExternal: webOpenExternal,
  notifier: new WebNotifier(),
  apiConfig: webApiConfig,
};

export * from './secure-storage.js';
export * from './file-dialog.js';
export * from './updater.js';
export * from './open-external.js';
export * from './notifier.js';
