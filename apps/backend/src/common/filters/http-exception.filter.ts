import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, type ErrorCode } from '@exzaestate/shared';
import { Response } from 'express';
import { ConfigService } from '../../config/config.service.js';
import { AppException } from '../exceptions/app.exception.js';
import { logger } from '../logging/logger.js';
import { RequestWithMetadata } from '../logging/request-logging.middleware.js';

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details: Record<string, unknown>;
  };
}

interface ParsedErrorInfo {
  status: number;
  code: ErrorCode;
  message: string;
  details: Record<string, unknown>;
}

function mapStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ERROR_CODES.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ERROR_CODES.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ERROR_CODES.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ERROR_CODES.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ERROR_CODES.CONFLICT;
    case 423:
      return ERROR_CODES.ACCOUNT_LOCKED;
    case 426:
      return ERROR_CODES.CLIENT_UPGRADE_REQUIRED;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
}

function parseAppException(exception: AppException): ParsedErrorInfo {
  return {
    status: exception.getStatus(),
    code: exception.code,
    message: exception.message,
    details: { ...exception.details },
  };
}

function parseHttpObjectResponse(
  status: number,
  resObj: Record<string, unknown>,
  fallbackMessage: string,
): { code: ErrorCode; message: string; details: Record<string, unknown> } {
  const code =
    typeof resObj.code === 'string' ? (resObj.code as ErrorCode) : mapStatusToErrorCode(status);

  let message = fallbackMessage;
  const details: Record<string, unknown> = {};

  if (Array.isArray(resObj.message)) {
    message = 'Validation failed';
    details.fields = resObj.message;
  } else if (typeof resObj.message === 'string') {
    message = resObj.message;
  }

  if (
    typeof resObj.details === 'object' &&
    resObj.details !== null &&
    !Array.isArray(resObj.details)
  ) {
    Object.assign(details, resObj.details);
  }

  return { code, message, details };
}

function parseHttpException(exception: HttpException): ParsedErrorInfo {
  const status = exception.getStatus();
  const res = exception.getResponse();

  if (typeof res === 'object' && res !== null) {
    const { code, message, details } = parseHttpObjectResponse(
      status,
      res as Record<string, unknown>,
      exception.message,
    );
    return { status, code, message, details };
  }

  if (typeof res === 'string') {
    return {
      status,
      code: mapStatusToErrorCode(status),
      message: res,
      details: {},
    };
  }

  return {
    status,
    code: mapStatusToErrorCode(status),
    message: exception.message,
    details: {},
  };
}

function parseGenericError(exception: Error, isProduction: boolean): ParsedErrorInfo {
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: isProduction ? 'Internal server error' : exception.message || 'Internal server error',
    details: isProduction ? {} : { stack: exception.stack },
  };
}

function resolveErrorInfo(exception: unknown, isProduction: boolean): ParsedErrorInfo {
  if (exception instanceof AppException) {
    return parseAppException(exception);
  }
  if (exception instanceof HttpException) {
    return parseHttpException(exception);
  }
  if (exception instanceof Error) {
    return parseGenericError(exception, isProduction);
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'Internal server error',
    details: {},
  };
}

function resolveRequestId(request: RequestWithMetadata, response: Response): string {
  const requestId = (request.id ??
    request.requestId ??
    (request.headers['x-request-id'] as string) ??
    response.getHeader('X-Request-Id') ??
    'unknown') as string;

  if (!response.getHeader('X-Request-Id')) {
    response.setHeader('X-Request-Id', requestId);
  }

  return requestId;
}

function logErrorInfo(
  status: number,
  code: ErrorCode,
  message: string,
  exception: unknown,
  requestId: string,
  route: string,
): void {
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    logger.error({ err: exception, requestId, status, code, route });
  } else {
    logger.warn({ requestId, status, code, message, route });
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService?: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithMetadata>();

    const requestId = resolveRequestId(request, response);
    const isProduction = this.configService?.isProduction ?? process.env.NODE_ENV === 'production';

    const errorInfo = resolveErrorInfo(exception, isProduction);
    errorInfo.details.requestId = requestId;

    const route = request.originalUrl || request.url;
    logErrorInfo(errorInfo.status, errorInfo.code, errorInfo.message, exception, requestId, route);

    const envelope: ApiErrorEnvelope = {
      success: false,
      error: {
        code: errorInfo.code,
        message: errorInfo.message,
        details: errorInfo.details,
      },
    };

    response.status(errorInfo.status).json(envelope);
  }
}
