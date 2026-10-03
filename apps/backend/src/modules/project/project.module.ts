import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CostCenterController } from './cost-center.controller.js';
import { CostCenterService } from './cost-center.service.js';
import { ProjectController } from './project.controller.js';
import { ProjectService } from './project.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [ProjectController, CostCenterController],
  providers: [ProjectService, CostCenterService],
  exports: [ProjectService, CostCenterService],
})
export class ProjectModule {}
