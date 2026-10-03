import { Injectable, Logger, Optional } from '@nestjs/common';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';

export interface ExpiryProcessResult {
  expiredCount: number;
  documentIds: string[];
}

@Injectable()
export class DocumentExpiryService {
  private readonly logger = new Logger(DocumentExpiryService.name);

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    @Optional() private readonly systemPrisma?: SystemPrisma,
  ) {}

  /**
   * Processes expired documents for a specific company tenant (S3).
   */
  async processExpiredDocumentsForCompany(companyId: string): Promise<ExpiryProcessResult> {
    const now = new Date();

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const expiredDocs = await tx.document.findMany({
        where: {
          companyId,
          expiresAt: { lte: now },
          isExpired: false,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (expiredDocs.length === 0) {
        return { expiredCount: 0, documentIds: [] };
      }

      const expiredIds: string[] = [];

      for (const doc of expiredDocs) {
        await tx.document.update({
          where: { id: doc.id },
          data: {
            isExpired: true,
            status: 'EXPIRED',
          },
        });

        await this.outboxService.emit(tx, 'document.expired', {
          documentId: doc.id,
          companyId: doc.companyId,
          title: doc.title,
          entityType: doc.entityType,
          entityId: doc.entityId,
          expiresAt: doc.expiresAt?.toISOString() ?? null,
        });

        await this.auditService.record(tx, {
          module: 'documents',
          recordType: 'document',
          recordId: doc.id,
          action: 'expire',
          oldValue: { isExpired: false, status: doc.status },
          newValue: { isExpired: true, status: 'EXPIRED' },
          reason: 'Automated nightly document expiry processing',
        });

        expiredIds.push(doc.id);
      }

      this.logger.log(`Marked ${expiredIds.length} documents as EXPIRED for company ${companyId}`);

      return {
        expiredCount: expiredIds.length,
        documentIds: expiredIds,
      };
    });
  }

  /**
   * System-wide worker sweep: processes expired documents across all active companies (S3).
   */
  async processAllExpiredDocuments(): Promise<{ totalExpired: number }> {
    if (!this.systemPrisma) {
      return { totalExpired: 0 };
    }

    const companyIds = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Scan active company IDs for document expiry sweep',
      async (client) => {
        const rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM companies WHERE is_active = true`,
        );
        return rows.map((r) => r.id);
      },
    );

    let totalExpired = 0;

    for (const companyId of companyIds) {
      const res = await this.processExpiredDocumentsForCompany(companyId);
      totalExpired += res.expiredCount;
    }

    return { totalExpired };
  }
}
