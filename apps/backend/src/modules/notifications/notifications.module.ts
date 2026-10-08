import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationDeliveryService } from './delivery/notification-delivery.service.js';
import { NotificationDeliveryWorker } from './delivery/notification-delivery.worker.js';
import { NotificationOutboxListener } from './notification-outbox.listener.js';
import { NotificationService } from './notification.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    NotificationOutboxListener,
    NotificationDeliveryService,
    NotificationDeliveryWorker,
  ],
  exports: [NotificationService, NotificationDeliveryService, NotificationDeliveryWorker],
})
export class NotificationsModule {}
