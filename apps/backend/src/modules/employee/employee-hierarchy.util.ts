import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { UpdateEmployeeDto } from './dto/employee.dto.js';

export const CIRCULAR_SUPERVISOR_HIERARCHY = 'CIRCULAR_SUPERVISOR_HIERARCHY';

export async function validateSupervisorHierarchy(
  tx: TenantPrisma,
  companyId: string,
  employeeId: string,
  candidateSupervisorId: string,
): Promise<void> {
  if (employeeId === candidateSupervisorId) {
    throw new BadRequestException({
      code: CIRCULAR_SUPERVISOR_HIERARCHY,
      message: 'An employee cannot be their own supervisor',
    });
  }

  const supervisor = await tx.employee.findUnique({
    where: { id: candidateSupervisorId, companyId, deletedAt: null },
    select: { id: true, supervisorId: true },
  });

  if (!supervisor) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: 'Supervisor employee not found',
    });
  }

  let currentSupervisorId: string | null = supervisor.supervisorId;
  const visited = new Set<string>([candidateSupervisorId]);

  while (currentSupervisorId) {
    if (currentSupervisorId === employeeId) {
      throw new BadRequestException({
        code: CIRCULAR_SUPERVISOR_HIERARCHY,
        message: 'Circular supervisor hierarchy detected',
      });
    }

    if (visited.has(currentSupervisorId)) {
      break;
    }
    visited.add(currentSupervisorId);

    const nextSupervisor: { supervisorId: string | null } | null = await tx.employee.findUnique({
      where: { id: currentSupervisorId, companyId, deletedAt: null },
      select: { supervisorId: true },
    });

    currentSupervisorId = nextSupervisor?.supervisorId ?? null;
  }
}

function assignScalarFields(data: Prisma.EmployeeUpdateInput, dto: UpdateEmployeeDto): void {
  if (dto.employeeCode !== undefined) data.employeeCode = dto.employeeCode;
  if (dto.designation !== undefined) data.designation = dto.designation;
  if (dto.phone !== undefined) data.phone = dto.phone;
  if (dto.isActive !== undefined) data.isActive = dto.isActive;
  if (dto.joiningDate !== undefined) {
    data.joiningDate = dto.joiningDate ? new Date(dto.joiningDate) : null;
  }
}

function assignRelationFields(data: Prisma.EmployeeUpdateInput, dto: UpdateEmployeeDto): void {
  if (dto.branchId !== undefined) {
    data.branch = dto.branchId ? { connect: { id: dto.branchId } } : { disconnect: true };
  }
  if (dto.departmentId !== undefined) {
    data.department = dto.departmentId
      ? { connect: { id: dto.departmentId } }
      : { disconnect: true };
  }
  if (dto.supervisorId !== undefined) {
    data.supervisor = dto.supervisorId
      ? { connect: { id: dto.supervisorId } }
      : { disconnect: true };
  }
}

export function buildEmployeeUpdateData(dto: UpdateEmployeeDto): Prisma.EmployeeUpdateInput {
  const data: Prisma.EmployeeUpdateInput = {};
  assignScalarFields(data, dto);
  assignRelationFields(data, dto);
  return data;
}
