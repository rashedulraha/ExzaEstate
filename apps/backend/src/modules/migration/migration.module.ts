import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CsvMigrationController } from './csv/csv-migration.controller.js';
import { CsvMigrationService } from './csv/csv-migration.service.js';
import { MigrationController } from './migration.controller.js';
import { MigrationService } from './migration.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [MigrationController, CsvMigrationController],
  providers: [MigrationService, CsvMigrationService],
  exports: [MigrationService, CsvMigrationService],
})
export class MigrationModule {}
