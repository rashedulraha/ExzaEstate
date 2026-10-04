import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import type { ExzaExportBundle } from '../local-data/local-export.service.js';

export interface ImportTenantResult {
  companyId: string;
  companyCode: string;
  status: 'ACTIVE';
  totalTablesImported: number;
  totalRowsImported: number;
  importedAt: string;
}

function safeStringify(data: unknown): string {
  return JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
}

@Injectable()
export class TenantImportService {
  private readonly logger = new Logger(TenantImportService.name);

  constructor(private readonly systemPrisma: SystemPrisma) {}

  /**
   * Imports a standalone .exzaexport bundle into a new Cloud tenant (Task A10.4 / AT-34).
   */
  async importTenant(bundle: ExzaExportBundle, _importedByUserId?: string): Promise<ImportTenantResult> {
    const { manifest, tables } = bundle;
    this.logger.log(`Beginning tenant import for ${manifest.company.name} (${manifest.company.code})`);

    // 1. Checksum verification
    const rawData = safeStringify(tables);
    const computedChecksum = crypto.createHash('sha256').update(rawData).digest('hex');
    if (computedChecksum !== manifest.checksum) {
      throw new BadRequestException('Corrupted export bundle: manifest checksum mismatch');
    }

    // 2. Pre-flight email conflict check
    const users = (tables.users || []) as Array<{ email: string }>;
    const emails = users.map((u) => u.email.toLowerCase().trim()).filter(Boolean);

    await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Check user email conflicts across all tenants before import',
      async (client) => {
        const existingUsers = await client.user.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        });

