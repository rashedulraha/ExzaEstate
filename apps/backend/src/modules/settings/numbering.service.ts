import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import { SettingsService } from './settings.service.js';
import { UpdateNumberingPatternDto } from './dto/numbering.dto.js';
import {
  DEFAULT_NUMBERING_PATTERNS,
  formatPattern,
  resolveEffectiveConfig,
  resolveFiscalYearString,
  resolveScopeKey,
  validatePatternTokens,
} from './domain/numbering-formatter.js';

export {
  DEFAULT_NUMBERING_PATTERNS,
  type NumberingPatternDef,
  formatPattern,
} from './domain/numbering-formatter.js';

export interface GenerateNextParams {
  documentType: string;
  branchCode?: string;
  projectCode?: string;
  date?: Date;
}

export interface PreviewParams {
  documentType: string;
  pattern?: string;
  prefix?: string;
  branchCode?: string;
  projectCode?: string;
  year?: string;
  sampleSeq?: number;
}

@Injectable()
export class NumberingService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly sequenceService: SequenceService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Lists all configured numbering patterns merged with defaults.
   */
  async listPatterns() {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const records = await tx.numberingPattern.findMany({
        where: { companyId },
        orderBy: { documentType: 'asc' },
      });

      const dbMap = new Map(records.map((r) => [r.documentType, r]));

      return Object.keys(DEFAULT_NUMBERING_PATTERNS).map((type) => {
        const defaultDef = DEFAULT_NUMBERING_PATTERNS[type]!;
        const dbRecord = dbMap.get(type);

        if (dbRecord) {
          return {
            id: dbRecord.id,
            documentType: dbRecord.documentType,
            prefix: dbRecord.prefix,
            pattern: dbRecord.pattern,
            resetRule: dbRecord.resetRule,
            currentSequence: dbRecord.currentSequence,
            isActive: dbRecord.isActive,
            isConfigured: true,
            createdAt: dbRecord.createdAt,
            updatedAt: dbRecord.updatedAt,
          };
        }

        return {
          id: null,
          documentType: defaultDef.documentType,
          prefix: defaultDef.prefix,
          pattern: defaultDef.pattern,
          resetRule: defaultDef.resetRule,
          currentSequence: 0,
          isActive: true,
          isConfigured: false,
          createdAt: null,
          updatedAt: null,
        };
      });
    });
  }

  /**
   * Gets pattern configuration for a specific document type.
   */
  async getPattern(documentType: string) {
    const normType = documentType.toUpperCase();
    const defaultDef = DEFAULT_NUMBERING_PATTERNS[normType];
    if (!defaultDef) {
      throw new AppException(ERROR_CODES.NOT_FOUND, `Unknown document type: "${normType}"`);
    }

    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const dbRecord = await tx.numberingPattern.findUnique({
        where: {
          companyId_documentType: { companyId, documentType: normType },
        },
      });

      if (dbRecord) {
        return {
          id: dbRecord.id,
          documentType: dbRecord.documentType,
          prefix: dbRecord.prefix,
          pattern: dbRecord.pattern,
          resetRule: dbRecord.resetRule,
          currentSequence: dbRecord.currentSequence,
          isActive: dbRecord.isActive,
          isConfigured: true,
          createdAt: dbRecord.createdAt,
          updatedAt: dbRecord.updatedAt,
        };
      }

      return {
        id: null,
        documentType: defaultDef.documentType,
        prefix: defaultDef.prefix,
        pattern: defaultDef.pattern,
        resetRule: defaultDef.resetRule,
        currentSequence: 0,
        isActive: true,
        isConfigured: false,
        createdAt: null,
        updatedAt: null,
      };
    });
  }

  /**
   * Updates a numbering pattern for a document type.
   * Traps Check: Prevents editing a pattern that has already issued numbers without a confirmed new series.
   */
  async updatePattern(documentType: string, dto: UpdateNumberingPatternDto) {
    const normType = documentType.toUpperCase();
    const defaultDef = DEFAULT_NUMBERING_PATTERNS[normType];
    if (!defaultDef) {
      throw new AppException(ERROR_CODES.NOT_FOUND, `Unknown document type: "${normType}"`);
    }

    if (dto.pattern) {
      validatePatternTokens(dto.pattern);
    }

    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const existing = await tx.numberingPattern.findUnique({
        where: {
          companyId_documentType: { companyId, documentType: normType },
        },
      });

      const currentSeq = existing ? existing.currentSequence : 0;
      const currentPattern = existing ? existing.pattern : defaultDef.pattern;
      const currentPrefix = existing ? existing.prefix : defaultDef.prefix;

      this.assertSeriesChangeAllowed(currentSeq, currentPattern, currentPrefix, dto);

      const updated = await tx.numberingPattern.upsert({
        where: {
          companyId_documentType: { companyId, documentType: normType },
        },
        update: {
          pattern: dto.pattern,
          prefix: dto.prefix,
          resetRule: dto.resetRule,
          isActive: dto.isActive,
        },
        create: {
          companyId,
          documentType: normType,
          prefix: dto.prefix ?? defaultDef.prefix,
          pattern: dto.pattern ?? defaultDef.pattern,
          resetRule: dto.resetRule ?? defaultDef.resetRule,
          isActive: dto.isActive ?? true,
          currentSequence: 0,
        },
      });

      await this.auditService.record(tx, {
        action: 'NUMBERING_PATTERN_UPDATED',
        module: 'numbering',
        entity: 'numbering_pattern',
        entityId: updated.id,
        before: {
          pattern: currentPattern,
          prefix: currentPrefix,
          resetRule: existing?.resetRule ?? defaultDef.resetRule,
        },
        after: {
          pattern: updated.pattern,
          prefix: updated.prefix,
          resetRule: updated.resetRule,
        },
      });

      return updated;
    });
  }

  private assertSeriesChangeAllowed(
    currentSeq: number,
    currentPattern: string,
    currentPrefix: string,
    dto: UpdateNumberingPatternDto,
  ): void {
    const patternChanged = Boolean(dto.pattern && dto.pattern !== currentPattern);
    const prefixChanged = Boolean(dto.prefix && dto.prefix !== currentPrefix);

    if (currentSeq > 0 && (patternChanged || prefixChanged) && !dto.confirmSeriesChange) {
      throw new AppException(
        ERROR_CODES.CONFLICT,
        'Cannot alter numbering pattern or prefix on an active series that has already issued numbers without confirmSeriesChange: true',
      );
    }
  }

  /**
   * Previews a formatted numbering pattern without consuming a sequence number.
   */
  async preview(params: PreviewParams) {
    const normType = params.documentType.toUpperCase();
    const defaultDef = DEFAULT_NUMBERING_PATTERNS[normType] ?? {
      documentType: normType,
      prefix: 'DOC',
      pattern: '{PREFIX}-{BRANCH}-{YEAR}-{SEQ:6}',
      resetRule: 'YEARLY' as const,
    };
    const cfg = resolveEffectiveConfig(defaultDef, params);

    const sampleSeq = params.sampleSeq ?? 1;
    const year = params.year ?? String(new Date().getFullYear());
    const formatted = formatPattern(cfg.pattern, {
      prefix: cfg.prefix,
      branchCode: params.branchCode ?? 'DHK',
      projectCode: params.projectCode ?? 'PRJ01',
      year,
      twoDigitYear: year.slice(-2),
      sequence: sampleSeq,
    });

    return {
      documentType: normType,
      pattern: cfg.pattern,
      prefix: cfg.prefix,
      sampleSeq,
      formatted,
    };
  }

  /**
   * Generates the next gapless sequential number inside the caller's transaction.
   */
  async generateNext(tx: TenantPrisma, params: GenerateNextParams): Promise<string> {
    const normType = params.documentType.toUpperCase();
    const defaultDef = DEFAULT_NUMBERING_PATTERNS[normType];
    if (!defaultDef) {
      throw new AppException(ERROR_CODES.NOT_FOUND, `Unknown document type: "${normType}"`);
    }

    const patternRecord = await tx.numberingPattern.findUnique({
      where: {
        companyId_documentType: { companyId: tx.currentCompanyId, documentType: normType },
      },
    });

    const cfg = resolveEffectiveConfig(defaultDef, patternRecord);
    const date = params.date ?? new Date();
    const startMonth = await this.resolveStartMonth(tx, cfg.resetRule);
    const fiscalYearStr = resolveFiscalYearString(date, cfg.resetRule, startMonth);
    const scopeKey = resolveScopeKey(cfg.pattern, params.branchCode);

    const seqNumber = await this.sequenceService.next(tx, {
      type: normType,
      fiscalYear: fiscalYearStr,
      scopeKey,
    });

    await tx.numberingPattern.upsert({
      where: {
        companyId_documentType: { companyId: tx.currentCompanyId, documentType: normType },
      },
      update: {
        currentSequence: Number(seqNumber),
      },
      create: {
        companyId: tx.currentCompanyId,
        documentType: normType,
        prefix: cfg.prefix,
        pattern: cfg.pattern,
        resetRule: cfg.resetRule,
        currentSequence: Number(seqNumber),
        isActive: true,
      },
    });

    return formatPattern(cfg.pattern, {
      prefix: cfg.prefix,
      branchCode: params.branchCode,
      projectCode: params.projectCode,
      year: String(date.getFullYear()),
      twoDigitYear: String(date.getFullYear()).slice(-2),
      sequence: seqNumber,
    });
  }

  private async resolveStartMonth(tx: TenantPrisma, resetRule: string): Promise<number> {
    if (resetRule !== 'FISCAL_YEARLY') {
      return 7;
    }
    const setting = await tx.companySetting.findUnique({
      where: {
        companyId_key: { companyId: tx.currentCompanyId, key: 'fiscal_year_start_month' },
      },
    });
    return typeof setting?.value === 'number' ? setting.value : 7;
  }
}
