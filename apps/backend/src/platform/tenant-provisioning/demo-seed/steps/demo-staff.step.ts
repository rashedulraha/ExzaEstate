import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';

interface DemoStaffTemplate {
  prefix: string;
  fullName: string;
  phone: string;
  roleCode: string;
}

const DEMO_STAFF_TEMPLATES: DemoStaffTemplate[] = [
  {
    prefix: 'gm',
    fullName: 'মোহাম্মদ রফিক (Mohammad Rafiq)',
    phone: '+8801700000002',
    roleCode: 'GENERAL_MANAGER',
  },
  {
    prefix: 'accountant',
    fullName: 'ফারহানা হক (Farhana Haque)',
    phone: '+8801700000003',
    roleCode: 'ACCOUNTANT',
  },
  {
    prefix: 'executive',
    fullName: 'তানভীর আহমেদ (Tanveer Ahmed)',
    phone: '+8801700000004',
    roleCode: 'EXECUTIVE',
  },
  {
    prefix: 'executive2',
    fullName: 'নুসরাত জাহান (Nusrat Jahan)',
    phone: '+8801700000005',
    roleCode: 'EXECUTIVE',
  },
];

@Injectable()
export class DemoStaffStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoStaffStep.name);
  readonly name = 'DemoStaffStep';
  readonly order = 10;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    const defaultPassword = 'ExzaEstate@2026!';
    const passwordHash = await argon2.hash(defaultPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const emailDomain =
      ctx.companyCode === 'EXZA' ? 'exzaestate.com' : `${ctx.companyCode.toLowerCase()}.test`;

    for (const template of DEMO_STAFF_TEMPLATES) {
      const email = `${template.prefix}@${emailDomain}`.toLowerCase();

      // Find role by companyId and roleCode
      const role = await tx.role.findUnique({
        where: {
          companyId_code: {
            companyId: ctx.companyId,
            code: template.roleCode,
          },
        },
      });

      if (!role) {
        this.logger.warn(
          `Role ${template.roleCode} not found for company ${ctx.companyId}; skipping user ${email}`,
        );
        continue;
      }

      // Upsert User
      const user = await tx.user.upsert({
        where: { email },
        update: {
          fullName: template.fullName,
          phone: template.phone,
          status: 'ACTIVE',
          passwordHash,
        },
        create: {
          companyId: ctx.companyId,
          email,
          fullName: template.fullName,
          phone: template.phone,
          status: 'ACTIVE',
          passwordHash,
        },
      });

      // Link UserRole
      await tx.userRole.upsert({
        where: {
          companyId_userId_roleId: {
            companyId: ctx.companyId,
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          companyId: ctx.companyId,
          userId: user.id,
          roleId: role.id,
        },
      });

      // Link UserBranch
      await tx.userBranch.upsert({
        where: {
          companyId_userId_branchId: {
            companyId: ctx.companyId,
            userId: user.id,
            branchId: ctx.branchId,
          },
        },
        update: { isDefault: true },
        create: {
          companyId: ctx.companyId,
          userId: user.id,
          branchId: ctx.branchId,
          isDefault: true,
        },
      });

      ctx.state.set(`demoUserId:${template.roleCode}:${email}`, user.id);
    }
  }
}
