import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../../config/config.service.js';
import type { PubSub, UnsubscribeFn } from '../../ports/pub-sub.port.js';

@Injectable()
export class RedisPubSub implements PubSub {
  private readonly pubClient: Redis;
  private readonly subClient: Redis;
  private readonly channelHandlers = new Map<string, Set<(msg: string) => void>>();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get('REDIS_URL');
    this.pubClient = new Redis(url, { maxRetriesPerRequest: null });
    this.subClient = new Redis(url, { maxRetriesPerRequest: null });

    this.subClient.on('message', (channel, message) => {
      const handlers = this.channelHandlers.get(channel);
      if (handlers) {
        for (const handler of handlers) {
          handler(message);
        }
      }
    });
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.pubClient.publish(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<UnsubscribeFn> {
    let handlers = this.channelHandlers.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.channelHandlers.set(channel, handlers);
      await this.subClient.subscribe(channel);
    }
    handlers.add(handler);

    return async () => {
      const set = this.channelHandlers.get(channel);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.channelHandlers.delete(channel);
          await this.subClient.unsubscribe(channel);
        }
      }
    };
  }

  async close(): Promise<void> {
    await Promise.all([this.pubClient.quit(), this.subClient.quit()]);
  }
}
