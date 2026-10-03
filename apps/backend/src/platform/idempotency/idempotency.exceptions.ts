import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';

export class IdempotencyKeyReusedException extends AppException {
  constructor(
    message = 'Idempotency key reused with different request payload',
    details: Record<string, unknown> = {},
  ) {
    super(ERROR_CODES.IDEMPOTENCY_KEY_REUSED, message, details);
  }
}

export class RequestInProgressException extends AppException {
  constructor(
    message = 'A request with this idempotency key is already in progress',
    details: Record<string, unknown> = {},
  ) {
    super(ERROR_CODES.REQUEST_IN_PROGRESS, message, details);
  }
}
