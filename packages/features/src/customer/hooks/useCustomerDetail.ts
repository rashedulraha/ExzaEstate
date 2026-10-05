import {
  useCustomerControllerGetCustomerById,
  useCustomerControllerGetCustomerTimeline,
} from '@exzaestate/api-client';

export interface CoBuyerItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  nid: string;
  maskedNid?: string | null;
  relation: string;
  sharePercentage: number;
}

export interface NomineeItem {
  id: string;
  fullName: string;
  phone: string;
  nid: string;
  maskedNid?: string | null;
  relation: string;
  sharePercentage: number;
}

export interface CustomerDocumentItem {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string;
  createdAt: string;
}

export interface CustomerTimelineItem {
  id: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actorName?: string | null;
}

export interface CustomerDetailRecord {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string | null;
  nid?: string | null;
  maskedNid?: string | null;
  kycStatus: string;
  kycVerifiedAt?: string | null;
  kycRemarks?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  spouseName?: string | null;
  dateOfBirth?: string | null;
  occupation?: string | null;
  tin?: string | null;
  emergencyContact?: string | null;
  address?: string | null;
  coBuyers?: CoBuyerItem[];
  nominees?: NomineeItem[];
  documents?: CustomerDocumentItem[];
  createdAt: string;
  updatedAt: string;
}

export function useCustomerDetail(customerId: string) {
  const customerQuery = useCustomerControllerGetCustomerById(customerId, {
    query: {
      enabled: !!customerId,
      staleTime: 30_000,
    },
  });

  const timelineQuery = useCustomerControllerGetCustomerTimeline(customerId, {
    query: {
      enabled: !!customerId,
      staleTime: 30_000,
    },
  });

  const rawCustomer = customerQuery.data as Record<string, unknown> | undefined;
  const customer: CustomerDetailRecord | null =
    (rawCustomer && 'id' in rawCustomer
      ? (rawCustomer as unknown as CustomerDetailRecord)
      : (rawCustomer?.data as CustomerDetailRecord | undefined)) ?? null;

  const rawTimeline: unknown = timelineQuery.data;
  let timeline: CustomerTimelineItem[] = [];
  if (Array.isArray(rawTimeline)) {
    timeline = rawTimeline as CustomerTimelineItem[];
  } else if (rawTimeline && typeof rawTimeline === 'object' && 'data' in rawTimeline) {
    const nested = (rawTimeline as Record<string, unknown>).data;
    if (Array.isArray(nested)) {
      timeline = nested as CustomerTimelineItem[];
    }
  }

  return {
    customer,
    timeline,
    isLoading: customerQuery.isLoading,
    isTimelineLoading: timelineQuery.isLoading,
    isError: customerQuery.isError,
    error: customerQuery.error,
    refetch: () => {
      void customerQuery.refetch();
      void timelineQuery.refetch();
    },
  };
}
