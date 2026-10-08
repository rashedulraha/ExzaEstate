import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { PUB_SUB, type PubSub, type UnsubscribeFn } from '../../ports/index.js';
import {
  PERMISSION_RESOLVER,
  type PermissionResolver,
} from '../../common/guards/permissions.guard.js';
import { RealtimeReplayBuffer } from './realtime-replay-buffer.js';
import type { RealtimeClient, RealtimeEvent } from './realtime.types.js';

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly clients = new Map<string, RealtimeClient>();
  private readonly channelSubscriptions = new Map<string, UnsubscribeFn>();

  constructor(
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly replayBuffer: RealtimeReplayBuffer,
    @Optional()
    @Inject(PERMISSION_RESOLVER)
    private readonly permissionResolver?: PermissionResolver,
  ) {}

  async onModuleDestroy(): Promise<void> {
    for (const [channel, unsub] of this.channelSubscriptions.entries()) {
      try {
        await unsub();
      } catch (err) {
        this.logger.warn(`Error unsubscribing channel ${channel}: ${String(err)}`);
      }
    }
    this.channelSubscriptions.clear();
    this.clients.clear();
  }

  async publish(event: RealtimeEvent): Promise<void> {
    this.replayBuffer.addEvent(event);

    const channel = event.userId
      ? `rt:${event.companyId}:${event.userId}`
      : `rt:${event.companyId}`;

    const message = JSON.stringify(event);
    await this.pubSub.publish(channel, message);
  }

  private isEventDeliverable(client: RealtimeClient, event: RealtimeEvent): boolean {
    if (client.companyId !== event.companyId) {
      return false;
    }
    if (event.userId && event.userId !== client.userId) {
      return false;
    }
    if (event.requiredPermission && !client.permissions.has(event.requiredPermission)) {
      return false;
    }
    return true;
  }

  private handleIncomingMessage(channel: string, messageStr: string): void {
    try {
      const event = JSON.parse(messageStr) as RealtimeEvent;
      for (const client of this.clients.values()) {
        if (this.isEventDeliverable(client, event)) {
          client.send(event);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to parse realtime event on ${channel}: ${String(err)}`);
    }
  }

  private async ensureChannelSubscribed(channel: string): Promise<void> {
    if (this.channelSubscriptions.has(channel)) {
      return;
    }

    const unsub = await this.pubSub.subscribe(channel, (msg) => {
      this.handleIncomingMessage(channel, msg);
    });
    this.channelSubscriptions.set(channel, unsub);
  }

  async resolveUserPermissions(companyId: string, userId: string): Promise<Set<string>> {
    if (!this.permissionResolver) {
      return new Set();
    }
    try {
      const resolved = await this.permissionResolver.resolvePermissions(companyId, userId);
      return new Set(resolved.permissions);
    } catch {
      return new Set();
    }
  }

  async connectClient(client: RealtimeClient, lastEventId?: string | null): Promise<UnsubscribeFn> {
    this.clients.set(client.id, client);

    // Subscribe to company channel and direct user channel
    const companyChannel = `rt:${client.companyId}`;
    const userChannel = `rt:${client.companyId}:${client.userId}`;
    await this.ensureChannelSubscribed(companyChannel);
    await this.ensureChannelSubscribed(userChannel);

    // Replay buffer if lastEventId is provided
    if (lastEventId) {
      const replayed = this.replayBuffer.getEventsSince(
        client.companyId,
        client.userId,
        lastEventId,
        client.permissions,
      );
      for (const ev of replayed) {
        client.send(ev);
      }
    }

    return () => {
      this.clients.delete(client.id);
      return Promise.resolve();
    };
  }

  getConnectedClientCount(companyId?: string): number {
    if (!companyId) {
      return this.clients.size;
    }
    let count = 0;
    for (const c of this.clients.values()) {
      if (c.companyId === companyId) count++;
    }
    return count;
  }
}
