import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service.js';
import { IdempotencyService } from './idempotency/idempotency.service.js';
import { OutboxDispatcher } from './outbox/outbox.dispatcher.js';
import { OutboxService } from './outbox/outbox.service.js';
import { SequenceService } from './sequence/sequence.service.js';
import { StorageService } from './storage/storage.service.js';

@Global()
@Module({
  providers: [
    AuditService,
    OutboxService,
    OutboxDispatcher,
    SequenceService,
    IdempotencyService,
    StorageService,
  ],
  exports: [
    AuditService,
    OutboxService,
    OutboxDispatcher,
    SequenceService,
    IdempotencyService,
    StorageService,
  ],
})
export class PlatformModule {}
