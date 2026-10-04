import { Inject, Injectable, Optional } from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import {
  PERMISSION_RESOLVER,
  type PermissionResolver,
} from '../../common/guards/permissions.guard.js';
import { searchCustomers, searchLeads } from './handlers/search-crm.handlers.js';
import { searchBookings, searchProjects, searchProperties } from './handlers/search-sales.handlers.js';
import {
  searchDocuments,
  searchPayments,
  searchReceipts,
  searchVendors,
  searchVouchers,
} from './handlers/search-finance.handlers.js';
import type {
  GlobalSearchResponseDto,
  SearchEntityType,
  SearchResultItem,
  UserSearchScopeContext,
} from './search.types.js';

const ENTITY_PERMISSIONS: Record<SearchEntityType, string> = {
  CUSTOMER: PERMISSIONS.CUSTOMER_VIEW,
  LEAD: PERMISSIONS.LEAD_VIEW,
  BOOKING: PERMISSIONS.BOOKING_VIEW,
  PROPERTY: PERMISSIONS.PROPERTY_VIEW,
  PAYMENT: PERMISSIONS.PAYMENT_VIEW,
  RECEIPT: PERMISSIONS.RECEIPT_VIEW,
  VOUCHER: PERMISSIONS.EXPENSE_VIEW,
  DOCUMENT: PERMISSIONS.DOCUMENT_VIEW,
  VENDOR: PERMISSIONS.VENDOR_VIEW,
  PROJECT: PERMISSIONS.PROJECT_VIEW,
};

const ALL_ENTITIES: SearchEntityType[] = [
  'CUSTOMER',
  'LEAD',
  'BOOKING',
  'PROPERTY',
  'PAYMENT',
  'RECEIPT',
  'VOUCHER',
  'DOCUMENT',
  'VENDOR',
  'PROJECT',
];

type SearchHandlerFn = (
  db: TenantPrisma,
  companyId: string,
  query: string,
  userCtx: UserSearchScopeContext,
  limit: number,
  blindIndex: string,
) => Promise<SearchResultItem[]>;

const SEARCH_HANDLERS: Record<SearchEntityType, SearchHandlerFn> = {
  CUSTOMER: (db, companyId, query, userCtx, limit, blindIndex) =>
    searchCustomers(db, companyId, query, userCtx, limit, blindIndex),
  LEAD: (db, companyId, query, userCtx, limit) => searchLeads(db, companyId, query, userCtx, limit),
  BOOKING: (db, companyId, query, userCtx, limit) => searchBookings(db, companyId, query, userCtx, limit),
  PROPERTY: (db, companyId, query, userCtx, limit) => searchProperties(db, companyId, query, userCtx, limit),
  PAYMENT: (db, companyId, query, userCtx, limit) => searchPayments(db, companyId, query, userCtx, limit),
  RECEIPT: (db, companyId, query, userCtx, limit) => searchReceipts(db, companyId, query, userCtx, limit),
  VOUCHER: (db, companyId, query, userCtx, limit) => searchVouchers(db, companyId, query, userCtx, limit),
  DOCUMENT: (db, companyId, query, userCtx, limit) => searchDocuments(db, companyId, query, userCtx, limit),
  VENDOR: (db, companyId, query, userCtx, limit) => searchVendors(db, companyId, query, userCtx, limit),
  PROJECT: (db, companyId, query, userCtx, limit) => searchProjects(db, companyId, query, userCtx, limit),
};

@Injectable()
export class SearchService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly fieldCrypto: FieldCryptoService,
    @Optional()
    @Inject(PERMISSION_RESOLVER)
    private readonly permissionResolver?: PermissionResolver,
  ) {}

  async search(
    companyId: string,
    query: string,
    userCtx: UserSearchScopeContext,
    requestedEntities?: SearchEntityType[],
    limit = 10,
    tx?: TenantPrisma,
  ): Promise<GlobalSearchResponseDto> {
    const trimmed = query.trim();
    const effectiveLimit = Math.min(Math.max(limit, 1), 50);

    const emptyResult: GlobalSearchResponseDto = {
      query: trimmed,
      totalResults: 0,
      resultsByEntity: {
        CUSTOMER: [],
        LEAD: [],
        BOOKING: [],
        PROPERTY: [],
        PAYMENT: [],
        RECEIPT: [],
        VOUCHER: [],
        DOCUMENT: [],
        VENDOR: [],
        PROJECT: [],
      },
      items: [],
    };

    if (!trimmed) {
      return emptyResult;
    }

    const blindIndex = this.fieldCrypto.blindIndex(trimmed, companyId);
    const targetEntities = (requestedEntities && requestedEntities.length > 0
      ? requestedEntities
      : ALL_ENTITIES
    ).filter((entity) => userCtx.permissions.includes(ENTITY_PERMISSIONS[entity]));

    const runner = async (db: TenantPrisma): Promise<GlobalSearchResponseDto> => {
      const searchPromises = targetEntities.map((entity) =>
        this.dispatchEntitySearch(db, companyId, entity, trimmed, userCtx, effectiveLimit, blindIndex),
      );

      const results = await Promise.allSettled(searchPromises);
      const resultsByEntity: Record<SearchEntityType, SearchResultItem[]> = {
        CUSTOMER: [],
        LEAD: [],
        BOOKING: [],
        PROPERTY: [],
        PAYMENT: [],
        RECEIPT: [],
        VOUCHER: [],
        DOCUMENT: [],
        VENDOR: [],
        PROJECT: [],
      };

      const allItems: SearchResultItem[] = [];

      results.forEach((res, index) => {
        const entity = targetEntities[index];
        if (entity && res.status === 'fulfilled') {
          resultsByEntity[entity] = res.value;
          allItems.push(...res.value);
        }
      });

      return {
        query: trimmed,
        totalResults: allItems.length,
        resultsByEntity,
        items: allItems,
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async resolveUserContext(
    companyId: string,
    userId: string,
  ): Promise<UserSearchScopeContext> {
    if (!this.permissionResolver) {
      return {
        userId,
        permissions: Object.values(PERMISSIONS),
        scopes: {},
      };
    }

    const resolved = await this.permissionResolver.resolvePermissions(companyId, userId);
    return {
      userId,
      permissions: resolved.permissions,
      scopes: resolved.scopes,
      teamUserIds: resolved.teamUserIds,
      branchIds: resolved.branchIds,
    };
  }

  private async dispatchEntitySearch(
    db: TenantPrisma,
    companyId: string,
    entity: SearchEntityType,
    query: string,
    userCtx: UserSearchScopeContext,
    limit: number,
    blindIndex: string,
  ): Promise<SearchResultItem[]> {
    const handler = SEARCH_HANDLERS[entity];
    return handler ? handler(db, companyId, query, userCtx, limit, blindIndex) : [];
  }
}
