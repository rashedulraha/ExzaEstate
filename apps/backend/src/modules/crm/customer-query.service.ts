import { Injectable, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import {
  buildCustomerBlindIndexFilters,
  computeCustomerBlindIndex,
} from './customer-crypto.helper.js';
import {
  mapCustomerDetailResponse,
  mapCustomerResponse,
  type DocumentWithVersion,
} from './customer.mapper.js';
import { buildCustomerScopeWhere, type CustomerScopeContext } from './customer-scope.helper.js';
import { findAndScopeCustomer } from './customer-service.helper.js';
import type {
  CustomerDetailResponseDto,
  CustomerResponseDto,
  QueryCustomersDto,
} from './dto/index.js';

function buildCustomerFilterConditions(
  fieldCrypto: FieldCryptoService,
  query: QueryCustomersDto,
  companyId: string,
): Prisma.CustomerWhereInput[] {
  const conditions: Prisma.CustomerWhereInput[] = [];

  const blindIndexFilters = buildCustomerBlindIndexFilters(fieldCrypto, query, companyId);
  if (blindIndexFilters.length > 0) {
    conditions.push(...blindIndexFilters);
  }

  if (query.customerType) conditions.push({ customerType: query.customerType });
  if (query.isNrb !== undefined) conditions.push({ isNrb: query.isNrb });
  if (query.isKycCompleted !== undefined) conditions.push({ isKycCompleted: query.isKycCompleted });
  if (query.branchId) conditions.push({ branchId: query.branchId });
  if (query.assignedToId) conditions.push({ assignedToId: query.assignedToId });

  if (query.search) {
    const term = query.search.trim();
    const searchBidx = computeCustomerBlindIndex(fieldCrypto, term, companyId);
    conditions.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
        { customerNumber: { contains: term, mode: 'insensitive' } },
        ...(searchBidx
          ? [
              { nidBidx: searchBidx },
              { passportBidx: searchBidx },
              { tinBidx: searchBidx },
              { bankAccountBidx: searchBidx },
            ]
          : []),
      ],
    });
  }

  return conditions;
}

@Injectable()
export class CustomerQueryService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly fieldCrypto: FieldCryptoService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async listCustomers(
    companyId: string,
    query: QueryCustomersDto,
    context: CustomerScopeContext,
    hasPiiPermission = false,
  ): Promise<{
    data: CustomerResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const skip = (page - 1) * limit;

      const andConditions: Prisma.CustomerWhereInput[] = [{ companyId }, { deletedAt: null }];

      const scopeCondition = buildCustomerScopeWhere(context);
      if (scopeCondition) {
        andConditions.push(scopeCondition);
      }

      const filters = buildCustomerFilterConditions(this.fieldCrypto, query, companyId);
      if (filters.length > 0) {
        andConditions.push(...filters);
      }

      const where: Prisma.CustomerWhereInput = { AND: andConditions };

      const [total, items] = await Promise.all([
        tx.customer.count({ where }),
        tx.customer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const data = items.map((c) => mapCustomerResponse(c, this.fieldCrypto, hasPiiPermission));
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: { total, page, limit, totalPages },
      };
    });
  }

  async getCustomerById(
    companyId: string,
    id: string,
    context?: CustomerScopeContext,
    hasPiiPermission = false,
    callerUserId?: string,
  ): Promise<CustomerDetailResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const customer = await findAndScopeCustomer(tx, companyId, id, context);

      const documents = (await tx.document.findMany({
        where: {
          companyId,
          entityType: 'CUSTOMER',
          entityId: id,
          deletedAt: null,
        },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      })) as DocumentWithVersion[];

      if (hasPiiPermission && this.auditService) {
        await this.auditService.record(tx, {
          module: 'crm',
          entity: 'Customer',
          entityId: customer.id,
          action: 'CUSTOMER_PII_VIEW',
          newValue: {
            unmaskedBy: callerUserId ?? context?.userId ?? 'unknown',
            viewedAt: new Date().toISOString(),
          },
        });
      }

      return mapCustomerDetailResponse(customer, this.fieldCrypto, hasPiiPermission, documents);
    });
  }
}
