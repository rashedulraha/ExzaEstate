import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { PlatformModule } from '../../../platform/platform.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { PostingModule } from '../posting/posting.module.js';
import { CashBankService } from './cashbank.service.js';
import { CashTransferService } from './cash-transfer.service.js';
import { BankReconciliationService } from './bank-reconciliation.service.js';
import { CashBankController } from './cashbank.controller.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, PostingModule],
  controllers: [CashBankController],
  providers: [CashBankService, CashTransferService, BankReconciliationService],
  exports: [CashBankService, CashTransferService, BankReconciliationService],
})
export class CashBankModule {}
