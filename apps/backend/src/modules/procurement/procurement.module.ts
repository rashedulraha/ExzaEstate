import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PostingModule } from '../accounting/posting/posting.module.js';
import { VendorController } from './vendor/vendor.controller.js';
import { VendorService } from './vendor/vendor.service.js';
import { VendorBillController } from './bill/vendor-bill.controller.js';
import { VendorBillService } from './bill/vendor-bill.service.js';
import { VendorPaymentController } from './payment/vendor-payment.controller.js';
import { VendorPaymentService } from './payment/vendor-payment.service.js';
import { VendorApController } from './arap/vendor-ap.controller.js';
import { VendorApService } from './arap/vendor-ap.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, PostingModule],
  controllers: [
    VendorController,
    VendorBillController,
    VendorPaymentController,
    VendorApController,
  ],
  providers: [VendorService, VendorBillService, VendorPaymentService, VendorApService],
  exports: [VendorService, VendorBillService, VendorPaymentService, VendorApService],
})
export class ProcurementModule {}
