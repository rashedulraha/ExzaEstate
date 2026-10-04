import type { OpenExternalFn } from '@exzaestate/app-core';
import { open } from '@tauri-apps/plugin-shell';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const desktopOpenExternal: OpenExternalFn = async (url: string) => {
  if (isTauriEnvironment()) {
    await open(url);
    return;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
