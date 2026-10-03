import { Prisma } from '@prisma/client';
import { DocumentResponseDto, DocumentVersionResponseDto } from './dto/document-response.dto.js';

export interface DocumentRow {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  entityType: string;
  entityId: string;
  category: string | null;
  isPrivate: boolean;
  requiredPermission: string | null;
  currentVersion: number;
  expiresAt: Date | null;
  isExpired: boolean;
  status: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersionRow {
  id: string;
  version: number;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string | null;
  metadata: Prisma.JsonValue;
  uploadedById: string | null;
  createdAt: Date;
}

export class DocumentsMapper {
  static toDto(doc: DocumentRow, versions: DocumentVersionRow[] = []): DocumentResponseDto {
    return {
      id: doc.id,
      companyId: doc.companyId,
      title: doc.title,
      description: doc.description,
      entityType: doc.entityType,
      entityId: doc.entityId,
      category: doc.category,
      isPrivate: doc.isPrivate,
      requiredPermission: doc.requiredPermission,
      currentVersion: doc.currentVersion,
      expiresAt: doc.expiresAt?.toISOString() ?? null,
      isExpired: doc.isExpired,
      status: doc.status,
      createdById: doc.createdById,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      versions: versions.map(DocumentsMapper.toVersionDto),
    };
  }

  static toVersionDto(v: DocumentVersionRow): DocumentVersionResponseDto {
    return {
      id: v.id,
      version: v.version,
      fileKey: v.fileKey,
      fileName: v.fileName,
      mimeType: v.mimeType,
      sizeBytes: v.sizeBytes.toString(),
      checksum: v.checksum,
      metadata: (v.metadata as Record<string, unknown>) ?? null,
      uploadedById: v.uploadedById,
      createdAt: v.createdAt.toISOString(),
    };
  }
}
