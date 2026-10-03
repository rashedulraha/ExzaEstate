import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NumberingController } from './numbering.controller.js';
import { NumberingService } from './numbering.service.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SetupChecklistController } from './setup-checklist.controller.js';
import { SetupChecklistService } from './setup-checklist.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [SettingsController, NumberingController, SetupChecklistController],
  providers: [SettingsService, NumberingService, SetupChecklistService],
  exports: [SettingsService, NumberingService, SetupChecklistService],
})
export class SettingsModule {}
