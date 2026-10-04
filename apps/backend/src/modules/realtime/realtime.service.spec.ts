import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PubSub, UnsubscribeFn } from '../../ports/index.js';
import type { PermissionResolver } from '../../common/guards/permissions.guard.js';
import { RealtimeReplayBuffer } from './realtime-replay-buffer.js';
import { RealtimeService } from './realtime.service.js';
import type { RealtimeClient, RealtimeEvent } from './realtime.types.js';

class MockPubSub implements PubSub {
  private readonly listeners = new Map<string, Set<(message: string) => void>>();

  async publish(channel: string, message: string): Promise<void> {
    const set = this.listeners.get(channel);
    if (set) {
      for (const listener of set) {
        listener(message);
      }
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<UnsubscribeFn> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    const set = this.listeners.get(channel)!;
    set.add(handler);
    return () => {
      set.delete(handler);
      return Promise.resolve();
    };
  }

  async close(): Promise<void> {
    this.listeners.clear();
  }
}

describe('Realtime SSE Stream & PubSub Fan-Out (A9.1)', () => {
  let pubSub: MockPubSub;
  let replayBuffer: RealtimeReplayBuffer;
  let service: RealtimeService;
  let mockPermissionResolver: PermissionResolver;

  const companyA = '00000000-0000-0000-0000-000000000001';
  const companyB = '00000000-0000-0000-0000-000000000002';
  const userA1 = '00000000-0000-0000-0000-000000000011';
  const userA2 = '00000000-0000-0000-0000-000000000012';
  const userB1 = '00000000-0000-0000-0000-000000000021';

  beforeEach(() => {
    pubSub = new MockPubSub();
    replayBuffer = new RealtimeReplayBuffer();
    mockPermissionResolver = {
      resolvePermissions: vi.fn().mockResolvedValue({
        permissions: ['REPORT_VIEW', 'BOOKING_VIEW'],
        scopes: {},
        branchIds: [],
        defaultBranchId: null,
        teamUserIds: [],
        isTwoFactorEnabled: false,
        status: 'Active',
      }),
    };

    service = new RealtimeService(pubSub, replayBuffer, mockPermissionResolver);
  });

  const createMockClient = (
    id: string,
    companyId: string,
    userId: string,
    permissions: string[] = [],
  ): { client: RealtimeClient; received: RealtimeEvent[]; comments: string[] } => {
    const received: RealtimeEvent[] = [];
    const comments: string[] = [];

    const client: RealtimeClient = {
      id,
      companyId,
      userId,
      permissions: new Set(permissions),
      send: (ev: RealtimeEvent) => received.push(ev),
      sendComment: (c: string) => comments.push(c),
      close: vi.fn(),
    };

    return { client, received, comments };
  };

  it('S1 & Acceptance: isolates events by company — Company B never receives Company A events', async () => {
    const clientA = createMockClient('c-a1', companyA, userA1, ['BOOKING_VIEW']);
    const clientB = createMockClient('c-b1', companyB, userB1, ['BOOKING_VIEW']);

    await service.connectClient(clientA.client);
    await service.connectClient(clientB.client);

    const eventA: RealtimeEvent = {
      id: 'ev-1',
      eventName: 'booking.confirmed',
      companyId: companyA,
      payload: { bookingId: 'bkg-100', amount: '50000000' },
      timestamp: new Date().toISOString(),
    };

    await service.publish(eventA);

    expect(clientA.received).toHaveLength(1);
    expect(clientA.received[0]?.id).toBe('ev-1');
    expect(clientB.received).toHaveLength(0); // Strict cross-tenant isolation
  });

  it('S2: filters events by target userId when direct message is emitted', async () => {
    const clientA1 = createMockClient('c-a1', companyA, userA1);
    const clientA2 = createMockClient('c-a2', companyA, userA2);

    await service.connectClient(clientA1.client);
    await service.connectClient(clientA2.client);

    const targetedEvent: RealtimeEvent = {
      id: 'ev-user-target',
      eventName: 'notification.received',
      companyId: companyA,
      userId: userA1,
      payload: { message: 'Your commission was approved' },
      timestamp: new Date().toISOString(),
    };

    await service.publish(targetedEvent);

    expect(clientA1.received).toHaveLength(1);
    expect(clientA1.received[0]?.id).toBe('ev-user-target');
    expect(clientA2.received).toHaveLength(0); // Not targeted to A2
  });

  it('S2: filters events by requiredPermission — clients lacking permission do not receive event', async () => {
    const adminClient = createMockClient('c-admin', companyA, userA1, ['REPORT_VIEW', 'EXPENSE_APPROVE']);
    const execClient = createMockClient('c-exec', companyA, userA2, ['LEAD_VIEW']);

    await service.connectClient(adminClient.client);
    await service.connectClient(execClient.client);

    const restrictedEvent: RealtimeEvent = {
      id: 'ev-expense-alert',
      eventName: 'budget.threshold_reached',
      companyId: companyA,
      requiredPermission: 'EXPENSE_APPROVE',
      payload: { threshold: 85, level: 'WARNING' },
      timestamp: new Date().toISOString(),
    };

    await service.publish(restrictedEvent);

    expect(adminClient.received).toHaveLength(1);
    expect(execClient.received).toHaveLength(0); // Lacks EXPENSE_APPROVE
  });

  it('S3: replays missed events since Last-Event-ID upon client reconnect', async () => {
    // Populate replay buffer with 3 events
    const ev1: RealtimeEvent = {
      id: 'ev-1',
      eventName: 'event.one',
      companyId: companyA,
      payload: { seq: 1 },
      timestamp: new Date().toISOString(),
    };
    const ev2: RealtimeEvent = {
      id: 'ev-2',
      eventName: 'event.two',
      companyId: companyA,
      payload: { seq: 2 },
      timestamp: new Date().toISOString(),
    };
    const ev3: RealtimeEvent = {
      id: 'ev-3',
      eventName: 'event.three',
      companyId: companyA,
      payload: { seq: 3 },
      timestamp: new Date().toISOString(),
    };

    await service.publish(ev1);
    await service.publish(ev2);
    await service.publish(ev3);

    // Client reconnects sending lastEventId = 'ev-1'
    const reconnectingClient = createMockClient('c-reconnect', companyA, userA1);
    await service.connectClient(reconnectingClient.client, 'ev-1');

    // Should receive ev-2 and ev-3
    expect(reconnectingClient.received).toHaveLength(2);
    expect(reconnectingClient.received[0]?.id).toBe('ev-2');
    expect(reconnectingClient.received[1]?.id).toBe('ev-3');
  });

  it('handles client disconnect and stops delivering events after unsubscribe', async () => {
    const client = createMockClient('c-temp', companyA, userA1);
    const unsub = await service.connectClient(client.client);

    expect(service.getConnectedClientCount(companyA)).toBe(1);

    await unsub();
    expect(service.getConnectedClientCount(companyA)).toBe(0);

    await service.publish({
      id: 'ev-after-close',
      eventName: 'test.event',
      companyId: companyA,
      payload: {},
      timestamp: new Date().toISOString(),
    });

    expect(client.received).toHaveLength(0);
  });
});
