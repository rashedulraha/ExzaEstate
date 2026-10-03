import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LicenseController } from './license.controller.js';
import { LicenseService } from './license.service.js';
import { SystemLicenseController } from './system-license.controller.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [LicenseController, SystemLicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
