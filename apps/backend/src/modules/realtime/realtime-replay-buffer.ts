import { Injectable } from '@nestjs/common';
import type { RealtimeEvent } from './realtime.types.js';

@Injectable()
export class RealtimeReplayBuffer {
  private readonly maxBufferSize = 100;
  // Key: companyId -> circular array of events
  private readonly companyBuffers = new Map<string, RealtimeEvent[]>();

  addEvent(event: RealtimeEvent): void {
    const list = this.companyBuffers.get(event.companyId) ?? [];
    list.push(event);
    if (list.length > this.maxBufferSize) {
      list.shift();
    }
    this.companyBuffers.set(event.companyId, list);
  }

  getEventsSince(
    companyId: string,
    userId: string,
    lastEventId?: string | null,
    userPermissions?: Set<string>,
  ): RealtimeEvent[] {
    const list = this.companyBuffers.get(companyId) ?? [];
    if (!lastEventId) {
      return [];
    }

    const index = list.findIndex((e) => e.id === lastEventId);
    // If not found in buffer (older than 100 events), we replay all buffer events or empty
    const candidates = index >= 0 ? list.slice(index + 1) : list;

    return candidates.filter((event) => {
      // Must match company
      if (event.companyId !== companyId) {
        return false;
      }
      // If user-targeted, must match user
      if (event.userId && event.userId !== userId) {
        return false;
      }
      // If permission-targeted, user must have that permission
      if (
        event.requiredPermission &&
        (!userPermissions || !userPermissions.has(event.requiredPermission))
      ) {
        return false;
      }
      return true;
    });
  }

  clear(companyId?: string): void {
    if (companyId) {
      this.companyBuffers.delete(companyId);
    } else {
      this.companyBuffers.clear();
    }
  }
}