        if (existingUsers.length > 0) {
          const conflicting = existingUsers.map((u) => u.email);
          this.logger.warn(`Import rejected due to email conflicts: ${conflicting.join(', ')}`);
          throw new ConflictException({
            code: 'TENANT_IMPORT_EMAIL_CONFLICT',
            message: 'One or more user emails already exist on Cloud platform',
            conflicts: conflicting,
          });
        }
      },
    );

    const targetCompanyId = manifest.company.id || crypto.randomUUID();
    let importSucceeded = false;

    try {
      await this.systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: Chunked loader with app.import_mode for Local to Cloud migration',
        async (client) => {
          // Enable session-level import_mode so immutability triggers allow historical posted journals
          await client.$executeRawUnsafe(`SET LOCAL app.import_mode = 'true'`);

          // Step 1: Create company in IMPORTING (inactive) status
          const companyRecord = (tables.companies?.[0] || {}) as Record<string, unknown>;
          await client.company.create({
            data: {
              ...(companyRecord as unknown as Prisma.CompanyCreateInput),
              id: targetCompanyId,
              code: manifest.company.code,
              name: manifest.company.name,
              timezone: manifest.company.timezone || 'Asia/Dhaka',
              isActive: false, // Remains inactive (IMPORTING) during loading
            },
          });

          // Step 2: Load tables in dependency order
          for (const b of tables.branches || []) {
            await client.branch.create({ data: b as unknown as Prisma.BranchCreateInput });
          }
          for (const d of tables.departments || []) {
            await client.department.create({ data: d as unknown as Prisma.DepartmentCreateInput });
          }
          for (const u of tables.users || []) {
            await client.user.create({ data: u as unknown as Prisma.UserCreateInput });
          }
          for (const s of tables.settings || []) {
            await client.companySetting.create({ data: s as unknown as Prisma.CompanySettingCreateInput });
          }
          for (const a of tables.accounts || []) {
            await client.account.create({ data: a as unknown as Prisma.AccountCreateInput });
          }
          for (const prop of tables.properties || []) {
            await client.property.create({ data: prop as unknown as Prisma.PropertyCreateInput });
          }
          for (const cust of tables.customers || []) {
            await client.customer.create({ data: cust as unknown as Prisma.CustomerCreateInput });
          }
          for (const bk of tables.bookings || []) {
            await client.booking.create({ data: bk as unknown as Prisma.BookingCreateInput });
          }
          for (const inst of tables.installments || []) {
            await client.installment.create({ data: inst as unknown as Prisma.InstallmentCreateInput });
          }
          for (const j of tables.journals || []) {
            await client.journal.create({ data: j as unknown as Prisma.JournalCreateInput });
          }
          for (const jl of tables.journalLines || []) {
            await client.journalLine.create({ data: jl as unknown as Prisma.JournalLineCreateInput });
          }
          for (const doc of tables.documents || []) {
            await client.document.create({ data: doc as unknown as Prisma.DocumentCreateInput });
          }

          // Step 3: Sequences continuity
          for (const [seqType, lastNum] of Object.entries(manifest.sequences || {})) {
            const currentFy = String(new Date().getFullYear());
            await client.documentSequence.upsert({
              where: {
                companyId_type_fiscalYear_scopeKey: {
                  companyId: targetCompanyId,
                  type: seqType,
                  fiscalYear: currentFy,
                  scopeKey: 'ALL',
                },
              },
              update: { lastValue: BigInt(lastNum) },
              create: {
                companyId: targetCompanyId,
                type: seqType,
                fiscalYear: currentFy,
                scopeKey: 'ALL',
                lastValue: BigInt(lastNum),
              },
            });
          }

          // Step 4: AT-34 Fidelity Validation Engine
          await this.validateImportFidelity(client, targetCompanyId, manifest);

          // Step 5: Atomic flip to ACTIVE & write IMPORT_COMPLETED audit
          await client.company.update({
            where: { id: targetCompanyId },
            data: { isActive: true },
          });

          await client.auditLog.create({
            data: {
              companyId: targetCompanyId,
              action: 'IMPORT_COMPLETED',
              module: 'system',
              recordType: 'company',
              recordId: targetCompanyId,
              requestId: crypto.randomUUID(),
              newValue: {
                companyCode: manifest.company.code,
                importedAt: new Date().toISOString(),
                trialBalance: manifest.trialBalance,
              },
            },
          });

          importSucceeded = true;
        },
      );
    } catch (err) {
      if (!importSucceeded) {
        this.logger.error(`Import failed! Cleaning up half-built tenant ${targetCompanyId}`, err);
        await this.systemPrisma.executeWithReason(
          '// SYSTEM-SCOPE: Purge incomplete tenant after import validation failure',
          async (client) => {
            await client.documentSequence.deleteMany({ where: { companyId: targetCompanyId } });
            await client.document.deleteMany({ where: { companyId: targetCompanyId } });
            await client.journalLine.deleteMany({ where: { companyId: targetCompanyId } });
            await client.journal.deleteMany({ where: { companyId: targetCompanyId } });
            await client.installment.deleteMany({ where: { companyId: targetCompanyId } });
            await client.booking.deleteMany({ where: { companyId: targetCompanyId } });
            await client.customer.deleteMany({ where: { companyId: targetCompanyId } });
            await client.property.deleteMany({ where: { companyId: targetCompanyId } });
            await client.account.deleteMany({ where: { companyId: targetCompanyId } });
            await client.companySetting.deleteMany({ where: { companyId: targetCompanyId } });
            await client.user.deleteMany({ where: { companyId: targetCompanyId } });
            await client.department.deleteMany({ where: { companyId: targetCompanyId } });
            await client.branch.deleteMany({ where: { companyId: targetCompanyId } });
            await client.company.deleteMany({ where: { id: targetCompanyId } });
          },
        );
      }
      throw err;
    }

    let totalRows = 0;
    for (const rows of Object.values(tables)) {
      totalRows += rows.length;
    }

    this.logger.log(`Tenant import succeeded for company ${manifest.company.code} (${totalRows} rows)`);

    return {
      companyId: targetCompanyId,
      companyCode: manifest.company.code,
      status: 'ACTIVE',
      totalTablesImported: Object.keys(tables).length,
      totalRowsImported: totalRows,
      importedAt: new Date().toISOString(),
    };
  }

  private async validateImportFidelity(
    client: Prisma.TransactionClient,
    companyId: string,
    manifest: ExzaExportBundle['manifest'],
  ): Promise<void> {
    // 1. Trial Balance Validation
    const lines = await client.journalLine.findMany({ where: { companyId } });
    let totalDebit = 0n;
    let totalCredit = 0n;
    for (const line of lines) {
      totalDebit += line.debitPaisa;
      totalCredit += line.creditPaisa;
    }

    if (totalDebit.toString() !== manifest.trialBalance.totalDebitPaisa) {
      throw new BadRequestException(
        `Trial balance debit mismatch: imported ${totalDebit}, manifest ${manifest.trialBalance.totalDebitPaisa}`,
      );
    }
    if (totalCredit.toString() !== manifest.trialBalance.totalCreditPaisa) {
      throw new BadRequestException(
        `Trial balance credit mismatch: imported ${totalCredit}, manifest ${manifest.trialBalance.totalCreditPaisa}`,
      );
    }

    // 2. Inventory Status Validation
    const properties = await client.property.findMany({ where: { companyId } });
    let avail = 0;
    let bkd = 0;
    let sld = 0;
    for (const p of properties) {
      if (p.status === 'AVAILABLE') avail++;
      else if (p.status === 'BOOKED') bkd++;
      else if (p.status === 'SOLD') sld++;
    }

    if (
      properties.length !== manifest.inventoryStatus.totalUnits ||
      avail !== manifest.inventoryStatus.availableUnits ||
      bkd !== manifest.inventoryStatus.bookedUnits ||
      sld !== manifest.inventoryStatus.soldUnits
    ) {
      throw new BadRequestException('Inventory status counts mismatch after import');
    }

    // 3. Document Counts Validation
    const docCount = await client.document.count({ where: { companyId } });
    if (docCount !== manifest.documentCounts.totalDocuments) {
      throw new BadRequestException('Document count mismatch after import');
    }
  }
}
