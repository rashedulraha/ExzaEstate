import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';

export class FileRejectedException extends AppException {
  constructor(
    message = 'File upload was rejected due to invalid MIME type or size limit',
    details: Record<string, unknown> = {},
  ) {
    super(ERROR_CODES.FILE_REJECTED, message, details);
  }
}
