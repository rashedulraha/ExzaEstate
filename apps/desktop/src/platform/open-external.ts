import type { OpenExternalFn } from '@exzaestate/app-core';
import { open } from '@tauri-apps/plugin-shell';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function isValidHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const desktopOpenExternal: OpenExternalFn = async (url: string) => {
  if (!isValidHttpsUrl(url)) {
    console.warn(`Blocked openExternal request to non-HTTPS URL: ${url}`);
    throw new Error('SECURITY_VIOLATION: openExternal only permits secure HTTPS destinations.');
  }

  if (isTauriEnvironment()) {
    await open(url);
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
