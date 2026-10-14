import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { logger } from './common/logging/logger.js';
import { ConfigService } from './config/config.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  configureApp(app, configService);

  const port = configService.port;
  await app.listen(port);

  logger.info(
    {
      port,
      nodeEnv: configService.nodeEnv,
      runtimeMode: configService.runtimeMode,
    },
    `ExzaEstate Backend API started at http://localhost:${port}/api/v1`,
  );
}

void bootstrap();
