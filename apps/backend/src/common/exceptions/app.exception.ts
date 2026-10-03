import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, ERROR_HTTP_STATUS_MAP, type ErrorCode } from '@exzaestate/shared';

export interface AppExceptionResponse {
  code: ErrorCode;
  message: string;
  details: Record<string, unknown>;
}

export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details: Record<string, unknown> = {},
    status?: HttpStatus,
  ) {
    const httpStatus = status ?? ERROR_HTTP_STATUS_MAP[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    super(
      {
        code,
        message,
        details,
      },
      httpStatus,
    );

    this.code = code;
    this.details = details;
  }
}

export class ValidationException extends AppException {
  constructor(message = 'Validation failed', details: Record<string, unknown> = {}) {
    super(ERROR_CODES.VALIDATION_ERROR, message, details);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required', details: Record<string, unknown> = {}) {
    super(ERROR_CODES.UNAUTHORIZED, message, details);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Access forbidden', details: Record<string, unknown> = {}) {
    super(ERROR_CODES.FORBIDDEN, message, details);
  }
}

export class NotFoundException extends AppException {
  constructor(message = 'Resource not found', details: Record<string, unknown> = {}) {
    super(ERROR_CODES.NOT_FOUND, message, details);
  }
}

export class ConflictException extends AppException {
  constructor(message = 'Resource conflict', details: Record<string, unknown> = {}) {
    super(ERROR_CODES.CONFLICT, message, details);
  }
}

export class DuplicateBookingException extends AppException {
  constructor(
    message = 'Property already has an active booking',
    details: Record<string, unknown> = {},
  ) {
    super(ERROR_CODES.DUPLICATE_BOOKING, message, details);
  }
}

export class InvalidStateTransitionException extends AppException {
  constructor(
    message = 'State machine does not allow this transition',
    details: Record<string, unknown> = {},
  ) {
    super(ERROR_CODES.INVALID_STATE_TRANSITION, message, details);
  }
}

export class ApprovalRequiredException extends AppException {
  constructor(
    approvalId: string,
    message = 'Action was not executed; approval request created',
    details: Record<string, unknown> = {},
  ) {
    super(ERROR_CODES.APPROVAL_REQUIRED, message, {
      ...details,
      approvalId,
    });
  }
}

export class InternalErrorException extends AppException {
  constructor(
    message = 'An unexpected internal error occurred',
    details: Record<string, unknown> = {},
  ) {
    super(ERROR_CODES.INTERNAL_ERROR, message, details);
  }
}
