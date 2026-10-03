import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ClsService } from 'nestjs-cls';
import { ConfigService } from '../../config/config.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { CACHE_STORE, type CacheStore } from '../../ports/index.js';
import { ERROR_CODES, type ErrorCode } from '@exzaestate/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  AppException,
  ForbiddenException,
  UnauthorizedException,
} from '../exceptions/app.exception.js';

export interface JwtAccessTokenPayload {
  sub: string;
  companyId: string;
  sid: string;
  realm?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly clsService: ClsService,
    private readonly tenantDb: TenantDb,
    @Optional() @Inject(CACHE_STORE) private readonly cacheStore?: CacheStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = this.extractToken(request);
    const payload = this.verifyToken(token);

    await this.checkSessionRevocation(payload);
    await this.enforceLicenseAndLimits(request, response, payload);

    this.clsService.set('companyId', payload.companyId);
    this.clsService.set('userId', payload.sub);
    this.clsService.set('sessionId', payload.sid);

    request.user = {
      userId: payload.sub,
      companyId: payload.companyId,
      sessionId: payload.sid,
    };

    return true;
  }

  private async enforceLicenseAndLimits(
    request: Request,
    response: Response | undefined,
    payload: JwtAccessTokenPayload,
  ): Promise<void> {
    const license = await this.fetchActiveLicense(payload.companyId);
    if (!license) {
      return;
    }

    this.applyLicenseStatus(license, request, response);
    await this.checkSeatLimit(license, request, payload.companyId);
  }

  private async fetchActiveLicense(companyId: string) {
    const licenseRows = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.$queryRawUnsafe<
        Array<{
          id: string;
          status: string;
          valid_until: Date;
          grace_days: number;
          max_seats: number;
        }>
      >(
        `SELECT id, status, valid_until, grace_days, max_seats
         FROM licenses
         WHERE company_id = $1::uuid AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        companyId,
      );
    });
    return licenseRows[0];
  }

  private applyLicenseStatus(
    license: { valid_until: Date; grace_days: number },
    request: Request,
    response: Response | undefined,
  ): void {
    const now = Date.now();
    const expiryTime = new Date(license.valid_until).getTime();
    const graceEndTime = expiryTime + (license.grace_days ?? 15) * 86400000;

    if (now <= expiryTime) {
      response?.setHeader?.('X-License-Status', 'ACTIVE');
      return;
    }

    if (now <= graceEndTime) {
      const remainingMs = graceEndTime - now;
      const days = Math.max(1, Math.ceil(remainingMs / 86400000));
      response?.setHeader?.('X-License-Status', 'GRACE');
      response?.setHeader?.('X-License-Grace-Days-Remaining', String(days));
      return;
    }

    this.handleExpiredLicense(request, response);
  }

  private handleExpiredLicense(request: Request, response: Response | undefined): void {
    const isReadOnly =
      ['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase()) ||
      request.path.includes('/export') ||
      request.url.includes('/export');

    if (isReadOnly) {
      response?.setHeader?.('X-License-Status', 'EXPIRED-READ-ONLY');
      return;
    }

    throw new AppException(
      ERROR_CODES.LICENSE_EXPIRED,
      'License has expired and past grace period. Tenant is in read-only mode.',
      {},
      HttpStatus.FORBIDDEN,
    );
  }

  private async checkSeatLimit(
    license: { max_seats: number },
    request: Request,
    companyId: string,
  ): Promise<void> {
    const isCreation =
      request.method.toUpperCase() === 'POST' &&
      (request.path === '/api/v1/users' ||
        request.path === '/users' ||
        request.url.endsWith('/users') ||
        request.url.includes('/users?'));

    if (!isCreation || !license.max_seats) {
      return;
    }

    const rows = await this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.$queryRawUnsafe<Array<{ count: string | number }>>(
        `SELECT COUNT(*)::int as count FROM users WHERE company_id = $1::uuid AND status = 'ACTIVE'`,
        companyId,
      );
    });

    const activeCount = Number(rows[0]?.count ?? 0);
    if (activeCount >= license.max_seats) {
      throw new AppException(
        'MAX_SEATS_EXCEEDED' as unknown as ErrorCode,
        'License seat limit reached. Please upgrade your license to add more users.',
        { maxSeats: license.max_seats, activeUsers: activeCount },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private extractToken(request: Request): string {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }
    return authHeader.substring(7).trim();
  }

  private verifyToken(token: string): JwtAccessTokenPayload {
    try {
      const payload = jwt.verify(
        token,
        this.configService.jwt.accessSecret,
      ) as unknown as JwtAccessTokenPayload;

      if (payload.realm === 'system') {
        throw new ForbiddenException('Super Admin has no access to tenant business data [AT-30]');
      }

      if (!payload.sub || !payload.companyId || !payload.sid) {
        throw new UnauthorizedException('Malformed token payload');
      }

      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private async checkSessionRevocation(payload: JwtAccessTokenPayload): Promise<void> {
    if (this.cacheStore) {
      try {
        const revoked = await this.cacheStore.get(
          `session-revoked:${payload.companyId}:${payload.sid}`,
        );
        if (revoked === '1' || (revoked as unknown) === 1) {
          throw new UnauthorizedException('Session has been revoked');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        this.logger.warn(`Redis session check failed, falling back to database: ${String(err)}`);
      }
    }

    const sessionRows = await this.tenantDb.withCompany(payload.companyId, async (tx) => {
      return tx.$queryRawUnsafe<
        Array<{ revoked_at: Date | null; status: string; company_active: boolean }>
      >(
        `SELECT s.revoked_at, u.status, c.is_active as company_active
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         JOIN companies c ON c.id = s.company_id
         WHERE s.id = $1::uuid AND s.company_id = $2::uuid
         LIMIT 1`,
        payload.sid,
        payload.companyId,
      );
    });

    const sessionRecord = sessionRows[0];
    if (!sessionRecord || sessionRecord.revoked_at !== null) {
      throw new UnauthorizedException('Session is invalid or has been revoked');
    }

    if (sessionRecord.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    if (!sessionRecord.company_active) {
      throw new ForbiddenException('Tenant company is suspended');
    }
  }
}
