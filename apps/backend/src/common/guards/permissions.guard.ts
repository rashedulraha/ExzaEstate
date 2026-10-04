import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { type DataScope, ERROR_CODES, MANDATORY_2FA_PERMISSIONS } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { SecurityEventsService } from '../../platform/security/security-events.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permission.decorator.js';
import { STEP_UP_KEY } from '../decorators/step-up.decorator.js';
import {
  AppException,
  ForbiddenException,
  UnauthorizedException,
} from '../exceptions/app.exception.js';

export interface ResolvedPermissions {
  permissions: string[];
  scopes: Record<string, DataScope>;
  branchIds: string[];
  defaultBranchId: string | null;
  teamUserIds: string[];
  isTwoFactorEnabled: boolean;
  status: string;
}

export interface PermissionResolver {
  resolvePermissions(companyId: string, userId: string): Promise<ResolvedPermissions>;
}

export const PERMISSION_RESOLVER = Symbol('PERMISSION_RESOLVER');

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clsService: ClsService,
    @Inject(PERMISSION_RESOLVER) private readonly permissionResolver: PermissionResolver,
    private readonly tenantDb: TenantDb,
    @Optional() private readonly securityEventsService?: SecurityEventsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const companyId = this.clsService.get<string | undefined>('companyId');
    const userId = this.clsService.get<string | undefined>('userId');
    const sessionId = this.clsService.get<string | undefined>('sessionId');

    if (!companyId || !userId || !sessionId) {
      throw new UnauthorizedException('Authentication required');
    }

    const resolved = await this.permissionResolver.resolvePermissions(companyId, userId);

    if (resolved.status !== 'ACTIVE') {
      await this.recordForbiddenEvent(context, companyId, userId, 'User account is not active');
      throw new ForbiddenException('User account is not active');
    }

    this.checkMandatory2Fa(resolved);
    await this.checkRequiredPermissions(context, resolved, companyId, userId);
    await this.checkStepUp(context, companyId, sessionId);

    this.clsService.set('permissions', resolved.permissions);
    this.clsService.set('scopes', resolved.scopes);
    this.clsService.set('branchIds', resolved.branchIds);
    this.clsService.set('teamUserIds', resolved.teamUserIds);

    return true;
  }

  private checkMandatory2Fa(resolved: ResolvedPermissions): void {
    if (resolved.isTwoFactorEnabled) {
      return;
    }

    const holdsMandatory2Fa = MANDATORY_2FA_PERMISSIONS.some((p) =>
      resolved.permissions.includes(p),
    );

    if (holdsMandatory2Fa) {
      throw new AppException(
        ERROR_CODES.TWO_FACTOR_REQUIRED,
        'Two-factor authentication is required for your account',
      );
    }
  }

  private async checkRequiredPermissions(
    context: ExecutionContext,
    resolved: ResolvedPermissions,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return;
    }

    for (const permission of required) {
      if (!resolved.permissions.includes(permission)) {
        await this.recordForbiddenEvent(
          context,
          companyId,
          userId,
          `Access denied: insufficient permissions (missing ${permission})`,
          permission,
        );
        throw new ForbiddenException('Access denied: insufficient permissions', {
          requiredPermission: permission,
        });
      }
    }
  }

  private async recordForbiddenEvent(
    context: ExecutionContext,
    companyId: string,
    userId: string,
    reason: string,
    requiredPermission?: string,
  ): Promise<void> {
    const service = this.securityEventsService;
    if (!service) return;

    try {
      const req = context.switchToHttp().getRequest<{
        ip?: string;
        socket?: { remoteAddress?: string };
        headers?: Record<string, string | undefined>;
        originalUrl?: string;
        url?: string;
      }>();
      const ipAddress = req.ip ?? req.socket?.remoteAddress;
      const userAgent = req.headers?.['user-agent'];
      const route = req.originalUrl ?? req.url;

      await service.record({
        companyId,
        userId,
        eventType: 'FORBIDDEN',
        severity: 'WARN',
        details: {
          reason,
          requiredPermission,
          route,
        },
        ipAddress,
        userAgent,
      });
    } catch {
      // Security event logging must not mask authorization failure
    }
  }

  private async checkStepUp(
    context: ExecutionContext,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    const requireStepUp = this.reflector.getAllAndOverride<boolean>(STEP_UP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireStepUp) {
      return;
    }

    const session = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.session.findUnique({
        where: { id: sessionId, companyId },
        select: { stepUpUntil: true },
      });
    });

    if (!session?.stepUpUntil || new Date(session.stepUpUntil) <= new Date()) {
      throw new AppException(
        ERROR_CODES.STEP_UP_REQUIRED,
        'Step-up authentication is required for this operation',
      );
    }
  }
}
