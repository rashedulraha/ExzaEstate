export type PaymentTerraceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED' | 'CANCELLED';

export interface PaymentTerraceItem {
  id: string;
  label: string;
  dueDate: string;
  amountPaisa: bigint | string;
  paidPaisa: bigint | string;
  status: PaymentTerraceStatus;
}

export interface PaymentTerraceProps {
  items: PaymentTerraceItem[];
  variant?: 'full' | 'compact';
  todayDate?: string;
  onSelectInstallment?: (item: PaymentTerraceItem) => void;
  className?: string;
}

export interface PaymentTerraceTotals {
  totalScheduled: bigint;
  totalPaid: bigint;
  totalDue: bigint;
  totalOverdue: bigint;
}
