import type { Payment } from '@prisma/client';
import { formatMoney } from '@exzaestate/shared';
import type { PaymentResponseDto } from './dto/payment-response.dto.js';

export function mapPaymentToDto(payment: Payment): PaymentResponseDto {
  const chequeDateStr = payment.chequeDate ? payment.chequeDate.toISOString().split('T')[0] : null;
  const paymentDateStr =
    payment.paymentDate instanceof Date
      ? payment.paymentDate.toISOString().split('T')[0]
      : String(payment.paymentDate);

  return {
    id: payment.id,
    companyId: payment.companyId,
    paymentNumber: payment.paymentNumber,
    bookingId: payment.bookingId,
    customerId: payment.customerId,
    propertyId: payment.propertyId,
    projectId: payment.projectId,
    amountPaisa: payment.amountPaisa.toString(),
    formattedAmount: formatMoney(payment.amountPaisa),
    paymentType: payment.paymentType,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    isDraft: payment.isDraft,
    bankName: payment.bankName,
    bankBranch: payment.bankBranch,
    accountNumber: payment.accountNumber,
    chequeNumber: payment.chequeNumber,
    chequeDate: chequeDateStr,
    chequeStatus: payment.chequeStatus,
    transactionReference: payment.transactionReference,
    cardType: payment.cardType,
    cardLast4: payment.cardLast4,
    posTerminalId: payment.posTerminalId,
    allocationTarget: payment.allocationTarget,
    targetInstallmentId: payment.targetInstallmentId,
    receiptId: payment.receiptId,
    journalId: payment.journalId,
    paymentDate: paymentDateStr ?? new Date().toISOString().split('T')[0]!,
    receivedAt: payment.receivedAt ? payment.receivedAt.toISOString() : null,
    postedAt: payment.postedAt ? payment.postedAt.toISOString() : null,
    postedById: payment.postedById,
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString(),
    createdById: payment.createdById,
  };
}
