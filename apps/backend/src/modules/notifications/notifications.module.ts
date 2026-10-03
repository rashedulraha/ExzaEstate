import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationOutboxListener } from './notification-outbox.listener.js';
import { NotificationService } from './notification.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationService, NotificationOutboxListener],
  exports: [NotificationService],
})
export class NotificationsModule {}
