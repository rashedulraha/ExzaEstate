import { Prisma } from '@prisma/client';

export interface RequestApprovalInput {
  companyId: string;
  requesterId: string;
  type?: string;
  approvalType?: string;
  title?: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  branchId?: string;
  amount?: bigint;
  amountPaisa?: bigint;
  percentage?: number;
  payload?: Prisma.InputJsonValue;
  throwOnRequired?: boolean;
}
