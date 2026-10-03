import { Prisma } from '@prisma/client';

export interface DemoSeedContext {
  companyId: string;
  companyCode: string;
  branchId: string;
  state: Map<string, unknown>;
}

export interface DemoSeedStep {
  readonly name: string;
  readonly order: number;
  execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void>;
}
