import type { Prisma } from '@prisma/client';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { SearchResultItem, UserSearchScopeContext } from '../search.types.js';

export async function searchBookings(
  db: TenantPrisma,
  companyId: string,
  query: string,
  userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const scope = userCtx.scopes['booking'] ?? 'ALL';
  const scopeFilter: Prisma.BookingWhereInput =
    scope === 'OWN'
      ? { salesExecutiveId: userCtx.userId }
      : scope === 'TEAM' && userCtx.teamUserIds && userCtx.teamUserIds.length > 0
        ? { salesExecutiveId: { in: userCtx.teamUserIds } }
        : {};

  const bookings = await db.booking.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...scopeFilter,
      bookingNumber: { contains: query, mode: 'insensitive' },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return bookings.map((b) => ({
    id: b.id,
    entityType: 'BOOKING' as const,
    title: `Booking ${b.bookingNumber}`,
    subtitle: `Status: ${b.status}`,
    referenceNumber: b.bookingNumber,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  }));
}

export async function searchProperties(
  db: TenantPrisma,
  companyId: string,
  query: string,
  _userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const properties = await db.property.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { code: 'asc' },
  });

  return properties.map((p) => ({
    id: p.id,
    entityType: 'PROPERTY' as const,
    title: `Property ${p.code} (${p.title ?? p.type})`,
    subtitle: `Status: ${p.status} | Type: ${p.type}`,
    referenceNumber: p.code,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function searchProjects(
  db: TenantPrisma,
  companyId: string,
  query: string,
  _userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const projects = await db.project.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return projects.map((pr) => ({
    id: pr.id,
    entityType: 'PROJECT' as const,
    title: `Project: ${pr.name}`,
    subtitle: `Location: ${pr.location ?? 'N/A'} | Status: ${pr.status}`,
    referenceNumber: pr.code,
    status: pr.status,
    createdAt: pr.createdAt.toISOString(),
  }));
}
