import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RequestContext } from '../common/context/request-context.service.js';
import { PrismaService } from './prisma.service.js';
import { SystemPrisma } from './system-prisma.service.js';
import { TenantDb } from './tenant-db.service.js';

@Global()
@Module({
  imports: [ClsModule],
  providers: [PrismaService, RequestContext, TenantDb, SystemPrisma],
  exports: [PrismaService, RequestContext, TenantDb, SystemPrisma],
})
export class DatabaseModule {}
