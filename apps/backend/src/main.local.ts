import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { LocalSecretGuard } from './common/guards/local-secret.guard.js';
import { logger } from './common/logging/logger.js';
import { ConfigService } from './config/config.service.js';
import { LocalProvisioningService } from './modules/local-data/local-provisioning.service.js';
import { OutboxDispatcher } from './platform/outbox/outbox.dispatcher.js';

export async function bootstrapLocal(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  configureApp(app, configService);

  // Register Local API Security Guard (Task A10.2)
  app.useGlobalGuards(new LocalSecretGuard(configService));

  // Restrict CORS strictly to Tauri loopback origins
  app.enableCors({
    origin: [
      'tauri://localhost',
      'http://localhost:1420',
      'https://tauri.localhost',
      /^tauri:\/\//,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Local-Secret',
      'Idempotency-Key',
      'X-Request-Id',
      'X-Client-Version',
    ],
  });

  // Start in-process outbox worker (Task A10.1 S2)
  const dispatcher = app.get(OutboxDispatcher);
  dispatcher.start();

  // Run first-launch provisioning if no company exists (Task A10.1 S3)
  const provisioningService = app.get(LocalProvisioningService);
  try {
    const provResult = await provisioningService.provisionLocalStandalone();
    if (provResult.provisioned) {
      logger.info(
        { companyId: provResult.companyId, adminUserId: provResult.adminUserId },
        'Local Standalone initial provisioning completed successfully',
      );
    }
  } catch (provErr) {
    logger.error({ err: provErr }, 'Error during local standalone first-launch provisioning');
  }

  // Bind strictly to loopback 127.0.0.1 (Task A10.2 S1)
  const port = configService.port || 14201;
  await app.listen(port, '127.0.0.1');

  logger.info(
    {
      port,
      bindAddress: '127.0.0.1',
      runtimeMode: 'local',
      worker: 'in-process',
    },
    `ExzaEstate Local Standalone Sidecar started at http://127.0.0.1:${port}/api/v1`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, `Local sidecar received ${signal}, shutting down gracefully...`);
    try {
      await dispatcher.close();
      await app.close();
      logger.info('Local sidecar shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during local sidecar shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrapLocal();
}
