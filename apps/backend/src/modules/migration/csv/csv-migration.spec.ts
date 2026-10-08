import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { FieldCryptoService } from '../../../platform/security/field-crypto.service.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { CsvMigrationService } from './csv-migration.service.js';

describe('CSV Migration Import (A9.5 / AT-38)', () => {
  let service: CsvMigrationService;
  let mockTenantDb: Partial<TenantDb>;
  let mockAuditService: Partial<AuditService>;
  let mockSequenceService: Partial<SequenceService>;
  let mockFieldCrypto: Partial<FieldCryptoService>;
  let mockPrisma: {
    customer: { create: ReturnType<typeof vi.fn> };
    property: { create: ReturnType<typeof vi.fn> };
    project: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    lead: { create: ReturnType<typeof vi.fn> };
  };

  const companyId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    mockPrisma = {
      customer: { create: vi.fn().mockResolvedValue({}) },
      property: { create: vi.fn().mockResolvedValue({}) },
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'proj-1' }),
        create: vi.fn().mockResolvedValue({ id: 'proj-1' }),
      },
      lead: { create: vi.fn().mockResolvedValue({}) },
    };

    mockTenantDb = {
      transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma as unknown as TenantPrisma)),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({}),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockReturnValue('CUST-2026-00001'),
    };

    mockFieldCrypto = {
      blindIndex: vi.fn().mockImplementation((v) => `bidx_${v}`),
    };

    service = new CsvMigrationService(
      mockTenantDb as TenantDb,
      mockAuditService as AuditService,
      mockSequenceService as SequenceService,
      mockFieldCrypto as FieldCryptoService,
    );
  });

  it('AT-38: Malformed CSV -> validation report lists row-level errors and NOTHING is imported', async () => {
    // Row 2: missing name
    // Row 3: invalid phone format
    // Row 4: invalid customer_type
    const malformedCsv = `name,phone,email,customer_type
,01711000001,test1@example.com,INDIVIDUAL
John Doe,invalid-phone,test2@example.com,INDIVIDUAL
Jane Doe,+8801711000003,test3@example.com,INVALID_TYPE`;

    // 1. Dry run validation test
    const report = await service.validateCsv(companyId, 'CUSTOMERS', malformedCsv);
    expect(report.isValid).toBe(false);
    expect(report.totalRows).toBe(3);
    expect(report.errorRowsCount).toBe(3);
    expect(report.errors).toHaveLength(3);

    expect(report.errors[0]?.rowNumber).toBe(2);
    expect(report.errors[0]?.field).toBe('name');
    expect(report.errors[0]?.code).toBe('REQUIRED');

    expect(report.errors[1]?.rowNumber).toBe(3);
    expect(report.errors[1]?.field).toBe('phone');
    expect(report.errors[1]?.code).toBe('INVALID_FORMAT');

    expect(report.errors[2]?.rowNumber).toBe(4);
    expect(report.errors[2]?.field).toBe('customer_type');
    expect(report.errors[2]?.code).toBe('INVALID_ENUM');

    // 2. Import invocation must reject and NOT call database create
    await expect(service.importCsv(companyId, userId, 'CUSTOMERS', malformedCsv)).rejects.toThrow(
      BadRequestException,
    );

    // CRITICAL AT-38 ASSERTION: Nothing was imported
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    expect(mockTenantDb.transaction).not.toHaveBeenCalled();
  });

  it('Valid CSV import: all-or-nothing atomicity persists all records when valid', async () => {
    const validCsv = `name,phone,email,customer_type,nid
Rahim Khan,+8801711000010,rahim@example.com,INDIVIDUAL,1990123456789
Karim Ahmed,+8801711000020,karim@example.com,INDIVIDUAL,1990123456780`;

    const result = await service.importCsv(companyId, userId, 'CUSTOMERS', validCsv);

    expect(result.status).toBe('SUCCESS');
    expect(result.importedCount).toBe(2);
    expect(mockPrisma.customer.create).toHaveBeenCalledTimes(2);
    expect(mockAuditService.record).toHaveBeenCalledTimes(1);
  });

  it('Detects duplicate values across rows within the same CSV file', async () => {
    const duplicatePhoneCsv = `name,phone,email
User One,+8801711000099,user1@example.com
User Two,+8801711000099,user2@example.com`;

    const report = await service.validateCsv(companyId, 'CUSTOMERS', duplicatePhoneCsv);
    expect(report.isValid).toBe(false);
    const dupError = report.errors.find((e) => e.code === 'DUPLICATE_ROW');
    expect(dupError).toBeDefined();
    expect(dupError?.rowNumber).toBe(3);
    expect(dupError?.field).toBe('phone');
  });

  it('Enforces double-entry balance check for opening balance migration (RULE-DOUBLE-ENTRY)', async () => {
    // Debits: 50,000, Credits: 40,000 -> Unbalanced by 10,000
    const unbalancedCsv = `account_code,debit_paisa,credit_paisa,narration
1010,50000,0,Cash
2100,0,40000,Payable`;

    const report = await service.validateCsv(companyId, 'OPENING_BALANCES', unbalancedCsv);
    expect(report.isValid).toBe(false);
    expect(report.errors[0]?.code).toBe('UNBALANCED_JOURNAL');
    expect(report.errors[0]?.message).toContain('RULE-DOUBLE-ENTRY');
  });

  it('Returns standard template definition with headers and sample row', () => {
    const template = service.getTemplate('CUSTOMERS');
    expect(template.entity).toBe('CUSTOMERS');
    expect(template.headers).toContain('name');
    expect(template.headers).toContain('phone');
    expect(template.csvContent).toContain('Kazi Nazrul Islam');
  });
});
