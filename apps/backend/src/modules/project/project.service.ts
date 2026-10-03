import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { CostCenterService } from './cost-center.service.js';
import {
  buildProjectCreateData,
  buildProjectUpdateData,
  formatProjectOutput,
} from './project-builder.util.js';
import type { CreateProjectDto, QueryProjectDto, UpdateProjectDto } from './dto/project.dto.js';

@Injectable()
export class ProjectService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly costCenterService: CostCenterService,
  ) {}

  async createProject(companyId: string, dto: CreateProjectDto, userId?: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const code = dto.code ? dto.code.trim() : await this.generateNextProjectCode(tx, companyId);

      const existingProject = await tx.project.findFirst({
        where: { companyId, code, deletedAt: null },
      });
      if (existingProject) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: `Project with code ${code} already exists`,
        });
      }

      if (dto.landId) {
        await this.validateLandExists(tx, companyId, dto.landId);
      }

      const projectData = buildProjectCreateData(companyId, code, dto, userId);
      const project = await tx.project.create({ data: projectData });

      const costCenter = await this.costCenterService.createForProject(
        tx,
        companyId,
        project.id,
        project.name,
        code,
        dto.costCenterCode,
        dto.costCenterName,
      );

      const land = dto.landId
        ? await tx.land.findUnique({
            where: { id: dto.landId },
            select: {
              id: true,
              name: true,
              code: true,
              areaSqft: true,
              district: true,
              mouza: true,
            },
          })
        : null;

      return formatProjectOutput({
        ...project,
        costCenter,
        land: land ? { ...land, areaSqft: land.areaSqft.toFixed(4) } : null,
      });
    });
  }

  async listProjects(companyId: string, query: QueryProjectDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where: Prisma.ProjectWhereInput = {
        companyId,
        deletedAt: null,
        ...(query.status && { status: query.status }),
        ...(query.type && { type: query.type }),
        ...(query.district && { district: { equals: query.district, mode: 'insensitive' } }),
        ...(query.landId && { landId: query.landId }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { location: { contains: query.search, mode: 'insensitive' } },
            { district: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      };

      const [projects, total] = await Promise.all([
        tx.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { costCenter: true },
        }),
        tx.project.count({ where }),
      ]);

      const items = projects.map((p) => formatProjectOutput(p));
      return { items, total, page, limit };
    });
  }

  async getProjectById(companyId: string, id: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const project = await tx.project.findUnique({
        where: { id, companyId, deletedAt: null },
        include: { costCenter: true },
      });

      if (!project) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Project not found',
        });
      }

      const land = project.landId
        ? await tx.land.findUnique({
            where: { id: project.landId },
            select: {
              id: true,
              name: true,
              code: true,
              areaSqft: true,
              district: true,
              mouza: true,
            },
          })
        : null;

      return formatProjectOutput({
        ...project,
        land: land ? { ...land, areaSqft: land.areaSqft.toFixed(4) } : null,
      });
    });
  }

  async updateProject(companyId: string, id: string, dto: UpdateProjectDto, userId?: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.project.findUnique({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Project not found',
        });
      }

      if (dto.code && dto.code.trim() !== existing.code) {
        const conflict = await tx.project.findFirst({
          where: { companyId, code: dto.code.trim(), deletedAt: null },
        });
        if (conflict) {
          throw new ConflictException({
            code: ERROR_CODES.CONFLICT,
            message: `Project with code ${dto.code.trim()} already exists`,
          });
        }
      }

      if (dto.landId) {
        await this.validateLandExists(tx, companyId, dto.landId);
      }

      const updateData = buildProjectUpdateData(dto, userId);
      const updated = await tx.project.update({
        where: { id, companyId },
        data: updateData,
        include: { costCenter: true },
      });

      return formatProjectOutput(updated);
    });
  }

  async deleteProject(companyId: string, id: string, userId?: string): Promise<void> {
    await this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.project.findUnique({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Project not found',
        });
      }

      const now = new Date();
      await tx.project.update({
        where: { id, companyId },
        data: {
          deletedAt: now,
          status: 'CANCELLED',
          ...(userId && { updatedById: userId }),
        },
      });

      await this.costCenterService.softDeleteForProject(tx, companyId, id);
    });
  }

  async getProjectSummary(companyId: string, id: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const project = await tx.project.findUnique({
        where: { id, companyId, deletedAt: null },
        include: { costCenter: true },
      });
      if (!project) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Project not found',
        });
      }

      const land = project.landId
        ? await tx.land.findUnique({
            where: { id: project.landId },
            select: {
              id: true,
              name: true,
              code: true,
              areaSqft: true,
              district: true,
              mouza: true,
            },
          })
        : null;

      return {
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          type: project.type,
          status: project.status,
          district: project.district,
          estimatedBudgetPaisa: project.estimatedBudgetPaisa
            ? project.estimatedBudgetPaisa.toString()
            : null,
        },
        costCenter: project.costCenter
          ? {
              id: project.costCenter.id,
              code: project.costCenter.code,
              name: project.costCenter.name,
            }
          : null,
        linkedLand: land
          ? {
              id: land.id,
              code: land.code,
              name: land.name,
              areaSqft: land.areaSqft.toFixed(4),
              district: land.district,
              mouza: land.mouza,
            }
          : null,
        inventoryCounts: {
          totalUnits: 0,
          available: 0,
          booked: 0,
          sold: 0,
          hold: 0,
          blocked: 0,
        },
      };
    });
  }

  private async validateLandExists(
    tx: TenantPrisma,
    companyId: string,
    landId: string,
  ): Promise<void> {
    const land = await tx.land.findUnique({
      where: { id: landId, companyId, deletedAt: null },
    });
    if (!land) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Linked land parcel not found',
      });
    }
  }

  private async generateNextProjectCode(tx: TenantPrisma, companyId: string): Promise<string> {
    const count = await tx.project.count({ where: { companyId } });
    const nextSeq = (count + 1).toString().padStart(3, '0');
    return `PRJ-${nextSeq}`;
  }
}
