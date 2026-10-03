import { Injectable } from '@nestjs/common';
import type { TenantPrisma } from '../../database/tenant-prisma.js';

export interface SequenceNextParams {
  type: string;
  fiscalYear: string;
  scopeKey?: string;
}

export interface DocumentFormatParams {
  prefix: string;
  fiscalYear: string;
  value: bigint | number;
  scopeKey?: string;
  padding?: number;
}

@Injectable()
export class SequenceService {
  /**
   * Generates the next gapless sequential number inside the caller's transaction.
   *
   * Enforces RULE-ATOMIC & ARCH-MONEY:
   * Uses PostgreSQL row lock on the unique sequence tuple (company_id, type, fiscal_year, scope_key).
   * If the transaction rolls back, zero sequence numbers are burned.
   */
  async next(tx: TenantPrisma, params: SequenceNextParams): Promise<bigint> {
    const companyId = tx.currentCompanyId;
    const scopeKey = params.scopeKey ?? 'ALL';

    const rows = await tx.$queryRawUnsafe<Array<{ last_value: string | number | bigint }>>(
      `
      INSERT INTO document_sequences (
        company_id,
        type,
        fiscal_year,
        scope_key,
        last_value
      ) VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        1
      )
      ON CONFLICT (company_id, type, fiscal_year, scope_key)
      DO UPDATE SET
        last_value = document_sequences.last_value + 1,
        updated_at = now()
      RETURNING last_value;
    `,
      companyId,
      params.type,
      params.fiscalYear,
      scopeKey,
    );

    const record = rows[0];
    if (!record || record.last_value === undefined) {
      throw new Error(`Failed to generate sequence for type ${params.type}`);
    }

    return BigInt(record.last_value);
  }

  /**
   * Formats a sequential number into a standard human-readable document number.
   * e.g. BKG-2026-2027-DHK-00042
   */
  format(params: DocumentFormatParams): string {
    const padding = params.padding ?? 5;
    const paddedNum = String(params.value).padStart(padding, '0');
    const parts = [params.prefix, params.fiscalYear];

    if (params.scopeKey && params.scopeKey !== 'ALL') {
      parts.push(params.scopeKey);
    }

    parts.push(paddedNum);
    return parts.join('-');
  }
}
