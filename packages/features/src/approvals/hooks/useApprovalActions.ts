import { useQueryClient } from '@tanstack/react-query';
import {
  useApprovalsControllerApprove,
  useApprovalsControllerReject,
  useApprovalsControllerOverride,
  getApprovalsControllerGetInboxQueryKey,
} from '@exzaestate/api-client';
import { useToast } from '@exzaestate/ui';

export function useApprovalActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getApprovalsControllerGetInboxQueryKey() });
  };

  const approveMutation = useApprovalsControllerApprove({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Request Approved',
          description: 'The approval tier has recorded your sign-off.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Approval failed';
        showToast({ family: 'danger', title: 'Approval Error', description: msg });
      },
    },
  });

  const rejectMutation = useApprovalsControllerReject({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'info',
          title: 'Request Rejected',
          description: 'The request has been rejected with justification.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Rejection failed';
        showToast({ family: 'danger', title: 'Rejection Error', description: msg });
      },
    },
  });

  const overrideMutation = useApprovalsControllerOverride({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'warning',
          title: 'Executive Override Recorded',
          description: 'Joint control override executed and logged to audit trail.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Override failed';
        showToast({ family: 'danger', title: 'Override Error', description: msg });
      },
    },
  });

  return {
    approve: (id: string, comments?: string) =>
      approveMutation.mutateAsync({ id, data: { comments } }),
    reject: (id: string, reason: string) => rejectMutation.mutateAsync({ id, data: { reason } }),
    override: (id: string, reason: string) =>
      overrideMutation.mutateAsync({ id, data: { reason } }),
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isOverriding: overrideMutation.isPending,
  };
}
