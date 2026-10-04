import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ERROR_CODES, formatMoney } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { PdfRenderer } from '../../../ports/pdf-renderer.port.js';
import { PDF_RENDERER } from '../../../ports/tokens.js';
import {
  ArReconciliationResponseDto,
  CustomerStatementQueryDto,
  CustomerStatementResponseDto,
} from './dto/statement.dto.js';
import {
  buildDateFilter,
  computeAdvanceBalance,
  computeStatementLines,
} from './statement.helper.js';
import { generateCustomerStatementHtml } from './statement.template.js';

@Injectable()
export class StatementService {
  constructor(
    private readonly tenantDb: TenantDb,
    @Optional()
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer?: PdfRenderer,
  ) {}

  async generateCustomerStatement(
    companyId: string,
    customerId: string,
    query: CustomerStatementQueryDto,
  ): Promise<CustomerStatementResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, companyId },
      });

      if (!customer) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Customer with ID "${customerId}" not found`,
        });
      }

      // 1. Calculate opening balance if fromDate is provided
      let openingBalancePaisa = 0n;
      if (query.fromDate) {
        const fromDateObj = new Date(query.fromDate);
        const openingLines = await tx.journalLine.findMany({
          where: {
            companyId,
            partyType: 'CUSTOMER',
            partyId: customerId,
            account: { code: '1100' },
            journal: {
              status: 'Posted',
              postingDate: { lt: fromDateObj },
            },
          },
          select: { debitPaisa: true, creditPaisa: true },
        });

        for (const line of openingLines) {
          openingBalancePaisa += line.debitPaisa - line.creditPaisa;
        }
      }

      // 2. Fetch period journal lines
      const dateFilter = buildDateFilter(query.fromDate, query.toDate);

      const lines = await tx.journalLine.findMany({
        where: {
          companyId,
          partyType: 'CUSTOMER',
          partyId: customerId,
          account: { code: '1100' },
          journal: {
            status: 'Posted',
            ...(dateFilter ? { postingDate: dateFilter } : {}),
            ...(query.bookingId ? { sourceDocumentId: query.bookingId } : {}),
          },
        },
        include: {
          journal: true,
        },
        orderBy: [
          { journal: { postingDate: 'asc' } },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      });

      const {
        statementLines,
        totalDebits,
        totalCredits,
        closingOutstandingPaisa,
      } = computeStatementLines(lines, openingBalancePaisa);

      // 3. Compute Customer Advance Balance (Account 2200, Credit normal)
      const advanceLines = await tx.journalLine.findMany({
        where: {
          companyId,
          partyType: 'CUSTOMER',
          partyId: customerId,
          account: { code: '2200' },
          journal: { status: 'Posted' },
        },
        select: { debitPaisa: true, creditPaisa: true },
      });

      const customerAdvancePaisa = computeAdvanceBalance(advanceLines);

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        fromDate: query.fromDate,
        toDate: query.toDate,
        openingBalancePaisa: openingBalancePaisa.toString(),
        totalDebitsPaisa: totalDebits.toString(),
        totalCreditsPaisa: totalCredits.toString(),
        closingOutstandingPaisa: closingOutstandingPaisa.toString(),
        customerAdvancePaisa: customerAdvancePaisa.toString(),
        formattedOpeningBalance: formatMoney(openingBalancePaisa),
        formattedTotalDebits: formatMoney(totalDebits),
        formattedTotalCredits: formatMoney(totalCredits),
        formattedClosingOutstanding: formatMoney(closingOutstandingPaisa),
        formattedCustomerAdvance: formatMoney(customerAdvancePaisa),
        lines: statementLines,
      };

    });
  }

  async reconcileCustomerAr(
    companyId: string,
    customerId: string,
  ): Promise<ArReconciliationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      // 1. Customer statement outstanding (net of all 1100 journal lines)
      const arLines = await tx.journalLine.findMany({
        where: {
          companyId,
          partyType: 'CUSTOMER',
          partyId: customerId,
          account: { code: '1100' },
          journal: { status: 'Posted' },
        },
        select: { debitPaisa: true, creditPaisa: true },
      });

      let arBalance = 0n;
      for (const l of arLines) {
        arBalance += l.debitPaisa - l.creditPaisa;
      }

      // 2. AR Aging total: Sum of remainingAmountPaisa from all active installments for this customer's bookings
      const bookings = await tx.booking.findMany({
        where: { companyId, customerId, status: { notIn: ['Cancelled', 'Rejected'] } },
        select: { id: true },
      });
      const bookingIds = bookings.map((b) => b.id);

      let agingTotal = 0n;
      if (bookingIds.length > 0) {
        const installments = await tx.installment.findMany({
          where: {
            companyId,
            bookingId: { in: bookingIds },
            paymentState: { in: ['Unpaid', 'Partially Paid'] },
          },
          select: { remainingAmountPaisa: true },
        });
        for (const inst of installments) {
          agingTotal += inst.remainingAmountPaisa;
        }
      }

      const diff = arBalance >= agingTotal ? arBalance - agingTotal : agingTotal - arBalance;

      return {
        customerId,
        statementOutstandingPaisa: arBalance.toString(),
        statementOutstandingFormatted: formatMoney(arBalance),
        arLedgerBalancePaisa: arBalance.toString(),
        arLedgerBalanceFormatted: formatMoney(arBalance),
        arAgingTotalPaisa: agingTotal.toString(),
        arAgingTotalFormatted: formatMoney(agingTotal),
        differencePaisa: diff.toString(),
        isReconciled: diff === 0n,
      };
    });
  }

  async generateStatementPdf(
    companyId: string,
    customerId: string,
    query: CustomerStatementQueryDto,
  ): Promise<Buffer> {
    const statement = await this.generateCustomerStatement(companyId, customerId, query);
    const html = generateCustomerStatementHtml(statement);

    if (this.pdfRenderer) {
      return this.pdfRenderer.render(html, {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm',
        },
      });
    }

    return Buffer.from(html, 'utf-8');
  }
}
