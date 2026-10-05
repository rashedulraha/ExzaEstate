import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Select, Button } from '@exzaestate/ui';
import {
  createFollowUpSchema,
  type CreateFollowUpInput,
  FOLLOW_UP_TYPES,
} from '../schemas/crm.schema.js';
import type { LeadItem } from '../hooks/useLeadList.js';

interface FollowUpModalProps {
  lead: LeadItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFollowUpInput) => Promise<void>;
  isLoading?: boolean;
}

export function FollowUpModal({
  lead,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: FollowUpModalProps): ReactElement | null {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateFollowUpInput>({
    resolver: zodResolver(createFollowUpSchema),
    values: {
      leadId: lead?.id ?? '',
      scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      type: 'CALL',
      notes: '',
    },
  });

  if (!lead) return null;

  const handleFormSubmit = async (data: CreateFollowUpInput) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Schedule Activity: ${lead.fullName}`}
      description="Plan a sales touchpoint, site visit, or negotiation call."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            Save Activity
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          id="followup-type"
          label="Activity Channel"
          required
          error={errors.type?.message}
        >
          <Select
            id="followup-type"
            value={watch('type')}
            onChange={(val) =>
              setValue('type', val as CreateFollowUpInput['type'], {
                shouldValidate: true,
              })
            }
            options={FOLLOW_UP_TYPES.map((t) => ({ label: t, value: t }))}
          />
        </FormField>

        <FormField
          id="followup-scheduledAt"
          label="Scheduled Date & Time"
          required
          error={errors.scheduledAt?.message}
          helperText="Time is recorded and evaluated in Asia/Dhaka."
        >
          <Input
            id="followup-scheduledAt"
            type="datetime-local"
            {...register('scheduledAt')}
            aria-invalid={!!errors.scheduledAt}
          />
        </FormField>

        <FormField
          id="followup-notes"
          label="Action Agenda / Notes"
          required
          error={errors.notes?.message}
        >
          <Input
            id="followup-notes"
            {...register('notes')}
            placeholder="e.g. Discuss flat 3A price discount & parking space"
            aria-invalid={!!errors.notes}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
