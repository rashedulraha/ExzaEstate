import type { Account } from '@prisma/client';
import type { AccountResponseDto } from './dto/account-response.dto.js';

export function mapAccountToDto(account: Account): AccountResponseDto {
  return {
    id: account.id,
    companyId: account.companyId,
    code: account.code,
    name: account.name,
    type: account.type,
    parentId: account.parentId,
    isGroup: account.isGroup,
    isSystem: account.isSystem,
    partyType: account.partyType,
    isActive: account.isActive,
    description: account.description,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
