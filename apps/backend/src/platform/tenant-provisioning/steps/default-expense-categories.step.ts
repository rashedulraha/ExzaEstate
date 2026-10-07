import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProvisioningContext, ProvisioningStep } from '../provisioning-step.interface.js';

export interface DefaultExpenseCategoryDefinition {
  code: string;
  name: string;
  accountCode: string;
  description: string;
}

export const BASELINE_EXPENSE_CATEGORIES: DefaultExpenseCategoryDefinition[] = [
  {
    code: 'CAT-CONST-CIVIL',
    name: 'Civil & Structural Construction',
    accountCode: '5200',
    description:
      'Site preparation, foundation piling, brickwork, RCC framing and structural execution',
  },
  {
    code: 'CAT-UTIL-ELEC',
    name: 'Utilities & Power Infrastructure',
    accountCode: '5500',
    description:
      'Substation equipment, DESCO/DPDC line charges, water supply, sewage and backup generator',
  },
  {
    code: 'CAT-ARCH-INT',
    name: 'Architectural & Interior Finishing',
    accountCode: '5200',
    description:
      'Tiles, sanitary ware, paint, aluminum glazing, elevator fittings and common area decor',
  },
  {
    code: 'CAT-OFFICE-ADMIN',
    name: 'Office & Administrative Overhead',
    accountCode: '5500',
    description:
      'Head office rent, internet connectivity, printing, stationery and general utilities',
  },
  {
    code: 'CAT-MKT-PROMO',
    name: 'Marketing & Brand Promotion',
    accountCode: '5300',
    description:
      'Real estate expos, digital advertisements, billboards, customer brochures and promotional events',
  },
  {
    code: 'CAT-LEGAL-REG',
    name: 'Legal & Regulatory Compliance',
    accountCode: '5500',
    description:
      'RAJUK approvals, municipality vetting, trade licenses, environmental clearances and documentation',
  },
  {
    code: 'CAT-SITE-MAINT',
    name: 'Site Maintenance & Security',
    accountCode: '5600',
    description:
      'Round-the-clock site security guards, CCTV surveillance, safety barriers and hazard containment',
  },
  {
    code: 'CAT-CONSULT-ENG',
    name: 'Engineering & Soil Consultancy',
    accountCode: '5200',
    description:
      'Geotechnical soil testing, CEGIS vetting, structural design review and MEP vetting',
  },
];

@Injectable()
export class DefaultExpenseCategoriesStep implements ProvisioningStep {
  readonly name = 'DefaultExpenseCategoriesStep';
  readonly order = 85;
  private readonly logger = new Logger(DefaultExpenseCategoriesStep.name);

  async execute(ctx: ProvisioningContext, tx: Prisma.TransactionClient): Promise<void> {
    for (const cat of BASELINE_EXPENSE_CATEGORIES) {
      await tx.expenseCategory.upsert({
        where: {
          companyId_code: {
            companyId: ctx.companyId,
            code: cat.code,
          },
        },
        update: {
          name: cat.name,
          accountCode: cat.accountCode,
          description: cat.description,
          isActive: true,
          deletedAt: null,
        },
        create: {
          companyId: ctx.companyId,
          code: cat.code,
          name: cat.name,
          accountCode: cat.accountCode,
          description: cat.description,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Provisioned ${BASELINE_EXPENSE_CATEGORIES.length} default expense categories for company ${ctx.companyCode}`,
    );
  }
}
