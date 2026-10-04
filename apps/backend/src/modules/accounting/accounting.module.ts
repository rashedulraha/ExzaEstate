import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CoaController } from './coa/coa.controller.js';
import { CoaService } from './coa/coa.service.js';
import { PeriodController } from './period/period.controller.js';
import { PeriodGuard } from './period/period-guard.service.js';
import { PeriodService } from './period/period.service.js';
import { JournalController } from './journal/journal.controller.js';
import { JournalService } from './journal/journal.service.js';
import { PostingModule } from './posting/posting.module.js';
import { CashBankModule } from './cashbank/cashbank.module.js';
import { LedgerController } from './ledger/ledger.controller.js';
import { LedgerService } from './ledger/ledger.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, PostingModule, CashBankModule],
  controllers: [CoaController, PeriodController, JournalController, LedgerController],
  providers: [CoaService, PeriodService, PeriodGuard, JournalService, LedgerService],
  exports: [
    CoaService,
    PeriodService,
    PeriodGuard,
    JournalService,
    PostingModule,
    CashBankModule,
    LedgerService,
  ],
})
export class AccountingModule {}
