import { Prisma } from '@prisma/client';

export interface ProvisionManagingDirectorInput {
  id?: string;
  email: string;
  fullName: string;
  phone?: string;
  password?: string;
  isLocalMode?: boolean;
}

export interface ProvisionCompanyDto {
  companyId?: string;
  name: string;
  code: string;
  timezone?: string;
  branchName?: string;
  branchCode?: string;
  managingDirector: ProvisionManagingDirectorInput;
}

export interface ProvisioningContext {
  companyId: string;
  companyName: string;
  companyCode: string;
  timezone: string;
  branchId?: string;
  branchName?: string;
  branchCode?: string;
  managingDirector: ProvisionManagingDirectorInput;
  state: Map<string, unknown>;
}

export interface ProvisioningResult {
  companyId: string;
  companyCode: string;
  branchId: string;
  managingDirectorUserId: string;
  invitationToken?: string;
}

export interface ProvisioningStep {
  readonly name: string;
  readonly order: number;
  execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void>;
}
