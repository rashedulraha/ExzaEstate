import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotFoundException, ValidationException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { DocumentsMapper } from './documents.mapper.js';
import { DocumentSecurityValidator } from './document-security.validator.js';
import {
  CreateDocumentDto,
  CreateVersionDto,
  DocumentResponseDto,
  PresignDownloadResponseDto,
  PresignUploadDto,
  PresignUploadResponseDto,
  QueryDocumentDto,
} from './dto/index.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  async presignUpload(companyId: string, dto: PresignUploadDto): Promise<PresignUploadResponseDto> {
    DocumentSecurityValidator.validateUpload(dto.fileName, dto.mimeType, dto.sizeBytes);

    const prefix = dto.isPrivate
      ? `${companyId}/private/documents/${dto.entityId}`
      : `${companyId}/documents/${dto.entityId}`;
    const fileKey = `${prefix}/${crypto.randomUUID()}-${dto.fileName}`;

    const uploadUrl = await this.storageService.presignPut(fileKey, {
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      expiresInSeconds: 900,
    });

    return { uploadUrl, fileKey, expiresInSeconds: 900 };
  }

  async createDocument(
    companyId: string,
    userId: string,
    dto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    DocumentSecurityValidator.assertCompanyFileKey(companyId, dto.fileKey);

    const head = await this.storageService.head(dto.fileKey).catch(() => null);
    if (!head || head.size === 0) {
      throw new ValidationException('Uploaded file was not found in storage or is empty');
    }

    const isExpired = dto.expiresAt ? new Date(dto.expiresAt) <= new Date() : false;

    return this.tenantDb.transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          companyId,
          title: dto.title,
          description: dto.description,
          entityType: dto.entityType,
          entityId: dto.entityId,
          category: dto.category,
          isPrivate: dto.isPrivate ?? false,
          requiredPermission: dto.requiredPermission,
          currentVersion: 1,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          isExpired,
          status: isExpired ? 'EXPIRED' : 'ACTIVE',
          createdById: userId,
        },
      });

      const version = await tx.documentVersion.create({
        data: {
          companyId,
          documentId: doc.id,
          version: 1,
          fileKey: dto.fileKey,
          fileName: dto.fileName,
          mimeType: dto.mimeType,
          sizeBytes: BigInt(dto.sizeBytes),
          checksum: dto.checksum,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          uploadedById: userId,
        },
      });

      await this.auditService.record(tx, {
        module: 'documents',
        recordType: 'document',
        recordId: doc.id,
        action: 'create',
        newValue: { title: doc.title, entityType: doc.entityType, fileKey: version.fileKey },
      });

      if (isExpired) {
        await this.outboxService.emit(tx, 'document.expired', {
          documentId: doc.id,
          companyId,
          title: doc.title,
          entityType: doc.entityType,
          entityId: doc.entityId,
          expiresAt: doc.expiresAt?.toISOString() ?? null,
        });
      }

      return DocumentsMapper.toDto(doc, [version]);
    });
  }

  async createVersion(
    companyId: string,
    userId: string,
    documentId: string,
    dto: CreateVersionDto,
  ): Promise<DocumentResponseDto> {
    DocumentSecurityValidator.assertCompanyFileKey(companyId, dto.fileKey);

    const head = await this.storageService.head(dto.fileKey).catch(() => null);
    if (!head || head.size === 0) {
      throw new ValidationException('Uploaded file version was not found in storage or is empty');
    }

    return this.tenantDb.transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId } });
      if (!doc || doc.deletedAt || doc.companyId !== companyId) {
        throw new NotFoundException('Document not found');
      }

      const nextVersion = doc.currentVersion + 1;
      await tx.documentVersion.create({
        data: {
          companyId,
          documentId: doc.id,
          version: nextVersion,
          fileKey: dto.fileKey,
          fileName: dto.fileName,
          mimeType: dto.mimeType,
          sizeBytes: BigInt(dto.sizeBytes),
          checksum: dto.checksum,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          uploadedById: userId,
        },
      });

      const updated = await tx.document.update({
        where: { id: documentId },
        data: { currentVersion: nextVersion, updatedAt: new Date() },
        include: { versions: { orderBy: { version: 'asc' } } },
      });

      await this.auditService.record(tx, {
        module: 'documents',
        recordType: 'document',
        recordId: doc.id,
        action: 'new_version',
        newValue: { newVersion: nextVersion, fileKey: dto.fileKey },
      });

      return DocumentsMapper.toDto(updated, updated.versions);
    });
  }

  async getDownloadUrl(
    companyId: string,
    userPermissions: string[],
    documentId: string,
    versionNumber?: number,
  ): Promise<PresignDownloadResponseDto> {
    const doc = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.document.findUnique({ where: { id: documentId }, include: { versions: true } }),
    );

    if (!doc || doc.deletedAt || doc.companyId !== companyId) {
      throw new NotFoundException('Document not found');
    }

    DocumentSecurityValidator.checkDocumentAccess(doc, userPermissions);

    const targetVersionNum = versionNumber ?? doc.currentVersion;
    const version = doc.versions.find((v) => v.version === targetVersionNum);
    if (!version) {
      throw new NotFoundException(`Document version ${targetVersionNum} not found`);
    }

    const downloadUrl = await this.storageService.presignGet(version.fileKey, {
      expiresInSeconds: 900,
    });

    return {
      downloadUrl,
      fileName: version.fileName,
      mimeType: version.mimeType,
      version: version.version,
      expiresInSeconds: 900,
    };
  }

  async findById(
    companyId: string,
    userPermissions: string[],
    documentId: string,
  ): Promise<DocumentResponseDto> {
    const doc = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.document.findUnique({
        where: { id: documentId },
        include: { versions: { orderBy: { version: 'asc' } } },
      }),
    );

    if (!doc || doc.deletedAt || doc.companyId !== companyId) {
      throw new NotFoundException('Document not found');
    }

    DocumentSecurityValidator.checkDocumentAccess(doc, userPermissions);
    return DocumentsMapper.toDto(doc, doc.versions);
  }

  async findAll(
    companyId: string,
    userPermissions: string[],
    query: QueryDocumentDto,
  ): Promise<{ data: DocumentResponseDto[]; total: number; page: number; pageSize: number }> {
    const where: Prisma.DocumentWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.entityId && { entityId: query.entityId }),
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
    };

    const [total, records] = await this.tenantDb.withCompany(companyId, (tx) =>
      Promise.all([
        tx.document.count({ where }),
        tx.document.findMany({
          where,
          include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]),
    );

    const accessible = records.filter((doc) => {
      try {
        DocumentSecurityValidator.checkDocumentAccess(doc, userPermissions);
        return true;
      } catch {
        return false;
      }
    });

    return {
      data: accessible.map((doc) => DocumentsMapper.toDto(doc, doc.versions)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async softDelete(companyId: string, userId: string, documentId: string): Promise<void> {
    await this.tenantDb.transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId } });
      if (!doc || doc.deletedAt || doc.companyId !== companyId) {
        throw new NotFoundException('Document not found');
      }

      await tx.document.update({
        where: { id: documentId },
        data: { deletedAt: new Date(), status: 'ARCHIVED' },
      });

      await this.auditService.record(tx, {
        module: 'documents',
        recordType: 'document',
        recordId: doc.id,
        action: 'delete',
        oldValue: { status: doc.status },
        newValue: { status: 'ARCHIVED' },
        reason: `Soft-deleted by user ${userId}`,
      });
    });
  }
}
