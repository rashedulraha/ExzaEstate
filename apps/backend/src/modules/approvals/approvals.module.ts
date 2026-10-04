import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ApprovalsController } from './approvals.controller.js';
import { ApprovalsService } from './approvals.service.js';
import { ApprovalsInboxService } from './approvals-inbox.service.js';
import { ApprovalsDecisionService } from './approvals-decision.service.js';
import { ApprovalsOverrideService } from './approvals-override.service.js';
import { ApprovalsRulesService } from './approvals-rules.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [ApprovalsController],
  providers: [
    ApprovalsService,
    ApprovalsInboxService,
    ApprovalsDecisionService,
    ApprovalsOverrideService,
    ApprovalsRulesService,
  ],
  exports: [
    ApprovalsService,
    ApprovalsInboxService,
    ApprovalsDecisionService,
    ApprovalsOverrideService,
    ApprovalsRulesService,
  ],
})
export class ApprovalsModule {}
