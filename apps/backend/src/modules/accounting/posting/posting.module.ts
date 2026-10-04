import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { PeriodGuard } from '../period/period-guard.service.js';
import { PostingRuleRegistry } from '../posting-rules/posting-rule.registry.js';
import { PostingService } from './posting.service.js';
import { PostingRulesService } from './posting-rules.service.js';
import { PostingRulesController } from './posting-rules.controller.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PostingRulesController],
  providers: [PeriodGuard, PostingRuleRegistry, PostingService, PostingRulesService],
  exports: [PeriodGuard, PostingRuleRegistry, PostingService, PostingRulesService],
})
export class PostingModule {}
