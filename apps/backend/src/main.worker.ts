import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { AdaptersModule } from './adapters/adapters.module.js';
import { logger } from './common/logging/logger.js';
import { ConfigModule } from './config/config.module.js';
import { ConfigService } from './config/config.service.js';
import { DatabaseModule } from './database/database.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { OutboxDispatcher } from './platform/outbox/outbox.dispatcher.js';
import { PlatformModule } from './platform/platform.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: false },
    }),
    DatabaseModule,
    PlatformModule,
    AdaptersModule.forRoot((process.env.RUNTIME_MODE as 'cloud' | 'local') || 'cloud'),
    JobsModule,
  ],
})
export class WorkerAppModule {}

export async function bootstrapWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const dispatcher = app.get(OutboxDispatcher);

  dispatcher.start();

  logger.info(
    {
      nodeEnv: configService.nodeEnv,
      runtimeMode: configService.runtimeMode,
    },
    'ExzaEstate Worker process started with OutboxDispatcher',
  );

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, `Worker received ${signal}, shutting down gracefully...`);
    try {
      await dispatcher.close();
      await app.close();
      logger.info('Worker shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during worker shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrapWorker();
}
