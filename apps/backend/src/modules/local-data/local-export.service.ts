import crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { SystemPrisma } from '../../database/system-prisma.service.js';

export interface ExzaExportManifest {
  schemaVersion: string;
  exportedAt: string;
  company: {
    id: string;
    code: string;
    name: string;
    timezone: string;
  };
  tableCounts: Record<string, number>;
  checksum: string;
  trialBalance: {
    totalDebitPaisa: string;
    totalCreditPaisa: string;
    accountCount: number;
  };
  perCustomerAr: Array<{
    customerId: string;
    outstandingPaisa: string;
  }>;
  inventoryStatus: {
    totalUnits: number;
    availableUnits: number;
    bookedUnits: number;
    soldUnits: number;
    totalInventoryValuePaisa: string;
  };
  documentCounts: {
    totalDocuments: number;
    totalVersions: number;
  };
  sequences: Record<string, number>;
}

export interface ExzaExportBundle {
  manifest: ExzaExportManifest;
  tables: Record<string, unknown[]>;
  csvData?: Record<string, string>;
}

function safeStringify(data: unknown): string {
  return JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
}

@Injectable()
export class LocalExportService {
  private readonly logger = new Logger(LocalExportService.name);

  constructor(private readonly systemPrisma: SystemPrisma) {}

  /**
   * Generates a complete .exzaexport bundle.
   * Export ALWAYS works even when license is expired or locked (architecture.md §20.5 / §12.8).
   */
  async exportCompanyBundle(targetCompanyId?: string): Promise<ExzaExportBundle> {
    this.logger.log('Starting export bundle generation...');

    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Export company bundle for Local to Cloud migration (AT-34)',
      async (client) => {
        const company = targetCompanyId
          ? await client.company.findUnique({ where: { id: targetCompanyId } })
          : await client.company.findFirst();

        if (!company) {
          throw new Error('No company found to export');
        }

        const companyId = company.id;

        const [
          branches,
          departments,
          users,
          settings,
          accounts,
          journals,
          journalLines,
          properties,
          customers,
          bookings,
          installments,
          documents,
          sequences,
        ] = await Promise.all([
          client.branch.findMany({ where: { companyId } }),
          client.department.findMany({ where: { companyId } }),
          client.user.findMany({ where: { companyId } }),
          client.companySetting.findMany({ where: { companyId } }),
          client.account.findMany({ where: { companyId } }),
          client.journal.findMany({ where: { companyId } }),
          client.journalLine.findMany({ where: { companyId } }),
          client.property.findMany({ where: { companyId } }),
          client.customer.findMany({ where: { companyId } }),
          client.booking.findMany({ where: { companyId } }),
          client.installment.findMany({ where: { companyId } }),
          client.document.findMany({ where: { companyId } }),
          client.documentSequence.findMany({ where: { companyId } }),
        ]);

        // 1. Calculate Trial Balance
        let totalDebitPaisa = 0n;
        let totalCreditPaisa = 0n;
        for (const line of journalLines) {
          totalDebitPaisa += line.debitPaisa;
          totalCreditPaisa += line.creditPaisa;
        }

        // 2. Calculate Per-Customer AR
        const arByCustomer = new Map<string, bigint>();
        for (const booking of bookings) {
          const custId = booking.customerId;
          const current = arByCustomer.get(custId) ?? 0n;
          const outstanding =
            BigInt(booking.totalPricePaisa ?? 0) - BigInt(booking.totalPaidPaisa ?? 0);
          arByCustomer.set(custId, current + (outstanding > 0n ? outstanding : 0n));
        }

        const perCustomerAr = Array.from(arByCustomer.entries()).map(([customerId, amt]) => ({
          customerId,
          outstandingPaisa: amt.toString(),
        }));

        // 3. Calculate Inventory Status
        let availableUnits = 0;
        let bookedUnits = 0;
        let soldUnits = 0;
        let totalInventoryValuePaisa = 0n;

        for (const prop of properties) {
          if (prop.status === 'AVAILABLE') availableUnits++;
          else if (prop.status === 'BOOKED') bookedUnits++;
          else if (prop.status === 'SOLD') soldUnits++;

          totalInventoryValuePaisa += BigInt(prop.basePricePaisa ?? 0);
        }

        // 4. Document Counts
        const totalDocuments = documents.length;
        const totalVersions = documents.reduce((acc, doc) => acc + (doc.currentVersion ?? 1), 0);

        // 5. Sequences
        const sequenceMap: Record<string, number> = {};
        for (const seq of sequences) {
          sequenceMap[seq.type] = Number(seq.lastValue);
        }

        const tables: Record<string, unknown[]> = {
          companies: [company],
          branches,
          departments,
          users,
          settings,
          accounts,
          journals,
          journalLines,
          properties,
          customers,
          bookings,
          installments,
          documents,
          sequences,
        };

        const tableCounts: Record<string, number> = {};
        for (const [table, rows] of Object.entries(tables)) {
          tableCounts[table] = rows.length;
        }

        const rawData = safeStringify(tables);
        const checksum = crypto.createHash('sha256').update(rawData).digest('hex');

        const manifest: ExzaExportManifest = {
          schemaVersion: '1.0.0',
          exportedAt: new Date().toISOString(),
          company: {
            id: company.id,
            code: company.code,
            name: company.name,
            timezone: company.timezone,
          },
          tableCounts,
          checksum,
          trialBalance: {
            totalDebitPaisa: totalDebitPaisa.toString(),
            totalCreditPaisa: totalCreditPaisa.toString(),
            accountCount: accounts.length,
          },
          perCustomerAr,
          inventoryStatus: {
            totalUnits: properties.length,
            availableUnits,
            bookedUnits,
            soldUnits,
            totalInventoryValuePaisa: totalInventoryValuePaisa.toString(),
          },
          documentCounts: {
            totalDocuments,
            totalVersions,
          },
          sequences: sequenceMap,
        };

        // Generate CSV exports for standard entities
        const csvData: Record<string, string> = {
          customers: this.toCsv(customers, ['id', 'fullName', 'phone', 'email', 'status']),
          properties: this.toCsv(properties, ['id', 'unitNumber', 'status', 'basePricePaisa']),
          bookings: this.toCsv(bookings, ['id', 'bookingNumber', 'status', 'totalPricePaisa', 'totalPaidPaisa']),
          accounts: this.toCsv(accounts, ['id', 'code', 'name', 'type', 'currency']),
        };

        this.logger.log(
          `Export bundle created for company ${company.code} with ${properties.length} properties, ${bookings.length} bookings, trial balance: ${totalDebitPaisa}/${totalCreditPaisa}`,
        );

        return {
          manifest,
          tables,
          csvData,
        };
      },
    );
  }

  private toCsv(rows: Array<Record<string, unknown>>, fields: string[]): string {
    if (rows.length === 0) return fields.join(',') + '\n';
    const header = fields.join(',');
    const lines = rows.map((row) =>
      fields
        .map((field) => {
          const val = row[field];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') ? `"${str}"` : str;
        })
        .join(','),
    );
    return [header, ...lines].join('\n');
  }
}
