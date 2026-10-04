import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';

export async function generateBrokerNumber(
  tx: TenantPrisma,
  sequenceService: SequenceService,
): Promise<string> {
  const fiscalYear = new Date().getFullYear().toString();
  const seq = await sequenceService.next(tx, {
    type: 'BROKER',
    fiscalYear,
  });
  return sequenceService.format({
    prefix: 'BRK',
    fiscalYear,
    value: seq,
    padding: 5,
  });
}

export async function generateCommissionNumber(
  tx: TenantPrisma,
  sequenceService: SequenceService,
): Promise<string> {
  const fiscalYear = new Date().getFullYear().toString();
  const seq = await sequenceService.next(tx, {
    type: 'COMMISSION',
    fiscalYear,
  });
  return sequenceService.format({
    prefix: 'COMM',
    fiscalYear,
    value: seq,
    padding: 6,
  });
}
