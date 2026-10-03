import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../../config/config.service.js';
import { SystemPrisma } from '../../../database/system-prisma.service.js';
import {
  ForbiddenException,
  UnauthorizedException,
} from '../../../common/exceptions/app.exception.js';
import type { SystemAdminPayload } from '../decorators/current-system-admin.decorator.js';

interface SystemTokenPayload {
  sub: string;
  email: string;
  realm: string;
  sid: string;
}

@Injectable()
export class SystemJwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly systemPrisma: SystemPrisma,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { systemAdmin?: SystemAdminPayload }>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('System authentication required');
    }

    const token = authHeader.substring(7).trim();
    let payload: SystemTokenPayload;

    try {
      payload = jwt.verify(
        token,
        this.configService.jwt.accessSecret,
      ) as unknown as SystemTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired system token');
    }

    if (payload.realm !== 'system' || !payload.sub || !payload.sid) {
      throw new ForbiddenException('Access denied: system realm access required');
    }

    const admin = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Verify system admin session and active status',
      async (client) => {
        return client.systemAdmin.findUnique({
          where: { id: payload.sub },
          include: {
            sessions: {
              where: { id: payload.sid, expiresAt: { gt: new Date() } },
            },
          },
        });
      },
    );

    if (!admin || admin.status !== 'ACTIVE' || admin.sessions.length === 0) {
      throw new UnauthorizedException('System session is invalid or has expired');
    }

    request.systemAdmin = {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      sessionId: payload.sid,
    };

    return true;
  }
}
