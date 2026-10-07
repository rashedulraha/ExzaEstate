import { PERMISSIONS } from '@exzaestate/shared';
import { Prisma } from '@prisma/client';

export interface DemoApprovalTemplate {
  approvalNumber: string;
  type: string;
  status: string;
  requesterRole: 'EXECUTIVE' | 'EXECUTIVE2' | 'ACCOUNTANT';
  title: string;
  description: string;
  entityType: string;
  usePropertyId?: boolean;
  useQuotationId?: boolean;
  useProjectId?: boolean;
  amountPaisa: bigint | null;
  percentage?: Prisma.Decimal | null;
  payload: Prisma.InputJsonValue;
  currentStepOrder: number;
  totalSteps: number;
  daysToExpire: number;
  completedDaysAgo?: number;
  finalDecision?: string;
  steps: Array<{
    stepOrder: number;
    name: string;
    status: string;
    requiredPermission: string;
    dueInDays?: number;
    decidedDaysAgo?: number;
    decision?: string;
    comments?: string;
    approverRole?: 'GM' | 'MD';
  }>;
}

export const DEMO_APPROVAL_TEMPLATES: DemoApprovalTemplate[] = [
  {
    approvalNumber: 'APP-HO-2026-00001',
    type: 'DISCOUNT',
    status: 'PENDING',
    requesterRole: 'EXECUTIVE',
    title: '3.5% Special Festive Discount for Plot PLT-A-101 (Purbachal Green City)',
    description:
      'Client requested a 3.5% discount for upfront 30% down payment confirmation on Plot PLT-A-101.',
    entityType: 'Quotation',
    useQuotationId: true,
    useProjectId: true,
    amountPaisa: 182_000_000n,
    percentage: new Prisma.Decimal('3.50'),
    payload: {
      quotationNumber: 'QUO-HO-2026-00001',
      discountPercentage: 3.5,
      marginImpactPct: -1.2,
    },
    currentStepOrder: 1,
    totalSteps: 1,
    daysToExpire: 7,
    steps: [
      {
        stepOrder: 1,
        name: 'Discount Tier 2 (2% to 5%)',
        status: 'PENDING',
        requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER2,
        dueInDays: 2,
      },
    ],
  },
  {
    approvalNumber: 'APP-HO-2026-00002',
    type: 'DISCOUNT',
    status: 'PENDING',
    requesterRole: 'EXECUTIVE2',
    title: '6.0% Corporate Group Discount for Bashundhara Riverview Units',
    description:
      'Apex Horizon Properties Ltd is booking 2 premium units with single-installment settlement, requesting executive discount waiver.',
    entityType: 'Quotation',
    useQuotationId: true,
    useProjectId: true,
    amountPaisa: 360_000_000n,
    percentage: new Prisma.Decimal('6.00'),
    payload: {
      corporateClient: 'Apex Horizon Properties Ltd',
      totalUnits: 2,
      discountPercentage: 6.0,
    },
    currentStepOrder: 1,
    totalSteps: 1,
    daysToExpire: 5,
    steps: [
      {
        stepOrder: 1,
        name: 'Discount Tier 3 (Above 5%)',
        status: 'PENDING',
        requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER3,
        dueInDays: 3,
      },
    ],
  },
  {
    approvalNumber: 'APP-HO-2026-00003',
    type: 'EXPENSE',
    status: 'PENDING',
    requesterRole: 'ACCOUNTANT',
    title: 'Geotechnical Soil Stabilization & Piling Mobilization Advance',
    description:
      'Urgent mobilization advance for GeoTech Bangladesh Ltd for soil stabilization and pre-cast piling works at Purbachal site.',
    entityType: 'Expense',
    useProjectId: true,
    amountPaisa: 45_000_000n,
    percentage: null,
    payload: {
      vendorName: 'GeoTech Bangladesh Ltd',
      category: 'Construction Materials & Site Prep',
      workOrderNumber: 'WO-2026-014',
    },
    currentStepOrder: 1,
    totalSteps: 1,
    daysToExpire: 4,
    steps: [
      {
        stepOrder: 1,
        name: 'Standard Expense Verification',
        status: 'PENDING',
        requiredPermission: PERMISSIONS.EXPENSE_VERIFY,
        dueInDays: 2,
      },
    ],
  },
  {
    approvalNumber: 'APP-HO-2026-00004',
    type: 'EXPENSE',
    status: 'PENDING',
    requesterRole: 'ACCOUNTANT',
    title: '33/11kV Substation 1000kVA Transformer Advance Payment',
    description:
      'Procurement contract advance for Energypac Power Generation Ltd for Riverview Heights substation transformer fabrication.',
    entityType: 'Expense',
    useProjectId: true,
    amountPaisa: 125_000_000n,
    percentage: null,
    payload: {
      vendorName: 'Energypac Power Generation Ltd',
      equipmentType: '1000kVA Substation Transformer',
      contractRef: 'ENG-ELEC-2026-88',
    },
    currentStepOrder: 1,
    totalSteps: 1,
    daysToExpire: 6,
    steps: [
      {
        stepOrder: 1,
        name: 'Large Expense Authorization',
        status: 'PENDING',
        requiredPermission: PERMISSIONS.EXPENSE_VERIFY,
        dueInDays: 4,
      },
    ],
  },
  {
    approvalNumber: 'APP-HO-2026-00005',
    type: 'PRICE_EXCEPTION',
    status: 'PENDING',
    requesterRole: 'EXECUTIVE',
    title: 'Corner Plot Premium Waiver Request (Plot PLT-A-105)',
    description:
      'Client requested 50% waiver on corner plot premium charges due to access layout clearance.',
    entityType: 'Property',
    usePropertyId: true,
    useProjectId: true,
    amountPaisa: 25_000_000n,
    percentage: new Prisma.Decimal('5.00'),
    payload: {
      propertyCode: 'PLT-A-105',
      originalPremiumPaisa: '50000000',
      proposedPremiumPaisa: '25000000',
    },
    currentStepOrder: 1,
    totalSteps: 1,
    daysToExpire: 4,
    steps: [
      {
        stepOrder: 1,
        name: 'Property Discount Ceiling Price Exception',
        status: 'PENDING',
        requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER3,
        dueInDays: 2,
      },
    ],
  },
  {
    approvalNumber: 'APP-HO-2026-00006',
    type: 'REFUND',
    status: 'PENDING',
    requesterRole: 'ACCOUNTANT',
    title: 'Booking Cancellation Refund after Deductions (Mr. Mahbub Alam)',
    description:
      'NRB investor relocation cancellation. Refund after deducting 5% cancellation administrative charges as per agreement terms.',
    entityType: 'Refund',
    useProjectId: true,
    amountPaisa: 95_000_000n,
    percentage: null,
    payload: {
      customerName: 'Mr. Mahbub Alam',
      cancellationFeePct: 5.0,
      netRefundPaisa: '95000000',
    },
    currentStepOrder: 1,
    totalSteps: 1,
    daysToExpire: 5,
    steps: [
      {
        stepOrder: 1,
        name: 'Customer Refund Approval',
        status: 'PENDING',
        requiredPermission: PERMISSIONS.PAYMENT_REFUND,
        dueInDays: 3,
      },
    ],
  },
  {
    approvalNumber: 'APP-HO-2026-00007',
    type: 'DISCOUNT',
    status: 'APPROVED',
    requesterRole: 'EXECUTIVE',
    title: '1.5% Standard Early Bird Discount for Plot PLT-A-102',
    description: 'Early bird promotional launch discount cleared for initial batch booking.',
    entityType: 'Quotation',
    useQuotationId: true,
    useProjectId: true,
    amountPaisa: 8_100_000n,
    percentage: new Prisma.Decimal('1.50'),
    payload: {
      campaign: 'Purbachal Green City Early Launch',
      discountPercentage: 1.5,
    },
    currentStepOrder: 1,
    totalSteps: 1,
    completedDaysAgo: 1,
    finalDecision: 'APPROVED',
    daysToExpire: 10,
    steps: [
      {
        stepOrder: 1,
        name: 'Discount Tier 1 (Up to 2%)',
        status: 'APPROVED',
        requiredPermission: PERMISSIONS.DISCOUNT_APPROVE_TIER1,
        decidedDaysAgo: 1,
        decision: 'APPROVED',
        comments: 'Promotional quota verified within early-bird campaign limits.',
        approverRole: 'GM',
      },
    ],
  },
  {
    approvalNumber: 'APP-HO-2026-00008',
    type: 'EXPENSE',
    status: 'APPROVED',
    requesterRole: 'ACCOUNTANT',
    title: 'Consultancy Fee for Structural Design Review & BUET Vetting',
    description:
      'Expert structural vetting and seismic analysis clearance for Riverview Heights tower design.',
    entityType: 'Expense',
    useProjectId: true,
    amountPaisa: 35_000_000n,
    percentage: null,
    payload: {
      consultant: 'Center for Environmental and Geographic Information Services (CEGIS)',
      scope: 'Earthquake resistance & foundation review',
    },
    currentStepOrder: 1,
    totalSteps: 1,
    completedDaysAgo: 2,
    finalDecision: 'APPROVED',
    daysToExpire: 12,
    steps: [
      {
        stepOrder: 1,
        name: 'Standard Expense Verification',
        status: 'APPROVED',
        requiredPermission: PERMISSIONS.EXPENSE_VERIFY,
        decidedDaysAgo: 2,
        decision: 'APPROVED',
        comments: 'Vetting report received and validated by project director.',
        approverRole: 'MD',
      },
    ],
  },
];
