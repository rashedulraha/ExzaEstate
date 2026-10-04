import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BalanceSheetQuery } from './queries/balance-sheet.query.js';
import { IncomeStatementQuery } from './queries/income-statement.query.js';
import { TrialBalanceQuery } from './queries/trial-balance.query.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [TrialBalanceQuery, BalanceSheetQuery, IncomeStatementQuery, ReportsService],
  exports: [ReportsService, TrialBalanceQuery, BalanceSheetQuery, IncomeStatementQuery],
})
export class ReportsModule {}
