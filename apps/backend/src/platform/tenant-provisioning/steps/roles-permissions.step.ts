import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '@exzaestate/shared';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';
import { DEFAULT_TENANT_ROLES } from './default-roles.data.js';

@Injectable()
export class RolesPermissionsStep implements ProvisioningStep {
  readonly name = 'RolesPermissionsStep';
  readonly order = 20;

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    for (const code of Object.values(PERMISSIONS)) {
      try {
        await tx.systemPermission.upsert({
          where: { code },
          update: {},
          create: {
            code,
            module: code.split(':')[0] || 'general',
            description: `${code} permission`,
          },
        });
      } catch {
        // If already inserted concurrently by another transaction, proceed safely
      }
    }
    for (const roleDef of DEFAULT_TENANT_ROLES) {
      const role = await tx.role.upsert({
        where: {
          companyId_code: {
            companyId: ctx.companyId,
            code: roleDef.code,
          },
        },
        update: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
        create: {
          companyId: ctx.companyId,
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
      });

      ctx.state.set(`role:${roleDef.code}`, role.id);

      // Seed role permissions idempotently
      for (const perm of roleDef.permissions) {
        try {
          await tx.systemPermission.upsert({
            where: { code: perm.code },
            update: {},
            create: {
              code: perm.code,
              module: perm.code.split(':')[0] || 'general',
              description: `${perm.code} permission`,
            },
          });
        } catch {
          // If already inserted concurrently by another transaction, proceed safely
        }

        await tx.rolePermission.upsert({
          where: {
            companyId_roleId_permissionCode: {
              companyId: ctx.companyId,
              roleId: role.id,
              permissionCode: perm.code,
            },
          },
          update: {
            scope: perm.scope ?? null,
          },
          create: {
            companyId: ctx.companyId,
            roleId: role.id,
            permissionCode: perm.code,
            scope: perm.scope ?? null,
          },
        });
      }
    }
  }
}
