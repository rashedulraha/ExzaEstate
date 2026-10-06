import { Inject, Injectable, Optional } from '@nestjs/common';
import { DATA_SCOPES, DataScope } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { CACHE_STORE, type CacheStore } from '../../ports/index.js';

export interface ResolvedPermissions {
  permissions: string[];
  scopes: Record<string, DataScope>;
  branchIds: string[];
  defaultBranchId: string | null;
  teamUserIds: string[];
  isTwoFactorEnabled: boolean;
  status: string;
}

const SCOPE_RANK: Record<DataScope, number> = {
  [DATA_SCOPES.ALL]: 4,
  [DATA_SCOPES.BRANCH]: 3,
  [DATA_SCOPES.TEAM]: 2,
  [DATA_SCOPES.OWN]: 1,
};

const PERMISSION_CACHE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class PermissionService {
  constructor(
    private readonly tenantDb: TenantDb,
    @Optional() @Inject(CACHE_STORE) private readonly cacheStore?: CacheStore,
  ) {}

  private getCacheKey(companyId: string, userId: string): string {
    return `perm:${companyId}:${userId}`;
  }

  async resolvePermissions(companyId: string, userId: string): Promise<ResolvedPermissions> {
    if (companyId === '00000000-0000-0000-0000-000000000000') {
      return {
        permissions: ['*'],
        scopes: {
          crm: DATA_SCOPES.ALL,
          sales: DATA_SCOPES.ALL,
          collection: DATA_SCOPES.ALL,
          accounting: DATA_SCOPES.ALL,
          property: DATA_SCOPES.ALL,
          ALL: DATA_SCOPES.ALL,
        },
        branchIds: [],
        defaultBranchId: null,
        teamUserIds: [],
        isTwoFactorEnabled: false,
        status: 'ACTIVE',
      };
    }

    const cacheKey = this.getCacheKey(companyId, userId);
    if (this.cacheStore) {
      const cached = await this.cacheStore.get<ResolvedPermissions>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const resolved = await this.tenantDb.withCompany(companyId, async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId, companyId },
        select: { status: true, isTwoFactorEnabled: true },
      });

      if (!user) {
        return createInactivePermissions();
      }

      const userBranches = await tx.userBranch.findMany({
        where: { companyId, userId },
        select: { branchId: true, isDefault: true },
      });

      const branchIds = userBranches.map((b) => b.branchId);
      const defaultBranch = userBranches.find((b) => b.isDefault)?.branchId ?? branchIds[0] ?? null;

      const userRoles = await tx.userRole.findMany({
        where: { companyId, userId },
        select: { roleId: true },
      });

      const roleIds = userRoles.map((ur) => ur.roleId);
      const { permissions, scopes } = await this.loadMergedPermissions(tx, companyId, roleIds);
      const teamUserIds = await resolveTeamUserIds(tx, companyId, userId);

      const result: ResolvedPermissions = {
        permissions,
        scopes,
        branchIds,
        defaultBranchId: defaultBranch,
        teamUserIds,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        status: user.status,
      };

      return result;
    });

    if (this.cacheStore) {
      await this.cacheStore.set(cacheKey, resolved, PERMISSION_CACHE_TTL_SECONDS);
    }

    return resolved;
  }

  private async loadMergedPermissions(
    tx: TenantPrisma,
    companyId: string,
    roleIds: string[],
  ): Promise<{ permissions: string[]; scopes: Record<string, DataScope> }> {
    if (roleIds.length === 0) {
      return { permissions: [], scopes: {} };
    }

    const rolePermissions = await tx.rolePermission.findMany({
      where: { companyId, roleId: { in: roleIds } },
      select: { permissionCode: true, scope: true },
    });

    const permissionsSet = new Set<string>();
    const scopes: Record<string, DataScope> = {};

    for (const rp of rolePermissions) {
      permissionsSet.add(rp.permissionCode);
      if (rp.scope) {
        const currentScope = scopes[rp.permissionCode];
        const newScope = rp.scope as DataScope;
        if (!currentScope || SCOPE_RANK[newScope] > SCOPE_RANK[currentScope]) {
          scopes[rp.permissionCode] = newScope;
        }
      }
    }

    return { permissions: Array.from(permissionsSet), scopes };
  }

  async invalidateUserPermissions(companyId: string, userId: string): Promise<void> {
    if (this.cacheStore) {
      const cacheKey = this.getCacheKey(companyId, userId);
      await this.cacheStore.del(cacheKey);
    }
  }

  async invalidateRolePermissions(companyId: string, roleId: string): Promise<void> {
    const userRoles = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.userRole.findMany({
        where: { companyId, roleId },
        select: { userId: true },
      });
    });

    await Promise.all(userRoles.map((ur) => this.invalidateUserPermissions(companyId, ur.userId)));
  }

  async invalidateCompanyPermissions(companyId: string): Promise<void> {
    const users = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.user.findMany({
        where: { companyId },
        select: { id: true },
      });
    });

    await Promise.all(users.map((u) => this.invalidateUserPermissions(companyId, u.id)));
  }
}

function createInactivePermissions(): ResolvedPermissions {
  return {
    permissions: [],
    scopes: {},
    branchIds: [],
    defaultBranchId: null,
    teamUserIds: [],
    isTwoFactorEnabled: false,
    status: 'INACTIVE',
  };
}

async function resolveTeamUserIds(
  tx: TenantPrisma,
  companyId: string,
  userId: string,
): Promise<string[]> {
  const teamUserIds = [userId];
  const employee = await tx.employee.findFirst({
    where: { companyId, userId, deletedAt: null },
    select: { id: true },
  });

  if (!employee) {
    return teamUserIds;
  }

  const visitedEmployeeIds = new Set<string>([employee.id]);
  let currentSupervisorEmployeeIds = [employee.id];

  while (currentSupervisorEmployeeIds.length > 0) {
    const subordinates = await tx.employee.findMany({
      where: {
        companyId,
        supervisorId: { in: currentSupervisorEmployeeIds },
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });

    const nextIds: string[] = [];
    for (const sub of subordinates) {
      if (!visitedEmployeeIds.has(sub.id)) {
        visitedEmployeeIds.add(sub.id);
        nextIds.push(sub.id);
        if (!teamUserIds.includes(sub.userId)) {
          teamUserIds.push(sub.userId);
        }
      }
    }
    currentSupervisorEmployeeIds = nextIds;
  }

  return teamUserIds;
}
