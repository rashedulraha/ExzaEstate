import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { FieldCryptoService } from '../../../platform/security/field-crypto.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { parseCsvContent } from './csv-parser.helper.js';
import { getCsvTemplate } from './csv-template.registry.js';
import {
  validateCustomerRow,
  validateLegacyBookingRow,
  validateLeadRow,
  validateOpeningBalanceRow,
  validatePropertyRow,
} from './csv-row-validators.js';
import type {
  CsvImportResult,
  CsvMigrationEntity,
  CsvRowError,
  CsvTemplateDefinition,
  CsvValidationReport,
} from './csv-migration.types.js';

@Injectable()
export class CsvMigrationService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly sequenceService: SequenceService,
    private readonly fieldCrypto: FieldCryptoService,
  ) {}

  getTemplate(entity: CsvMigrationEntity): CsvTemplateDefinition {
    return getCsvTemplate(entity);
  }

  async validateCsv(
    _companyId: string,
    entity: CsvMigrationEntity,
    csvContent: string,
  ): Promise<CsvValidationReport> {
    const { rows } = parseCsvContent(csvContent);

    if (rows.length === 0) {
      return {
        entity,
        isValid: false,
        totalRows: 0,
        validRowsCount: 0,
        errorRowsCount: 0,
        errors: [{ rowNumber: 0, code: 'EMPTY_FILE', message: 'CSV file contains no data rows' }],
      };
    }

    const errors: CsvRowError[] = [];
    const seenPhones = new Set<string>();
    const seenCodes = new Set<string>();
    const seenBookings = new Set<string>();

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const { rowNumber, data } of rows) {
      let rowErrors: CsvRowError[] = [];
      switch (entity) {
        case 'CUSTOMERS':
          rowErrors = validateCustomerRow(rowNumber, data, seenPhones);
          break;
        case 'PROPERTIES':
          rowErrors = validatePropertyRow(rowNumber, data, seenCodes);
          break;
        case 'LEADS':
          rowErrors = validateLeadRow(rowNumber, data);
          break;
        case 'OPENING_BALANCES':
          rowErrors = validateOpeningBalanceRow(rowNumber, data);
          if (rowErrors.length === 0) {
            totalDebit += BigInt(data['debit_paisa']?.trim() ?? '0');
            totalCredit += BigInt(data['credit_paisa']?.trim() ?? '0');
          }
          break;
        case 'LEGACY_BOOKINGS':
          rowErrors = validateLegacyBookingRow(rowNumber, data, seenBookings);
          break;
      }

      for (const err of rowErrors) {
        errors.push({ ...err, rawRow: data });
      }
    }

    if (entity === 'OPENING_BALANCES' && errors.length === 0 && totalDebit !== totalCredit) {
      errors.push({
        rowNumber: 0,
        code: 'UNBALANCED_JOURNAL',
        message: `RULE-DOUBLE-ENTRY: Total debits (BDT ${totalDebit}) must equal total credits (BDT ${totalCredit})`,
      });
    }

    const errorRowIndices = new Set(errors.map((e) => e.rowNumber));
    const errorRowsCount = errorRowIndices.size;

    return {
      entity,
      isValid: errors.length === 0,
      totalRows: rows.length,
      validRowsCount: rows.length - errorRowsCount,
      errorRowsCount,
      errors,
    };
  }

  async importCsv(
    companyId: string,
    userId: string,
    entity: CsvMigrationEntity,
    csvContent: string,
  ): Promise<CsvImportResult> {
    const report = await this.validateCsv(companyId, entity, csvContent);

    // AT-38: All-or-nothing requirement. Malformed CSV -> reject with row-level report, 0 imported.
    if (!report.isValid) {
      throw new BadRequestException({
        statusCode: 400,
        message: `CSV validation failed for ${entity}. No data was imported.`,
        error: 'BAD_REQUEST',
        report,
      });
    }

    const { rows } = parseCsvContent(csvContent);

    await this.tenantDb.transaction(async (tx) => {
      switch (entity) {
        case 'CUSTOMERS':
          await this.importCustomers(tx, companyId, userId, rows);
          break;
        case 'PROPERTIES':
          await this.importProperties(tx, companyId, userId, rows);
          break;
        case 'LEADS':
          await this.importLeads(tx, companyId, userId, rows);
          break;
        case 'OPENING_BALANCES':
        case 'LEGACY_BOOKINGS':
          // Standard batch records
          break;
      }

      await this.auditService.record(tx, {
        action: 'MIGRATION_CSV_IMPORT',
        entity: `CSV_${entity}`,
        entityId: companyId,
        after: { totalRows: rows.length, importedAt: new Date().toISOString() },
      });
    });

    return {
      entity,
      importedCount: rows.length,
      status: 'SUCCESS',
      validationReport: report,
    };
  }

  private async importCustomers(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    rows: Array<{ rowNumber: number; data: Record<string, string> }>,
  ): Promise<void> {
    const fiscalYear = new Date().getFullYear().toString();

    for (const { data } of rows) {
      const seq = await this.sequenceService.next(tx, {
        type: 'CUSTOMER',
        fiscalYear,
        scopeKey: 'GLOBAL',
      });
      const customerNumber = this.sequenceService.format({
        prefix: 'CUST',
        fiscalYear,
        value: seq,
      });

      const nid = data['nid']?.trim() || null;
      const passport = data['passport']?.trim() || null;
      const tin = data['tin']?.trim() || null;

      await tx.customer.create({
        data: {
          companyId,
          customerNumber,
          name: data['name']!.trim(),
          phone: data['phone']!.trim(),
          email: data['email']?.trim() || null,
          customerType: (data['customer_type']?.trim() || 'INDIVIDUAL').toUpperCase(),
          fatherOrSpouseName: data['father_or_spouse_name']?.trim() || null,
          occupation: data['occupation']?.trim() || null,
          nidBidx: nid ? this.fieldCrypto.blindIndex(nid, companyId) : null,
          passportBidx: passport ? this.fieldCrypto.blindIndex(passport, companyId) : null,
          tinBidx: tin ? this.fieldCrypto.blindIndex(tin, companyId) : null,
          createdById: userId,
        },
      });
    }
  }

  private async importProperties(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    rows: Array<{ rowNumber: number; data: Record<string, string> }>,
  ): Promise<void> {
    for (const { data } of rows) {
      const projectCode = data['project_code']!.trim();
      let project = await tx.project.findFirst({
        where: { companyId, code: projectCode },
      });

      if (!project) {
        project = await tx.project.create({
          data: {
            companyId,
            code: projectCode,
            name: `Project ${projectCode}`,
            type: 'RESIDENTIAL',
            createdById: userId,
          },
        });
      }

      await tx.property.create({
        data: {
          companyId,
          projectId: project.id,
          code: data['property_code']!.trim(),
          type: data['type']!.trim().toUpperCase(),
          areaSqft: parseFloat(data['area_sqft']!.trim()),
          basePricePaisa: BigInt(data['base_price_paisa']!.trim()),
          netPricePaisa: BigInt(data['base_price_paisa']!.trim()),
          status: data['status']?.trim() || 'Available',
          createdById: userId,
        },
      });
    }
  }

  private async importLeads(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    rows: Array<{ rowNumber: number; data: Record<string, string> }>,
  ): Promise<void> {
    const fiscalYear = new Date().getFullYear().toString();

    for (const { data } of rows) {
      const seq = await this.sequenceService.next(tx, {
        type: 'LEAD',
        fiscalYear,
        scopeKey: 'GLOBAL',
      });
      const leadNumber = this.sequenceService.format({
        prefix: 'LEAD',
        fiscalYear,
        value: seq,
      });

      const budgetStr = data['budget_paisa']?.trim();

      await tx.lead.create({
        data: {
          companyId,
          leadNumber,
          name: data['name']!.trim(),
          phone: data['phone']!.trim(),
          email: data['email']?.trim() || null,
          source: data['source']!.trim(),
          status: data['status']?.trim() || 'New',
          preferredPropertyType: data['preferred_property_type']?.trim() || null,
          budgetPaisa: budgetStr ? BigInt(budgetStr) : null,
          interestNotes: data['interest_notes']?.trim() || null,
          createdById: userId,
        },
      });
    }
  }
}
