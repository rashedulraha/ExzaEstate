import type { Prisma } from '@prisma/client';
import type { CreateProjectDto, UpdateProjectDto } from './dto/project.dto.js';

export function parsePaisa(val?: string | number | null): bigint | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return BigInt(Math.round(val));
  return BigInt(val.toString().trim());
}

export function parseDate(val?: string | null): Date | null {
  return val ? new Date(val) : null;
}

export function trimOrNull(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function formatProjectOutput(project: Record<string, unknown>) {
  return {
    ...project,
    estimatedBudgetPaisa:
      project.estimatedBudgetPaisa !== null && project.estimatedBudgetPaisa !== undefined
        ? project.estimatedBudgetPaisa.toString()
        : null,
  };
}

function buildProjectLocation(dto: CreateProjectDto) {
  return {
    location: trimOrNull(dto.location),
    district: trimOrNull(dto.district),
    upazila: trimOrNull(dto.upazila),
    address: trimOrNull(dto.address),
  };
}

function buildProjectDates(dto: CreateProjectDto) {
  return {
    startDate: parseDate(dto.startDate),
    expectedCompletionDate: parseDate(dto.expectedCompletionDate),
    endDate: parseDate(dto.endDate),
  };
}

function buildProjectMetadata(dto: CreateProjectDto, userId?: string) {
  return {
    masterPlanUrl: trimOrNull(dto.masterPlanUrl),
    galleryUrls: (dto.galleryUrls ?? []) as Prisma.InputJsonValue,
    description: trimOrNull(dto.description),
    estimatedBudgetPaisa: parsePaisa(dto.estimatedBudgetPaisa),
    createdById: userId ?? null,
    updatedById: userId ?? null,
  };
}

export function buildProjectCreateData(
  companyId: string,
  code: string,
  dto: CreateProjectDto,
  userId?: string,
): Prisma.ProjectUncheckedCreateInput {
  return {
    companyId,
    code,
    name: dto.name.trim(),
    type: dto.type.trim(),
    status: dto.status?.trim() ?? 'PLANNING',
    landId: dto.landId ?? null,
    projectManagerId: dto.projectManagerId ?? null,
    ...buildProjectLocation(dto),
    ...buildProjectDates(dto),
    ...buildProjectMetadata(dto, userId),
  };
}

function assignBasicUpdate(data: Prisma.ProjectUpdateInput, dto: UpdateProjectDto): void {
  if (dto.name !== undefined) data.name = dto.name.trim();
  if (dto.code !== undefined) data.code = dto.code.trim();
  if (dto.type !== undefined) data.type = dto.type.trim();
  if (dto.status !== undefined) data.status = dto.status.trim();
  if (dto.landId !== undefined) data.landId = dto.landId;
  if (dto.projectManagerId !== undefined) data.projectManagerId = dto.projectManagerId;
}

function assignLocationUpdate(data: Prisma.ProjectUpdateInput, dto: UpdateProjectDto): void {
  if (dto.location !== undefined) data.location = dto.location;
  if (dto.district !== undefined) data.district = dto.district;
  if (dto.upazila !== undefined) data.upazila = dto.upazila;
  if (dto.address !== undefined) data.address = dto.address;
}

function assignDatesAndDetailsUpdate(data: Prisma.ProjectUpdateInput, dto: UpdateProjectDto): void {
  if (dto.startDate !== undefined) data.startDate = parseDate(dto.startDate);
  if (dto.expectedCompletionDate !== undefined) {
    data.expectedCompletionDate = parseDate(dto.expectedCompletionDate);
  }
  if (dto.endDate !== undefined) data.endDate = parseDate(dto.endDate);
  if (dto.masterPlanUrl !== undefined) data.masterPlanUrl = dto.masterPlanUrl;
  if (dto.galleryUrls !== undefined) {
    data.galleryUrls = dto.galleryUrls as Prisma.InputJsonValue;
  }
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.estimatedBudgetPaisa !== undefined) {
    data.estimatedBudgetPaisa = parsePaisa(dto.estimatedBudgetPaisa);
  }
}

export function buildProjectUpdateData(
  dto: UpdateProjectDto,
  userId?: string,
): Prisma.ProjectUpdateInput {
  const data: Prisma.ProjectUpdateInput = {};
  assignBasicUpdate(data, dto);
  assignLocationUpdate(data, dto);
  assignDatesAndDetailsUpdate(data, dto);
  if (userId) data.updatedById = userId;
  return data;
}
