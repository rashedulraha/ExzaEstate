import { Module } from '@nestjs/common';
import { PerCompanyScheduler } from './per-company.scheduler.js';

@Module({
  providers: [PerCompanyScheduler],
  exports: [PerCompanyScheduler],
})
export class JobsModule {}
