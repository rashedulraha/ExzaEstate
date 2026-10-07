import type { FileDialog, OpenDialogOptions, SaveDialogOptions } from '@exzaestate/app-core';

export class WebFileDialog implements FileDialog {
  async open(options?: OpenDialogOptions): Promise<string | string[] | null> {
    if (typeof document === 'undefined') {
      return null;
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';

      if (options?.multiple) {
        input.multiple = true;
      }

      if (options?.filters && options.filters.length > 0) {
        const acceptList = options.filters.flatMap((f) =>
          f.extensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)),
        );
        input.accept = acceptList.join(',');
      }

      const handleChange = () => {
        cleanup();
        if (!input.files || input.files.length === 0) {
          resolve(null);
          return;
        }

        if (options?.multiple) {
          const names = Array.from(input.files).map((file) => file.name);
          resolve(names);
        } else {
          resolve(input.files[0]?.name ?? null);
        }
      };

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      const cleanup = () => {
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', handleCancel);
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      };

      input.addEventListener('change', handleChange, { once: true });
      input.addEventListener('cancel', handleCancel, { once: true });

      document.body.appendChild(input);
      input.click();
    });
  }

  async save(options?: SaveDialogOptions): Promise<string | null> {
    const filename = options?.defaultPath || 'download';
    return filename;
  }
}
