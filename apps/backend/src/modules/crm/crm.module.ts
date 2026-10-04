import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { JobsModule } from '../../jobs/jobs.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CrmController } from './crm.controller.js';
import { CrmQueryService } from './crm-query.service.js';
import { CrmService } from './crm.service.js';
import { FollowUpController } from './follow-up.controller.js';
import { FollowUpQueryService } from './follow-up-query.service.js';
import { FollowUpService } from './follow-up.service.js';
import { OverdueFollowUpService } from './overdue-follow-up.service.js';

import { CustomerController } from './customer.controller.js';
import { CustomerQueryService } from './customer-query.service.js';
import { CustomerRelationService } from './customer-relation.service.js';
import { CustomerService } from './customer.service.js';
import { CustomerTimelineService } from './customer-timeline.service.js';
import { LeadConversionService } from './lead-conversion.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, NotificationsModule, JobsModule],
  controllers: [CustomerController, CrmController, FollowUpController],
  providers: [
    CrmService,
    CrmQueryService,
    FollowUpService,
    FollowUpQueryService,
    OverdueFollowUpService,
    CustomerService,
    CustomerRelationService,
    CustomerQueryService,
    CustomerTimelineService,
    LeadConversionService,
  ],
  exports: [
    CrmService,
    CrmQueryService,
    FollowUpService,
    FollowUpQueryService,
    OverdueFollowUpService,
    CustomerService,
    CustomerRelationService,
    CustomerQueryService,
    CustomerTimelineService,
    LeadConversionService,
  ],
})
export class CrmModule {}
