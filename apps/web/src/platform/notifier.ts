import type { Notifier, NotificationOptions } from '@exzaestate/app-core';

export class WebNotifier implements Notifier {
  async send(options: NotificationOptions): Promise<void> {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon ?? '/favicon.png',
      });
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
