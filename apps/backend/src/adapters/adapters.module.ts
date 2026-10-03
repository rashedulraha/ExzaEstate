import { type DynamicModule, Global, Module, type Provider } from '@nestjs/common';
import {
  CACHE_STORE,
  CAPTCHA_VERIFIER,
  EMAIL_PROVIDER,
  OBJECT_STORAGE,
  PDF_RENDERER,
  PUB_SUB,
  QUEUE_DRIVER,
  SMS_PROVIDER,
} from '../ports/index.js';
import {
  BullMqQueueDriver,
  ChromiumPdfRenderer,
  RedisCacheStore,
  RedisPubSub,
  S3ObjectStorage,
  SmsStubProvider,
  SmtpEmailProvider,
  TurnstileCaptchaVerifier,
} from './cloud/index.js';
import {
  EventEmitterPubSub,
  FsObjectStorage,
  InMemoryCacheStore,
  InMemoryQueueDriver,
  LocalCaptchaVerifier,
  LocalEmailProvider,
  LocalPdfRenderer,
  LocalSmsProvider,
} from './local/index.js';

@Global()
@Module({})
export class AdaptersModule {
  static forRoot(mode: 'cloud' | 'local' = 'cloud'): DynamicModule {
    const isLocal = mode === 'local';

    const providers: Provider[] = isLocal
      ? [
          { provide: QUEUE_DRIVER, useClass: InMemoryQueueDriver },
          { provide: CACHE_STORE, useClass: InMemoryCacheStore },
          { provide: PUB_SUB, useClass: EventEmitterPubSub },
          { provide: OBJECT_STORAGE, useClass: FsObjectStorage },
          { provide: PDF_RENDERER, useClass: LocalPdfRenderer },
          { provide: SMS_PROVIDER, useClass: LocalSmsProvider },
          { provide: EMAIL_PROVIDER, useClass: LocalEmailProvider },
          { provide: CAPTCHA_VERIFIER, useClass: LocalCaptchaVerifier },
        ]
      : [
          { provide: QUEUE_DRIVER, useClass: BullMqQueueDriver },
          { provide: CACHE_STORE, useClass: RedisCacheStore },
          { provide: PUB_SUB, useClass: RedisPubSub },
          { provide: OBJECT_STORAGE, useClass: S3ObjectStorage },
          { provide: PDF_RENDERER, useClass: ChromiumPdfRenderer },
          { provide: SMS_PROVIDER, useClass: SmsStubProvider },
          { provide: EMAIL_PROVIDER, useClass: SmtpEmailProvider },
          { provide: CAPTCHA_VERIFIER, useClass: TurnstileCaptchaVerifier },
        ];

    return {
      module: AdaptersModule,
      global: true,
      providers,
      exports: [
        QUEUE_DRIVER,
        CACHE_STORE,
        PUB_SUB,
        OBJECT_STORAGE,
        PDF_RENDERER,
        SMS_PROVIDER,
        EMAIL_PROVIDER,
        CAPTCHA_VERIFIER,
      ],
    };
  }
}
