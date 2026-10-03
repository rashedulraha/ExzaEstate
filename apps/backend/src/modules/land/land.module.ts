import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LandController } from './land.controller.js';
import { LandService } from './land.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [LandController],
  providers: [LandService],
  exports: [LandService],
})
export class LandModule {}
