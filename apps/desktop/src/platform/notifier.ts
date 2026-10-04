import type { Notifier, NotificationOptions } from '@exzaestate/app-core';
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class DesktopNotifier implements Notifier {
  async send(options: NotificationOptions): Promise<void> {
    if (isTauriEnvironment()) {
      const granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        if (permission !== 'granted') {
          return;
        }
      }
      sendNotification({
        title: options.title,
        body: options.body,
      });
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(options.title, { body: options.body, icon: options.icon });
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if (isTauriEnvironment()) {
      const permission = await requestPermission();
      return permission === 'granted';
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return false;
  }
}
