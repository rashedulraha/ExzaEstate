import { ConflictException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';

export class ApprovalRequiredException extends ConflictException {
  constructor(
    public readonly approvalId: string,
    public readonly approvalNumber?: string,
    message: string = 'Approval is required before this action can take effect',
  ) {
    super({
      code: ERROR_CODES.APPROVAL_REQUIRED,
      message,
      details: { approvalId, approvalNumber, status: 'PENDING' },
    });
  }
}
