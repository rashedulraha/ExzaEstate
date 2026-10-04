import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '../../config/config.service.js';

@Injectable()
export class LocalSecretGuard implements CanActivate {
  private readonly logger = new Logger(LocalSecretGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const isLocalMode = this.configService.runtimeMode === 'local';
    const expectedSecret = this.configService.localApiSecret || process.env.LOCAL_API_SECRET;

    // If neither local mode nor a local secret is configured, allow
    if (!isLocalMode && !expectedSecret) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path || request.url;

    // 1. Host Header Loopback Enforcement (DNS-rebinding protection)
    const rawHost = request.headers.host || '';
    const hostname = rawHost.split(':')[0]?.toLowerCase() ?? '';
    const isLoopbackHost =
      hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';

    if (!isLoopbackHost) {
      this.logger.warn(`Rejected request with foreign Host header: "${rawHost}" from IP: ${request.ip}`);
      throw new ForbiddenException({
        code: 'INVALID_HOST_HEADER',
        message: 'Host header must be a loopback address (127.0.0.1 or localhost) in local mode',
      });
    }

    // Health checks can be polled by launcher prior to secret propagation
    if (path.endsWith('/health') || path.endsWith('/health/')) {
      return true;
    }

    // 2. Per-Launch Secret Check (X-Local-Secret)
    if (!expectedSecret) {
      return true;
    }

    const providedSecret = request.headers['x-local-secret'];

    if (!providedSecret) {
      this.logger.warn(`Missing X-Local-Secret on ${request.method} ${path}`);
      throw new ForbiddenException({
        code: 'LOCAL_SECRET_REQUIRED',
        message: 'X-Local-Secret header is required in local standalone mode',
      });
    }

    if (providedSecret !== expectedSecret) {
      this.logger.warn(`Invalid X-Local-Secret provided on ${request.method} ${path}`);
      throw new ForbiddenException({
        code: 'LOCAL_SECRET_INVALID',
        message: 'Invalid local launch secret',
      });
    }

    return true;
  }
}
