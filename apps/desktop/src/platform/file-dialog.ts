import type { FileDialog, OpenDialogOptions, SaveDialogOptions } from '@exzaestate/app-core';
import { open, save } from '@tauri-apps/plugin-dialog';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class DesktopFileDialog implements FileDialog {
  async open(options?: OpenDialogOptions): Promise<string | string[] | null> {
    if (isTauriEnvironment()) {
      return open({
        title: options?.title,
        multiple: options?.multiple,
        directory: options?.directory,
        filters: options?.filters,
        defaultPath: options?.defaultPath,
      });
    }
    return null;
  }

  async save(options?: SaveDialogOptions): Promise<string | null> {
    if (isTauriEnvironment()) {
      return save({
        title: options?.title,
        filters: options?.filters,
        defaultPath: options?.defaultPath,
      });
    }
    return null;
  }
}
