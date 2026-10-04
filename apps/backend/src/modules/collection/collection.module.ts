import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { InstallmentController } from './installment/installment.controller.js';
import { InstallmentService } from './installment/installment.service.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [PaymentController, InstallmentController],
  providers: [PaymentService, InstallmentService],
  exports: [PaymentService, InstallmentService],
})
export class CollectionModule {}
