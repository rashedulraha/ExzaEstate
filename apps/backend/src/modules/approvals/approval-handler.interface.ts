import type { Approval } from '@prisma/client';
import type { TenantPrisma } from '../../database/tenant-prisma.js';

export interface ApprovalHandler {
  execute(tx: TenantPrisma, approval: Approval): Promise<void>;
}
