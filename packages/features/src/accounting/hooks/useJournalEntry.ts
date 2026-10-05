import {
  useJournalControllerCreateDraft,
  useJournalControllerCreateAndPost,
  useJournalControllerPostDraft,
  useJournalControllerReverseAndCorrect,
  CreateJournalDtoType,
} from '@exzaestate/api-client';
import type { JournalEntryInput, JournalReversalInput } from '../schemas/accounting.schema.js';

function toApiJournalType(type?: string): CreateJournalDtoType {
  if (type === 'REVERSAL') return CreateJournalDtoType.REVERSAL;
  if (type === 'OPENING') return CreateJournalDtoType.OPENING;
  if (type === 'SYSTEM') return CreateJournalDtoType.SYSTEM;
  return CreateJournalDtoType.GENERAL;
}

function formatJournalPayload(data: JournalEntryInput) {
  return {
    postingDate: data.postingDate,
    type: toApiJournalType(data.type),
    narration: data.narration,
    reference: data.reference ? data.reference.trim() : undefined,
    lines: data.lines.map((l) => ({
      accountId: l.accountId,
      debitPaisa: l.debitPaisa && l.debitPaisa !== '0' ? l.debitPaisa : undefined,
      creditPaisa: l.creditPaisa && l.creditPaisa !== '0' ? l.creditPaisa : undefined,
      description: l.description ? l.description.trim() : undefined,
      partyType: l.partyType || undefined,
      partyId: l.partyId || undefined,
      costCenter: l.costCenter || undefined,
      projectId: l.projectId || undefined,
    })),
  };
}

export function useJournalEntry() {
  const createDraftMutation = useJournalControllerCreateDraft();
  const createAndPostMutation = useJournalControllerCreateAndPost();
  const postDraftMutation = useJournalControllerPostDraft();
  const reverseMutation = useJournalControllerReverseAndCorrect();

  const handleSaveDraft = async (data: JournalEntryInput) => {
    const payload = formatJournalPayload(data);
    return await createDraftMutation.mutateAsync({
      data: payload,
    });
  };

  const handleCreateAndPost = async (data: JournalEntryInput) => {
    const payload = formatJournalPayload(data);
    return await createAndPostMutation.mutateAsync({
      data: payload,
    });
  };

  const handlePostExistingDraft = async (journalId: string) => {
    return await postDraftMutation.mutateAsync({
      id: journalId,
    });
  };

  const handleReverseJournal = async (input: JournalReversalInput) => {
    return await reverseMutation.mutateAsync({
      id: input.journalId,
      data: {
        reason: input.reason,
      },
    });
  };

  return {
    saveDraft: handleSaveDraft,
    createAndPost: handleCreateAndPost,
    postDraft: handlePostExistingDraft,
    reverseJournal: handleReverseJournal,
    isSubmitting:
      createDraftMutation.isPending ||
      createAndPostMutation.isPending ||
      postDraftMutation.isPending ||
      reverseMutation.isPending,
  };
}
