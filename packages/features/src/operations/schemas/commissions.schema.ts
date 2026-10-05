export interface BrokerItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  nid?: string | null;
  tin?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNumber?: string | null;
  routingNumber?: string | null;
  isActive: boolean;
  totalCommissionEarnedPaisa?: string;
  totalCommissionPaidPaisa?: string;
  outstandingCommissionPaisa?: string;
}

export interface CreateBrokerInput {
  name: string;
  phone: string;
  email?: string;
  nid?: string;
  tin?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountNumber?: string;
  routingNumber?: string;
  isActive?: boolean;
}

export const COMMISSION_CALC_TYPES = [
  'PERCENT_NET_PRICE',
  'FIXED_AMOUNT',
  'PERCENT_COLLECTED',
] as const;
export type CommissionCalcTypeEnum = (typeof COMMISSION_CALC_TYPES)[number];

export const COMMISSION_TRIGGER_EVENTS = [
  'ON_CONFIRMED',
  'ON_AGREEMENT',
  'ON_COLLECTION_PCT',
] as const;
export type CommissionTriggerEventEnum = (typeof COMMISSION_TRIGGER_EVENTS)[number];

export interface CommissionRuleItem {
  id: string;
  name: string;
  projectId?: string | null;
  projectName?: string | null;
  calculationType: CommissionCalcTypeEnum;
  percentage?: number | null;
  fixedAmountPaisa?: string | null;
  triggerEvent: CommissionTriggerEventEnum;
  isActive: boolean;
}

export interface CreateCommissionRuleInput {
  name: string;
  projectId?: string;
  calculationType?: CommissionCalcTypeEnum;
  percentage?: number;
  fixedAmountPaisa?: string;
  triggerEvent?: CommissionTriggerEventEnum;
  isActive?: boolean;
}

export const COMMISSION_STATUS = {
  EARNED: 'EARNED',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
  REVERSED: 'REVERSED',
} as const;
export type CommissionStatusEnum = (typeof COMMISSION_STATUS)[keyof typeof COMMISSION_STATUS];

export interface CommissionPayableItem {
  id: string;
  brokerId: string;
  brokerName: string;
  bookingId: string;
  bookingNumber: string;
  customerName?: string;
  propertyName?: string;
  amountPaisa: string;
  status: CommissionStatusEnum;
  earnedAt: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  reversedAt?: string | null;
  isClawback?: boolean;
}

export interface PayCommissionInput {
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  bankAccountId?: string;
  bankAccountCode?: string;
  reference?: string;
  notes?: string;
}
