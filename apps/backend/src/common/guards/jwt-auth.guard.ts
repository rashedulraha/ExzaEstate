import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { ClsService } from 'nestjs-cls';
import { ConfigService } from '../../config/config.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CACHE_STORE, type CacheStore } from '../../ports/index.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { UnauthorizedException } from '../exceptions/app.exception.js';

export interface JwtAccessTokenPayload {
  sub: string;
  companyId: string;
  sid: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly clsService: ClsService,
    private readonly prismaService: PrismaService,
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
    const token = this.extractToken(request);
    const payload = this.verifyToken(token);

    await this.checkSessionRevocation(payload);

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

      if (!payload.sub || !payload.companyId || !payload.sid) {
        throw new UnauthorizedException('Malformed token payload');
      }

      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private async checkSessionRevocation(payload: JwtAccessTokenPayload): Promise<void> {
    if (this.cacheStore) {
      try {
        const revoked = await this.cacheStore.get(
          `session-revoked:${payload.companyId}:${payload.sid}`,
        );
        if (revoked === '1') {
          throw new UnauthorizedException('Session has been revoked');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        this.logger.warn(`Redis session check failed, falling back to database: ${String(err)}`);
      }
    }

    const sessionRows = await this.prismaService.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_company_id', ${payload.companyId}, true)`;
      return tx.$queryRawUnsafe<Array<{ revoked_at: Date | null; status: string }>>(
        `SELECT s.revoked_at, u.status
         FROM sessions s
         JOIN users u ON u.id = s.user_id
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
  }
}
