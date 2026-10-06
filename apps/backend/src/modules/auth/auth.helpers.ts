import crypto from 'node:crypto';
import { NotFoundException } from '../../common/exceptions/app.exception.js';
import type { SystemPrisma } from '../../database/system-prisma.service.js';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { PermissionService } from './permission.service.js';
import type { TokenPairResult, TokenService } from './token.service.js';

export interface AuthResult {
  tokens: TokenPairResult;
  user: {
    id: string;
    email: string;
    fullName: string;
    companyId: string;
    companyName?: string;
    isTwoFactorEnabled?: boolean;
    permissions?: string[];
    scopes?: Record<string, string>;
    branchIds?: string[];
  };
}

export interface UserProfileResult {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  companyName?: string;
  phone: string | null;
  status: string;
  isTwoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  permissions?: string[];
  scopes?: Record<string, string>;
  branchIds?: string[];
}

export interface UserAuthRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  status: string;
  failed_login_attempts: number;
  locked_until: Date | null;
  is_two_factor_enabled: boolean;
  full_name: string;
}

export async function handleSuperAdminLogin(params: {
  systemPrisma: SystemPrisma;
  tokenService: TokenService;
  user: UserAuthRow;
  ip?: string;
  userAgent?: string;
}): Promise<AuthResult> {
  const { systemPrisma, tokenService, user, ip, userAgent } = params;

  const session = await systemPrisma.executeWithReason(
    '// SYSTEM-SCOPE: Create Super Admin session',
    async (client) => {
      return client.systemSession.create({
        data: {
          adminId: user.id,
          familyId: crypto.randomUUID(),
          ipAddress: ip ?? null,
          userAgent: userAgent ?? null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    },
  );

  const accessToken = tokenService.generateAccessToken({
    sub: user.id,
    companyId: user.company_id,
    sid: session.id,
    realm: 'system',
  });
  const refreshToken = crypto.randomBytes(32).toString('hex');

  return {
    tokens: {
      accessToken,
      refreshToken,
      sessionId: session.id,
    },
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyId: user.company_id,
      companyName: 'Exzazon Platform Administration',
      isTwoFactorEnabled: user.is_two_factor_enabled,
      permissions: ['*'],
      scopes: { ALL: 'ALL' },
      branchIds: [],
    },
  };
}

export async function handleSuperAdminGetMe(
  systemPrisma: SystemPrisma,
  userId: string,
): Promise<UserProfileResult> {
  const systemAdmin = await systemPrisma.executeWithReason(
    '// SYSTEM-SCOPE: Retrieve Super Admin profile for me',
    async (client) => client.systemAdmin.findUnique({ where: { id: userId } }),
  );

  if (!systemAdmin) {
    throw new NotFoundException('User profile not found');
  }

  return {
    id: systemAdmin.id,
    email: systemAdmin.email,
    fullName: systemAdmin.fullName,
    companyId: '00000000-0000-0000-0000-000000000000',
    companyName: 'Exzazon Platform Administration',
    phone: null,
    status: systemAdmin.status,
    isTwoFactorEnabled: systemAdmin.isTwoFactorEnabled,
    lastLoginAt: null,
    permissions: ['*'],
    scopes: { ALL: 'ALL' },
    branchIds: [],
  };
}

export async function revokeSuperAdminSession(
  systemPrisma: SystemPrisma,
  sessionId: string,
): Promise<void> {
  await systemPrisma.executeWithReason(
    '// SYSTEM-SCOPE: Revoke Super Admin session',
    async (client) => {
      await client.systemSession.deleteMany({
        where: { id: sessionId },
      });
    },
  );
}

export async function resolveTenantAuthUser(params: {
  systemPrisma: SystemPrisma;
  permissionService?: PermissionService;
  user: UserAuthRow;
}): Promise<AuthResult['user']> {
  const { systemPrisma, permissionService, user } = params;

  const resolved = permissionService
    ? await permissionService.resolvePermissions(user.company_id, user.id)
    : undefined;

  const company = await systemPrisma.executeWithReason(
    '// SYSTEM-SCOPE: Retrieve company name for user session',
    async (client) =>
      client.company.findUnique({
        where: { id: user.company_id },
        select: { name: true },
      }),
  );

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    companyId: user.company_id,
    companyName: company?.name || 'ExzaEstate Development Ltd.',
    isTwoFactorEnabled: user.is_two_factor_enabled,
    permissions: resolved?.permissions ?? [],
    scopes: resolved?.scopes ?? {},
    branchIds: resolved?.branchIds ?? [],
  };
}

export async function authenticateSuperAdminPreTenant(
  systemPrisma: SystemPrisma,
  email: string,
  password: string,
  verifyPasswordFn: (password: string, hash: string) => Promise<boolean>,
): Promise<UserAuthRow | null> {
  const systemAdmin = await systemPrisma.executeWithReason(
    '// SYSTEM-SCOPE: Check Super Admin login from main authentication route',
    async (client) =>
      client.systemAdmin.findFirst({
        where: { email, status: 'ACTIVE' },
      }),
  );

  if (!systemAdmin) return null;

  const isPasswordValid = await verifyPasswordFn(password, systemAdmin.passwordHash);
  if (!isPasswordValid) return null;

  return {
    id: systemAdmin.id,
    company_id: '00000000-0000-0000-0000-000000000000',
    email: systemAdmin.email,
    password_hash: systemAdmin.passwordHash,
    status: systemAdmin.status,
    failed_login_attempts: 0,
    locked_until: null,
    is_two_factor_enabled: systemAdmin.isTwoFactorEnabled,
    full_name: systemAdmin.fullName,
  };
}

interface TenantUserRow {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
  phone: string | null;
  status: string;
  is_two_factor_enabled: boolean;
  last_login_at: Date | null;
}

async function queryTenantUserRow(
  tenantDb: TenantDb,
  companyId: string,
  userId: string,
): Promise<TenantUserRow> {
  let user: TenantUserRow | undefined;

  await tenantDb.transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<TenantUserRow[]>(
      `SELECT id, email, full_name, company_id, phone, status, is_two_factor_enabled, last_login_at
       FROM users
       WHERE id = $1::uuid AND company_id = $2::uuid
       LIMIT 1`,
      userId,
      companyId,
    );
    user = rows[0];
  });

  if (!user) {
    throw new NotFoundException('User profile not found');
  }

  return user;
}

export async function fetchTenantUserProfile(params: {
  tenantDb: TenantDb;
  systemPrisma: SystemPrisma;
  permissionService?: PermissionService;
  companyId: string;
  userId: string;
}): Promise<UserProfileResult> {
  const { tenantDb, systemPrisma, permissionService, companyId, userId } = params;
  const user = await queryTenantUserRow(tenantDb, companyId, userId);

  const resolved = permissionService
    ? await permissionService.resolvePermissions(companyId, userId)
    : undefined;

  const company = await systemPrisma.executeWithReason(
    '// SYSTEM-SCOPE: Retrieve company name for user profile',
    async (client) =>
      client.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),
  );

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    companyId: user.company_id,
    companyName: company?.name || 'ExzaEstate Development Ltd.',
    phone: user.phone,
    status: user.status,
    isTwoFactorEnabled: user.is_two_factor_enabled,
    lastLoginAt: user.last_login_at,
    permissions: resolved?.permissions ?? [],
    scopes: resolved?.scopes ?? {},
    branchIds: resolved?.branchIds ?? [],
  };
}
