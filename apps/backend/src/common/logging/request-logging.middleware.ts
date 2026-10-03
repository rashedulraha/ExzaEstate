import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { generateRequestId, logger } from './logger.js';

export interface RequestWithMetadata extends Request {
  id?: string;
  requestId?: string;
  user?: {
    id?: string;
    userId?: string;
    companyId?: string;
  };
}

export function requestIdMiddleware(
  req: RequestWithMetadata,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const existingId = req.headers['x-request-id'];
  const requestId =
    typeof existingId === 'string' && existingId.trim().length > 0
      ? existingId
      : generateRequestId();

  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const companyId = req.user?.companyId ?? null;
    const userId = req.user?.userId ?? req.user?.id ?? null;
    const route = req.originalUrl || req.url;
    const status = res.statusCode;

    logger.info({
      requestId,
      companyId,
      userId,
      route,
      status,
      durationMs,
    });
  });

  next();
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: RequestWithMetadata, res: Response, next: NextFunction): void {
    requestIdMiddleware(req, res, next);
  }
}
