import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service.js';
import { IdempotencyService } from './idempotency/idempotency.service.js';
import { OutboxDispatcher } from './outbox/outbox.dispatcher.js';
import { OutboxService } from './outbox/outbox.service.js';
import { FieldCryptoService } from './security/field-crypto.service.js';
import { SecurityEventsService } from './security/security-events.service.js';
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
    FieldCryptoService,
    SecurityEventsService,
  ],
  exports: [
    AuditService,
    OutboxService,
    OutboxDispatcher,
    SequenceService,
    IdempotencyService,
    StorageService,
    FieldCryptoService,
    SecurityEventsService,
  ],
})
export class PlatformModule {}
