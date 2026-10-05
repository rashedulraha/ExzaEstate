import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, FormField, Input, Button } from '@exzaestate/ui';
import { convertLeadSchema, type ConvertLeadInput } from '../schemas/crm.schema.js';
import type { LeadItem } from '../hooks/useLeadList.js';

interface LeadConvertModalProps {
  lead: LeadItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (data: ConvertLeadInput) => Promise<void>;
  isLoading?: boolean;
}

export function LeadConvertModal({
  lead,
  isOpen,
  onClose,
  onConvert,
  isLoading,
}: LeadConvertModalProps): ReactElement | null {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConvertLeadInput>({
    resolver: zodResolver(convertLeadSchema),
    values: {
      leadId: lead?.id ?? '',
      nid: '',
      address: '',
      occupation: '',
    },
  });

  if (!lead) return null;

  const handleFormSubmit = async (data: ConvertLeadInput) => {
    await onConvert(data);
    reset();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert Prospect: ${lead.fullName}`}
      description="Convert this sales lead into an official customer entity for booking contracts."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            Confirm Conversion
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="p-3 bg-surface-sunken rounded-card border border-border text-small space-y-1">
          <p className="font-semibold text-text">{lead.fullName}</p>
          <p className="text-caption text-text-muted">
            Phone: {lead.phone} • Email: {lead.email || '—'}
          </p>
        </div>

        <FormField
          id="convert-nid"
          label="Bangladeshi National ID (NID)"
          required
          error={errors.nid?.message}
          helperText="Must be 10 (smart), 13, or 17 digit national identity number."
        >
          <Input
            id="convert-nid"
            {...register('nid')}
            placeholder="e.g. 19901234567890123"
            aria-invalid={!!errors.nid}
          />
        </FormField>

        <FormField
          id="convert-address"
          label="Primary Residential Address"
          required
          error={errors.address?.message}
        >
          <Input
            id="convert-address"
            {...register('address')}
            placeholder="e.g. House 14, Road 7, Block D, Banani, Dhaka"
            aria-invalid={!!errors.address}
          />
        </FormField>

        <FormField
          id="convert-occupation"
          label="Occupation / Profession (Optional)"
          error={errors.occupation?.message}
        >
          <Input
            id="convert-occupation"
            {...register('occupation')}
            placeholder="e.g. Senior Software Architect / Business Owner"
            aria-invalid={!!errors.occupation}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
