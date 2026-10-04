import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeOutboxListener } from './realtime-outbox.listener.js';
import { RealtimeReplayBuffer } from './realtime-replay-buffer.js';
import { RealtimeService } from './realtime.service.js';

@Module({
  imports: [AuthModule],
  controllers: [RealtimeController],
  providers: [RealtimeReplayBuffer, RealtimeService, RealtimeOutboxListener],
  exports: [RealtimeService, RealtimeReplayBuffer],
})
export class RealtimeModule {}
