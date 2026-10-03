import { Injectable } from '@nestjs/common';
import { TenantDb } from '../../database/tenant-db.service.js';

export interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isMandatory: boolean;
  details?: Record<string, unknown>;
}

export interface SetupChecklistResult {
  items: ChecklistItem[];
  totalCount: number;
  completedCount: number;
  percentage: number;
  canTransact: boolean;
}

@Injectable()
export class SetupChecklistService {
  constructor(private readonly tenantDb: TenantDb) {}

  /**
   * Evaluates the company first-time setup checklist progress according to FLOW-02.
   */
  async getChecklist(): Promise<SetupChecklistResult> {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;

      // 1. Company Profile check
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { name: true, code: true, address: true, contactPhone: true, contactEmail: true },
      });
      const hasCompanyProfile = !!(
        company &&
        company.name &&
        company.code &&
        (company.address || company.contactPhone || company.contactEmail)
      );

      // 2. Branches check: at least one active Head Office
      const headOfficeCount = await tx.branch.count({
        where: { companyId, isHeadOffice: true, deletedAt: null, isActive: true },
      });
      const hasHeadOffice = headOfficeCount > 0;

      // 3. Departments check: at least one active department
      const departmentCount = await tx.department.count({
        where: { companyId, deletedAt: null, isActive: true },
      });
      const hasDepartments = departmentCount > 0;

      // 4. Policy Settings check: settings configured
      const settingsCount = await tx.companySetting.count({
        where: { companyId },
      });
      const hasSettings = settingsCount >= 10; // At least baseline core settings

      // 5. Numbering Patterns check: patterns configured
      const numberingCount = await tx.numberingPattern.count({
        where: { companyId, isActive: true },
      });
      const hasNumbering = numberingCount >= 5; // Core document patterns

      // 6. Users & Roles check: at least one active Managing Director
      const mdRole = await tx.role.findFirst({
        where: { companyId, code: 'MANAGING_DIRECTOR' },
        select: { id: true },
      });

      let hasActiveMd = false;
      if (mdRole) {
        const mdCount = await tx.userRole.count({
          where: {
            companyId,
            roleId: mdRole.id,
            user: { status: 'ACTIVE' },
          },
        });
        hasActiveMd = mdCount > 0;
      }

      const items: ChecklistItem[] = [
        {
          key: 'COMPANY_PROFILE',
          title: 'Company Profile & Contact',
          description: 'Configure corporate name, branding logo, address, and contact phone/email',
          isCompleted: hasCompanyProfile,
          isMandatory: true,
          details: { hasCompanyProfile },
        },
        {
          key: 'BRANCHES',
          title: 'Head Office & Branch Setup',
          description: 'Ensure at least one active Head Office branch exists',
          isCompleted: hasHeadOffice,
          isMandatory: true,
          details: { headOfficeCount },
        },
        {
          key: 'DEPARTMENTS',
          title: 'Organizational Departments',
          description: 'Define departments such as Sales, Accounts, and Engineering',
          isCompleted: hasDepartments,
          isMandatory: true,
          details: { departmentCount },
        },
        {
          key: 'POLICY_SETTINGS',
          title: 'Operational Policy Settings',
          description:
            'Review revenue recognition, discount tiers, booking percentages, and fiscal year',
          isCompleted: hasSettings,
          isMandatory: true,
          details: { settingsCount },
        },
        {
          key: 'NUMBERING_PATTERNS',
          title: 'Document Numbering Patterns',
          description:
            'Define sequential numbering structures for receipts, quotations, and bookings',
          isCompleted: hasNumbering,
          isMandatory: true,
          details: { numberingCount },
        },
        {
          key: 'USERS_ROLES',
          title: 'Active Managing Director & Roles',
          description: 'At least one active Managing Director user configured with role access',
          isCompleted: hasActiveMd,
          isMandatory: true,
          details: { hasActiveMd },
        },
      ];

      const totalCount = items.length;
      const completedCount = items.filter((i) => i.isCompleted).length;
      const percentage = Math.round((completedCount / totalCount) * 100);
      const canTransact = items.filter((i) => i.isMandatory).every((i) => i.isCompleted);

      return {
        items,
        totalCount,
        completedCount,
        percentage,
        canTransact,
      };
    });
  }
}
