import { useState } from 'react';
import {
  useFollowUpControllerListFollowUps,
  useFollowUpControllerCompleteFollowUp,
  useFollowUpControllerCreateFollowUp,
  getFollowUpControllerListFollowUpsQueryKey,
} from '@exzaestate/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@exzaestate/ui';
import type { CreateFollowUpInput } from '../schemas/crm.schema.js';

export interface FollowUpItem {
  id: string;
  leadId: string;
  type: string;
  scheduledAt: string;
  notes: string;
  status: string;
  assignedToId?: string | null;
  assignedTo?: { id: string; fullName: string } | null;
  lead?: { id: string; fullName: string; phone: string } | null;
  createdAt: string;
  completedAt?: string | null;
}

export function useFollowUpList(leadId?: string) {
  const [page] = useState<number>(1);
  const [limit] = useState<number>(50);

  const queryParams: Record<string, string | number> = { page, limit };
  if (leadId) queryParams.leadId = leadId;

  const query = useFollowUpControllerListFollowUps(queryParams, {
    query: { staleTime: 30_000, refetchOnWindowFocus: false },
  });

  const raw = query.data;
  let followUps: FollowUpItem[] = [];
  if (Array.isArray(raw)) {
    followUps = raw as FollowUpItem[];
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      followUps = obj.items as FollowUpItem[];
    } else if (
      obj.data &&
      typeof obj.data === 'object' &&
      Array.isArray((obj.data as Record<string, unknown>).items)
    ) {
      followUps = (obj.data as { items: FollowUpItem[] }).items;
    }
  }

  const now = new Date();
  const overdueCount = followUps.filter(
    (f) => f.status.toUpperCase() === 'PENDING' && new Date(f.scheduledAt) < now,
  ).length;

  return {
    followUps,
    overdueCount,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useFollowUpActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const createMutation = useFollowUpControllerCreateFollowUp({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getFollowUpControllerListFollowUpsQueryKey(),
        });
        showToast({
          family: 'success',
          title: 'Follow-up Scheduled',
          description: 'Activity scheduled in timeline.',
        });
      },
    },
  });

  const completeMutation = useFollowUpControllerCompleteFollowUp({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getFollowUpControllerListFollowUpsQueryKey(),
        });
        showToast({
          family: 'success',
          title: 'Follow-up Completed',
          description: 'Activity marked as resolved.',
        });
      },
    },
  });

  return {
    createFollowUp: (data: CreateFollowUpInput) =>
      createMutation.mutateAsync({
        data: {
          leadId: data.leadId,
          type: data.type,
          dueDate: data.scheduledAt.slice(0, 10),
          dueTime: data.scheduledAt.length > 10 ? data.scheduledAt.slice(11, 16) : undefined,
          notes: data.notes,
        },
      }),
    completeFollowUp: (id: string, outcomeNotes?: string) =>
      completeMutation.mutateAsync({ id, data: { outcome: outcomeNotes ?? 'Completed' } }),
    isCreating: createMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}
