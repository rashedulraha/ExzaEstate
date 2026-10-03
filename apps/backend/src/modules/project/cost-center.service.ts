import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { UpdateCostCenterDto } from './dto/cost-center.dto.js';

@Injectable()
export class CostCenterService {
  constructor(private readonly tenantDb: TenantDb) {}

  async createForProject(
    tx: TenantPrisma,
    companyId: string,
    projectId: string,
    projectName: string,
    defaultCode: string,
    customCode?: string,
    customName?: string,
  ) {
    const code = customCode ? customCode.trim() : `CC-${defaultCode}`;

    const existingCC = await tx.costCenter.findFirst({
      where: { companyId, code, deletedAt: null },
    });
    if (existingCC) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: `Cost center with code ${code} already exists`,
      });
    }

    const name = customName?.trim() || `${projectName.trim()} Cost Center`;

    return tx.costCenter.create({
      data: {
        companyId,
        projectId,
        code,
        name,
        description: `Cost center for project ${projectName} (${defaultCode})`,
        isActive: true,
      },
    });
  }

  async listCostCenters(companyId: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      return tx.costCenter.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { code: 'asc' },
        include: { project: { select: { id: true, name: true, code: true } } },
      });
    });
  }

  async getCostCenterById(companyId: string, id: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const cc = await tx.costCenter.findUnique({
        where: { id, companyId, deletedAt: null },
        include: { project: { select: { id: true, name: true, code: true } } },
      });
      if (!cc) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Cost center not found',
        });
      }
      return cc;
    });
  }

  async updateCostCenter(companyId: string, id: string, dto: UpdateCostCenterDto) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const cc = await tx.costCenter.findUnique({
        where: { id, companyId, deletedAt: null },
      });
      if (!cc) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Cost center not found',
        });
      }

      if (dto.code && dto.code.trim() !== cc.code) {
        const conflict = await tx.costCenter.findFirst({
          where: { companyId, code: dto.code.trim(), deletedAt: null },
        });
        if (conflict) {
          throw new ConflictException({
            code: ERROR_CODES.CONFLICT,
            message: `Cost center with code ${dto.code.trim()} already exists`,
          });
        }
      }

      return tx.costCenter.update({
        where: { id, companyId },
        data: {
          ...(dto.code && { code: dto.code.trim() }),
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    });
  }

  async softDeleteForProject(tx: TenantPrisma, companyId: string, projectId: string) {
    await tx.costCenter.updateMany({
      where: { projectId, companyId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
