import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import type { ExpenseVoucher, ExpenseCategory } from '@prisma/client';
import type { PayExpenseDto } from './dto/index.js';

export async function generateExpenseVoucherNumber(
  tx: TenantPrisma,
  sequenceService: SequenceService,
): Promise<string> {
  const fiscalYear = new Date().getFullYear().toString();
  const seq = await sequenceService.next(tx, {
    type: 'EXPENSE_VOUCHER',
    fiscalYear,
  });
  return sequenceService.format({
    prefix: 'EXP',
    fiscalYear,
    value: seq,
    padding: 6,
  });
}

export function buildExpensePostingPayload(
  voucher: ExpenseVoucher & { category: ExpenseCategory },
  dto?: PayExpenseDto,
) {
  const paymentMethod = dto?.paymentMethod || voucher.paymentMethod || 'BANK_TRANSFER';
  const bankAccountCode = dto?.bankAccountCode || voucher.bankAccountCode || '1020';
  const reference = dto?.reference || voucher.voucherNumber;

  return {
    expenseId: voucher.id,
    amountPaisa: voucher.amountPaisa.toString(),
    expenseAccountCode: voucher.category.accountCode,
    bankAccountCode,
    paymentMethod,
    paidLater: voucher.paidLater,
    vendorId: voucher.vendorId || undefined,
    projectId: voucher.projectId || undefined,
    costCenter: voucher.costCenter || undefined,
    description: voucher.description,
    reference,
    postingDate: new Date().toISOString(),
  };
}
