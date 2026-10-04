import type { Prisma } from '@prisma/client';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { SearchResultItem, UserSearchScopeContext } from '../search.types.js';

export async function searchCustomers(
  db: TenantPrisma,
  companyId: string,
  query: string,
  userCtx: UserSearchScopeContext,
  limit: number,
  blindIndex?: string,
): Promise<SearchResultItem[]> {
  const scope = userCtx.scopes['customer'] ?? userCtx.scopes['crm'] ?? 'ALL';
  const scopeFilter: Prisma.CustomerWhereInput =
    scope === 'OWN'
      ? { assignedToId: userCtx.userId }
      : scope === 'TEAM' && userCtx.teamUserIds && userCtx.teamUserIds.length > 0
        ? { assignedToId: { in: userCtx.teamUserIds } }
        : {};

  const conditions: Prisma.CustomerWhereInput[] = [
    { name: { contains: query, mode: 'insensitive' } },
    { phone: { contains: query, mode: 'insensitive' } },
    { email: { contains: query, mode: 'insensitive' } },
    { customerNumber: { contains: query, mode: 'insensitive' } },
  ];

  if (blindIndex) {
    conditions.push(
      { nidBidx: blindIndex },
      { passportBidx: blindIndex },
      { tinBidx: blindIndex },
      { bankAccountBidx: blindIndex },
    );
  }

  const customers = await db.customer.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...scopeFilter,
      OR: conditions,
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return customers.map((c) => ({
    id: c.id,
    entityType: 'CUSTOMER' as const,
    title: c.name,
    subtitle: `Phone: ${c.phone}`,
    referenceNumber: c.customerNumber,
    status: c.customerType,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function searchLeads(
  db: TenantPrisma,
  companyId: string,
  query: string,
  userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const scope = userCtx.scopes['lead'] ?? userCtx.scopes['crm'] ?? 'ALL';
  const scopeFilter: Prisma.LeadWhereInput =
    scope === 'OWN'
      ? { assignedToId: userCtx.userId }
      : scope === 'TEAM' && userCtx.teamUserIds && userCtx.teamUserIds.length > 0
        ? { assignedToId: { in: userCtx.teamUserIds } }
        : {};

  const leads = await db.lead.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...scopeFilter,
      OR: [
        { leadNumber: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return leads.map((l) => ({
    id: l.id,
    entityType: 'LEAD' as const,
    title: l.name,
    subtitle: `Phone: ${l.phone} | Status: ${l.status}`,
    referenceNumber: l.leadNumber,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  }));
}
