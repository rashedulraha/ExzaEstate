import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ERROR_CODES, amountToWords, formatMoney } from '@exzaestate/shared';
import type { Prisma, Receipt } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { PDF_RENDERER, type PdfRenderer } from '../../../ports/index.js';
import type { QueryReceiptsDto, ReceiptResponseDto } from './dto/receipt-response.dto.js';
import { renderReceiptHtml, type ReceiptTemplateData } from './templates/receipt.template.js';

function getReceiptWatermark(
  isVoid: boolean,
  isReprint: boolean,
  reprintCount: number,
): string | null {
  if (isVoid) return 'VOID';
  if (isReprint || reprintCount > 0) return 'DUPLICATE COPY';
  return null;
}

function toReceiptDto(record: Receipt, isReprint = false): ReceiptResponseDto {
  return {
    id: record.id,
    companyId: record.companyId,
    receiptNumber: record.receiptNumber,
    paymentId: record.paymentId,
    bookingId: record.bookingId,
    customerId: record.customerId,
    propertyId: record.propertyId,
    projectId: record.projectId,
    amountPaisa: record.amountPaisa.toString(),
    amountFormatted: formatMoney(record.amountPaisa),
    amountInWords: record.amountInWords,
    previousDuePaisa: record.previousDuePaisa.toString(),
    previousDueFormatted: formatMoney(record.previousDuePaisa),
    currentDuePaisa: record.currentDuePaisa.toString(),
    currentDueFormatted: formatMoney(record.currentDuePaisa),
    paymentMethod: record.paymentMethod,
    isVoid: record.isVoid,
    voidReason: record.voidReason,
    voidedAt: record.voidedAt ? record.voidedAt.toISOString() : null,
    voidedById: record.voidedById,
    reprintCount: record.reprintCount,
    watermark: getReceiptWatermark(record.isVoid, isReprint, record.reprintCount),
    issuedAt: record.issuedAt.toISOString(),
    issuedById: record.issuedById,
    createdAt: record.createdAt.toISOString(),
  };
}

@Injectable()
export class ReceiptService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer?: PdfRenderer,
  ) {}

  async generateReceiptPdf(
    companyId: string,
    receiptId: string,
    lang: 'en' | 'bn' = 'en',
  ): Promise<Buffer> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const record = await tx.receipt.findFirst({
        where: { id: receiptId, companyId },
        include: {
          customer: true,
        },
      });

      if (!record) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Receipt "${receiptId}" not found`,
        });
      }

      let companyName = 'ExzaEstate';
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      if (company?.name) {
        companyName = company.name;
      }

      let propertyCode = 'Property';
      if (record.propertyId) {
        const prop = await tx.property.findUnique({
          where: { id: record.propertyId },
          select: { code: true },
        });
        if (prop) {
          propertyCode = prop.code;
        }
      }

      let projectName = 'Project';
      if (record.projectId) {
        const proj = await tx.project.findUnique({
          where: { id: record.projectId },
          select: { name: true },
        });
        if (proj) {
          projectName = proj.name;
        }
      }

      const inWords =
        lang === 'bn' ? amountToWords(record.amountPaisa, 'bn') : record.amountInWords;

      const templateData: ReceiptTemplateData = {
        receiptNumber: record.receiptNumber,
        companyName,
        customerName: record.customer?.name ?? 'Customer',
        customerPhone: record.customer?.phone ?? null,
        projectName,
        propertyCode,
        amountPaisa: record.amountPaisa,
        amountFormatted: formatMoney(record.amountPaisa),
        amountInWords: inWords,
        previousDueFormatted: formatMoney(record.previousDuePaisa),
        currentDueFormatted: formatMoney(record.currentDuePaisa),
        paymentMethod: record.paymentMethod,
        issuedAt: record.issuedAt.toISOString().split('T')[0] ?? '',
        watermark: getReceiptWatermark(record.isVoid, false, record.reprintCount),
      };

      const html = renderReceiptHtml(templateData, lang);
      if (this.pdfRenderer) {
        return this.pdfRenderer.render(html);
      }
      return Buffer.from(html, 'utf-8');
    });
  }

  async getReceiptById(companyId: string, receiptId: string): Promise<ReceiptResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const record = await tx.receipt.findFirst({
        where: { id: receiptId, companyId },
      });

      if (!record) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Receipt "${receiptId}" not found`,
        });
      }

      return toReceiptDto(record);
    });
  }

  async reprintReceipt(
    companyId: string,
    userId: string,
    receiptId: string,
  ): Promise<ReceiptResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.receipt.findFirst({
        where: { id: receiptId, companyId },
      });

      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Receipt "${receiptId}" not found`,
        });
      }

      const updated = await tx.receipt.update({
        where: { id: receiptId },
        data: {
          reprintCount: { increment: 1 },
        },
      });

      await this.auditService.record(tx, {
        action: 'RECEIPT_REPRINTED',
        module: 'collection',
        recordType: 'Receipt',
        recordId: receiptId,
        after: {
          reprintCount: updated.reprintCount,
          receiptNumber: updated.receiptNumber,
          reprintedById: userId,
        },
      });

      return toReceiptDto(updated, true);
    });
  }

  async listReceipts(
    companyId: string,
    query: QueryReceiptsDto,
  ): Promise<{ items: ReceiptResponseDto[]; total: number; page: number; limit: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);
      const skip = (page - 1) * limit;

      const where: Prisma.ReceiptWhereInput = {
        companyId,
        ...(query.bookingId ? { bookingId: query.bookingId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.isVoid !== undefined ? { isVoid: query.isVoid } : {}),
        ...(query.search
          ? { receiptNumber: { contains: query.search.trim(), mode: 'insensitive' } }
          : {}),
      };

      const [records, total] = await Promise.all([
        tx.receipt.findMany({
          where,
          orderBy: { issuedAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.receipt.count({ where }),
      ]);

      return {
        items: records.map((r) => toReceiptDto(r)),
        total,
        page,
        limit,
      };
    });
  }
}
