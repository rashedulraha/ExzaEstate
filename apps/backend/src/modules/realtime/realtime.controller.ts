import { Controller, Get, Headers, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PERMISSIONS } from '@exzaestate/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RealtimeService } from './realtime.service.js';
import type { RealtimeClient, RealtimeEvent } from './realtime.types.js';

@ApiTags('Realtime Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('events')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get('stream')
  @RequirePermission(PERMISSIONS.NOTIFICATION_VIEW)
  @ApiOperation({
    summary: 'Real-time Server-Sent Events (SSE) stream for tenant-scoped updates',
  })
  @ApiResponse({
    status: 200,
    description: 'Continuous text/event-stream connection with 25s heartbeats',
  })
  async stream(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('last-event-id') lastEventIdHeader?: string,
    @Query('lastEventId') lastEventIdQuery?: string,
  ): Promise<void> {
    const lastEventId = lastEventIdHeader ?? lastEventIdQuery ?? null;

    // Set SSE headers per architecture.md §8.4
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const clientId = `${user.companyId}:${user.userId}:${crypto.randomUUID()}`;
    const permissions = await this.realtimeService.resolveUserPermissions(
      user.companyId,
      user.userId,
    );

    const client: RealtimeClient = {
      id: clientId,
      companyId: user.companyId,
      userId: user.userId,
      permissions,
      send: (event: RealtimeEvent) => {
        res.write(`id: ${event.id}\n`);
        res.write(`event: ${event.eventName}\n`);
        res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
      },
      sendComment: (comment: string) => {
        res.write(`: ${comment}\n\n`);
      },
      close: () => {
        res.end();
      },
    };

    // Connect client and replay any missed events
    const unsub = await this.realtimeService.connectClient(client, lastEventId);

    // Heartbeat comment every 25 seconds per architecture.md §8.4
    const heartbeatTimer = setInterval(() => {
      client.sendComment('heartbeat');
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      void unsub();
    });
  }
}
