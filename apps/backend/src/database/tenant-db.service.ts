import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestContext } from '../common/context/request-context.service.js';
import { PrismaService } from './prisma.service.js';
import { TenantPrisma, createTenantPrisma } from './tenant-prisma.js';

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
}

@Injectable()
export class TenantDb {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContext,
  ) {}

  /**
   * Returns a tenant-scoped Prisma client extension bound to the current request's companyId.
   */
  get client(): TenantPrisma {
    const companyId = this.requestContext.companyId;
    return createTenantPrisma(this.prisma, companyId, this.requestContext.userId);
  }

  /**
   * Executes multi-statement operations inside a single database transaction with
   * PostgreSQL transaction-local setting 'app.current_company_id' initialized.
   *
   * Enforces RULE-ATOMIC: if any operation fails, the entire transaction rolls back.
   */
  async transaction<T>(
    fn: (tx: TenantPrisma) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const companyId = this.requestContext.companyId;
    const userId = this.requestContext.userId;

    return this.prisma.$transaction(async (rawTx) => {
      await rawTx.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
      const txTenant = createTenantPrisma(rawTx as unknown as PrismaClient, companyId, userId);
      return fn(txTenant);
    }, options);
  }

  /**
   * Executes a transaction explicitly scoped to an explicit companyId (e.g., worker jobs).
   */
  async withCompany<T>(
    companyId: string,
    fn: (tx: TenantPrisma) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return this.prisma.$transaction(async (rawTx) => {
      await rawTx.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
      const txTenant = createTenantPrisma(rawTx as unknown as PrismaClient, companyId);
      return fn(txTenant);
    }, options);
  }
}
