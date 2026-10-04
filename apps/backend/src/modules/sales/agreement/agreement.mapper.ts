import type { Agreement, AgreementTemplate } from '@prisma/client';
import type {
  AgreementResponseDto,
  AgreementTemplateResponseDto,
} from './dto/agreement-response.dto.js';

export function mapAgreementTemplateToDto(
  template: AgreementTemplate,
): AgreementTemplateResponseDto {
  return {
    id: template.id,
    companyId: template.companyId,
    code: template.code,
    name: template.name,
    templateBody: template.templateBody,
    isDefault: template.isDefault,
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function mapAgreementToDto(agreement: Agreement): AgreementResponseDto {
  return {
    id: agreement.id,
    companyId: agreement.companyId,
    agreementNumber: agreement.agreementNumber,
    bookingId: agreement.bookingId,
    templateId: agreement.templateId,
    version: agreement.version,
    status: agreement.status,
    title: agreement.title,
    content: agreement.content,
    terms: agreement.terms,
    signedAt: agreement.signedAt?.toISOString() ?? null,
    signedById: agreement.signedById,
    documentId: agreement.documentId,
    supersededById: agreement.supersededById,
    notes: agreement.notes,
    createdAt: agreement.createdAt.toISOString(),
    updatedAt: agreement.updatedAt.toISOString(),
  };
}
