import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PropertyController } from './property.controller.js';
import { PropertyPricingService } from './property-pricing.service.js';
import { PropertyStatusService } from './property-status.service.js';
import { PropertyService } from './property.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyStatusService, PropertyPricingService],
  exports: [PropertyService, PropertyStatusService, PropertyPricingService],
})
export class PropertyModule {}
