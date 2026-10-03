import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CompanyController } from './company.controller.js';
import { CompanyService } from './company.service.js';
import { BranchService } from './branch.service.js';
import { DepartmentService } from './department.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule],
  controllers: [CompanyController],
  providers: [CompanyService, BranchService, DepartmentService],
  exports: [CompanyService, BranchService, DepartmentService],
})
export class CompanyModule {}
