import { useQueryClient } from '@tanstack/react-query';
import {
  useAgreementControllerGenerateAgreement,
  useAgreementControllerSignAndLockAgreement,
  getAgreementControllerListAgreementsQueryKey,
} from '@exzaestate/api-client';
import { useToast } from '@exzaestate/ui';
import type {
  GenerateAgreementInput,
  SignAndLockAgreementInput,
} from '../schemas/agreement.schema.js';

export function useAgreementActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: getAgreementControllerListAgreementsQueryKey(),
    });
  };

  const generateMutation = useAgreementControllerGenerateAgreement({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Agreement Generated',
          description: 'Official legal allotment agreement drafted from template.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Agreement generation failed';
        showToast({ family: 'danger', title: 'Generation Error', description: msg });
      },
    },
  });

  const signAndLockMutation = useAgreementControllerSignAndLockAgreement({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Agreement Signed & Locked',
          description: 'Legal instrument locked. Modifications will generate version increment.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Lock operation failed';
        showToast({ family: 'danger', title: 'Lock Error', description: msg });
      },
    },
  });

  return {
    generateAgreement: (data: GenerateAgreementInput) =>
      generateMutation.mutateAsync({
        data: {
          bookingId: data.bookingId,
          templateId: data.templateId || undefined,
          title: data.title,
          terms: data.terms,
          customContent: data.customContent,
        },
      }),
    signAndLockAgreement: (id: string, data: SignAndLockAgreementInput) =>
      signAndLockMutation.mutateAsync({
        id,
        data: {
          documentId: data.documentId || undefined,
          notes: data.notes,
        },
      }),
    isGenerating: generateMutation.isPending,
    isSigningAndLocking: signAndLockMutation.isPending,
  };
}
