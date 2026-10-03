import { Prisma, PrismaClient } from '@prisma/client';

export type TenantPrisma = ReturnType<typeof createTenantPrismaExtension>;

function createTenantPrismaExtension(prisma: PrismaClient, companyId: string) {
  return prisma.$extends({
    name: 'TenantPrisma',
    client: {
      get currentCompanyId(): string {
        return companyId;
      },

      async $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T> {
        if ('$transaction' in prisma && typeof prisma.$transaction === 'function') {
          return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
            return (tx as PrismaClient).$queryRawUnsafe<T>(query, ...values);
          });
        }
        await prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
        return prisma.$queryRawUnsafe<T>(query, ...values);
      },

      async $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> {
        if ('$transaction' in prisma && typeof prisma.$transaction === 'function') {
          return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
            return (tx as PrismaClient).$executeRawUnsafe(query, ...values);
          });
        }
        await prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
        return prisma.$executeRawUnsafe(query, ...values);
      },

      async $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> {
        if ('$transaction' in prisma && typeof prisma.$transaction === 'function') {
          return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
            return (tx as PrismaClient).$queryRaw<T>(query, ...values);
          });
        }
        await prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
        return prisma.$queryRaw<T>(query, ...values);
      },

      async $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number> {
        if ('$transaction' in prisma && typeof prisma.$transaction === 'function') {
          return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
            return (tx as PrismaClient).$executeRaw(query, ...values);
          });
        }
        await prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, true)`;
        return prisma.$executeRaw(query, ...values);
      },
    },
  });
}

/**
 * Creates an extended or transaction-wrapped Prisma client bound to a specific tenant companyId.
 * Automatically injects the PostgreSQL transaction-local setting 'app.current_company_id'
 * to enforce database-level Row-Level Security (RLS).
 */
export function createTenantPrisma(
  prisma: PrismaClient | Prisma.TransactionClient,
  companyId: string,
  _userId?: string,
): TenantPrisma {
  if ('$extends' in prisma && typeof prisma.$extends === 'function') {
    return createTenantPrismaExtension(prisma as PrismaClient, companyId);
  }

  // Inside an active transaction, transaction-local RLS is already set at transaction start.
  // Wrap with Proxy to provide currentCompanyId and direct delegation.
  return new Proxy(prisma as object, {
    get(target, prop, receiver) {
      if (prop === 'currentCompanyId') {
        return companyId;
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as TenantPrisma;
}
