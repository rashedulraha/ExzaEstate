import { EventEmitter } from 'node:events';
import { Injectable } from '@nestjs/common';
import type { PubSub, UnsubscribeFn } from '../../ports/pub-sub.port.js';

@Injectable()
export class EventEmitterPubSub implements PubSub {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  async publish(channel: string, message: string): Promise<void> {
    this.emitter.emit(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<UnsubscribeFn> {
    this.emitter.on(channel, handler);
    return async () => {
      this.emitter.off(channel, handler);
    };
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}
