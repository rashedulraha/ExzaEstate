import { Injectable, NestMiddleware } from '@nestjs/common';
import { ERROR_CODES, isClientVersionSupported } from '@exzaestate/shared';
import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '../../config/config.service.js';

@Injectable()
export class ClientVersionMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers['x-client-version'];
    const rawVersion = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!rawVersion || typeof rawVersion !== 'string' || rawVersion.trim() === '') {
      return next();
    }

    const path = req.baseUrl || req.path || req.originalUrl || '';
    // Skip version checks for health probes and API documentation
    if (path.includes('/health') || path.includes('/docs')) {
      return next();
    }

    const minVersion = this.configService.minSupportedClientVersion;
    if (!isClientVersionSupported(rawVersion.trim(), minVersion)) {
      res.status(426).json({
        success: false,
        error: {
          code: ERROR_CODES.CLIENT_UPGRADE_REQUIRED,
          message: `Client version ${rawVersion} is below minimum supported version ${minVersion}. Upgrade required.`,
          details: {
            clientVersion: rawVersion,
            minSupportedClientVersion: minVersion,
          },
        },
      });
      return;
    }

    next();
  }
}
