import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import { NotFoundException } from '../../common/exceptions/app.exception.js';
import { TenantProvisioningService } from '../../platform/tenant-provisioning/tenant-provisioning.service.js';
import { OnboardTenantDto } from './dto/tenant-management.dto.js';

@Injectable()
export class SystemTenantService {
  constructor(
    private readonly systemPrisma: SystemPrisma,
    private readonly provisioningService: TenantProvisioningService,
  ) {}

  async onboardTenant(dto: OnboardTenantDto, adminId?: string) {
    const result = await this.provisioningService.provisionCompany(dto);

    await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Audit log tenant onboarding by Super Admin',
      async (client) => {
        await client.auditLog.create({
          data: {
            companyId: result.companyId,
            actorId: adminId ?? null,
            module: 'system',
            recordType: 'Company',
            recordId: result.companyId,
            action: 'TENANT_ONBOARD',
            newValue: { code: result.companyCode, companyId: result.companyId },
            reason: '// SYSTEM-SCOPE: Super Admin onboarded tenant',
            requestId: crypto.randomUUID(),
          },
        });
      },
    );

    return result;
  }

  async listTenants(adminId?: string) {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: List tenants across platform',
      async (client) => {
        const companies = await client.company.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            code: true,
            timezone: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        // Audit log reading system-scope tenant list
        await client.auditLog.create({
          data: {
            companyId: '00000000-0000-0000-0000-000000000000',
            actorId: adminId ?? null,
            module: 'system',
            recordType: 'Company',
            recordId: '00000000-0000-0000-0000-000000000000',
            action: 'SYSTEM_TENANTS_LIST',
            reason: '// SYSTEM-SCOPE: List tenants across platform',
            requestId: crypto.randomUUID(),
          },
        });

        return companies.map((c) => ({
          ...c,
          status: c.isActive ? 'ACTIVE' : 'SUSPENDED',
        }));
      },
    );
  }

  async getTenantById(id: string) {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Get tenant details by ID',
      async (client) => {
        const company = await client.company.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            code: true,
            timezone: true,
            isActive: true,
            createdAt: true,
            branches: {
              where: { deletedAt: null },
              select: { id: true, name: true, code: true, isHeadOffice: true },
            },
          },
        });

        if (!company) {
          throw new NotFoundException('Tenant not found');
        }

        return {
          ...company,
          status: company.isActive ? 'ACTIVE' : 'SUSPENDED',
        };
      },
    );
  }

  async suspendTenant(id: string, reason: string, adminId?: string) {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Suspend tenant company',
      async (client) => {
        const company = await client.company.findUnique({
          where: { id },
        });

        if (!company) {
          throw new NotFoundException('Tenant not found');
        }

        const updated = await client.company.update({
          where: { id },
          data: { isActive: false },
        });

        await client.auditLog.create({
          data: {
            companyId: id,
            actorId: adminId ?? null,
            module: 'system',
            recordType: 'Company',
            recordId: id,
            action: 'TENANT_SUSPEND',
            newValue: { status: 'SUSPENDED', isActive: false },
            reason: `// SYSTEM-SCOPE: Suspended tenant company: ${reason}`,
            requestId: crypto.randomUUID(),
          },
        });

        return {
          id: updated.id,
          code: updated.code,
          name: updated.name,
          status: 'SUSPENDED',
        };
      },
    );
  }

  async reactivateTenant(id: string, adminId?: string) {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Reactivate tenant company',
      async (client) => {
        const company = await client.company.findUnique({
          where: { id },
        });

        if (!company) {
          throw new NotFoundException('Tenant not found');
        }

        const updated = await client.company.update({
          where: { id },
          data: { isActive: true },
        });

        await client.auditLog.create({
          data: {
            companyId: id,
            actorId: adminId ?? null,
            module: 'system',
            recordType: 'Company',
            recordId: id,
            action: 'TENANT_REACTIVATE',
            newValue: { status: 'ACTIVE', isActive: true },
            reason: '// SYSTEM-SCOPE: Reactivated tenant company',
            requestId: crypto.randomUUID(),
          },
        });

        return {
          id: updated.id,
          code: updated.code,
          name: updated.name,
          status: 'ACTIVE',
        };
      },
    );
  }
}
