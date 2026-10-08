import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PostingModule } from '../accounting/posting/posting.module.js';
import { ChequeController } from './cheque/cheque.controller.js';
import { ChequeService } from './cheque/cheque.service.js';
import { InstallmentController } from './installment/installment.controller.js';
import { InstallmentService } from './installment/installment.service.js';
import { PaymentPostedHookRegistry } from './payment/payment-posted.hook.js';
import { PaymentController } from './payment.controller.js';
import { PaymentPostingService } from './payment-posting.service.js';
import { PaymentService } from './payment.service.js';
import { ReceiptController } from './receipt/receipt.controller.js';
import { ReceiptService } from './receipt/receipt.service.js';
import { ReversalController } from './reversal/reversal.controller.js';
import { ReversalService } from './reversal/reversal.service.js';
import { StatementController } from './statement/statement.controller.js';
import { StatementService } from './statement/statement.service.js';
import { RefundController } from './refund/refund.controller.js';
import { RefundService } from './refund/refund.service.js';
import { LateFeeController } from './late-fee/late-fee.controller.js';
import { LateFeeService } from './late-fee/late-fee.service.js';
import { WaiverController } from './waiver/waiver.controller.js';
import { WaiverService } from './waiver/waiver.service.js';
import { AgingController } from './aging/aging.controller.js';
import { AgingService } from './aging/aging.service.js';
import { OverdueCalculationService } from './jobs/overdue-calculation.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, PostingModule],
  controllers: [
    PaymentController,
    InstallmentController,
    ChequeController,
    ReceiptController,
    ReversalController,
    StatementController,
    RefundController,
    LateFeeController,
    WaiverController,
    AgingController,
  ],
  providers: [
    PaymentService,
    PaymentPostingService,
    InstallmentService,
    ChequeService,
    ReceiptService,
    ReversalService,
    StatementService,
    RefundService,
    LateFeeService,
    WaiverService,
    AgingService,
    OverdueCalculationService,
    PaymentPostedHookRegistry,
  ],
  exports: [
    PaymentService,
    PaymentPostingService,
    InstallmentService,
    ChequeService,
    ReceiptService,
    ReversalService,
    StatementService,
    RefundService,
    LateFeeService,
    WaiverService,
    AgingService,
    OverdueCalculationService,
    PaymentPostedHookRegistry,
  ],
})
export class CollectionModule {}
