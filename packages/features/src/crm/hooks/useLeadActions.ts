import { useQueryClient } from '@tanstack/react-query';
import {
  useCrmControllerCreateLead,
  useCrmControllerUpdateLead,
  useCrmControllerChangeLeadStatus,
  useCrmControllerAssignLead,
  useCrmControllerConvertLead,
  getCrmControllerListLeadsQueryKey,
  type CreateLeadDto,
  type UpdateLeadDto,
} from '@exzaestate/api-client';
import { useToast } from '@exzaestate/ui';
import type { CreateLeadInput, ConvertLeadInput, LeadStatusEnum } from '../schemas/crm.schema.js';

function toCreateLeadDto(data: CreateLeadInput): CreateLeadDto {
  return {
    name: data.fullName,
    phone: data.phone,
    source: data.source,
    email: data.email || undefined,
    budgetPaisa: data.budgetMaxPaisa || undefined,
    interestNotes: data.notes || undefined,
    preferredPropertyType: data.preferredType || undefined,
    assignedToId: data.assignedToId || undefined,
  };
}

function assignBasicLeadFields(dto: UpdateLeadDto, data: Partial<CreateLeadInput>) {
  if (data.fullName !== undefined) dto.name = data.fullName;
  if (data.phone !== undefined) dto.phone = data.phone;
  if (data.source !== undefined) dto.source = data.source;
  if (data.email !== undefined) dto.email = data.email ? data.email : undefined;
}

function assignPreferenceLeadFields(dto: UpdateLeadDto, data: Partial<CreateLeadInput>) {
  if (data.budgetMaxPaisa !== undefined)
    dto.budgetPaisa = data.budgetMaxPaisa ? data.budgetMaxPaisa : undefined;
  if (data.notes !== undefined) dto.interestNotes = data.notes ? data.notes : undefined;
  if (data.preferredType !== undefined)
    dto.preferredPropertyType = data.preferredType ? data.preferredType : undefined;
}

function toUpdateLeadDto(data: Partial<CreateLeadInput>): UpdateLeadDto {
  const dto: UpdateLeadDto = {};
  assignBasicLeadFields(dto, data);
  assignPreferenceLeadFields(dto, data);
  return dto;
}

export function useLeadActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const createMutation = useCrmControllerCreateLead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getCrmControllerListLeadsQueryKey() });
        showToast({
          family: 'success',
          title: 'Lead Created',
          description: 'New sales prospect has been added to the pipeline.',
        });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to create lead';
        showToast({ family: 'danger', title: 'Lead Creation Error', description: message });
      },
    },
  });

  const updateMutation = useCrmControllerUpdateLead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getCrmControllerListLeadsQueryKey() });
        showToast({
          family: 'success',
          title: 'Lead Updated',
          description: 'Lead details updated.',
        });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to update lead';
        showToast({ family: 'danger', title: 'Update Error', description: message });
      },
    },
  });

  const statusMutation = useCrmControllerChangeLeadStatus({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getCrmControllerListLeadsQueryKey() });
        showToast({
          family: 'success',
          title: 'Stage Updated',
          description: 'Lead moved to new pipeline stage.',
        });
      },
    },
  });

  const assignMutation = useCrmControllerAssignLead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getCrmControllerListLeadsQueryKey() });
        showToast({
          family: 'success',
          title: 'Lead Assigned',
          description: 'Executive ownership assigned.',
        });
      },
    },
  });

  const convertMutation = useCrmControllerConvertLead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getCrmControllerListLeadsQueryKey() });
        showToast({
          family: 'success',
          title: 'Lead Converted to Customer',
          description: 'Prospect has been converted to an official customer record.',
        });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Conversion failed';
        showToast({ family: 'danger', title: 'Conversion Failed', description: message });
      },
    },
  });

  return {
    createLead: (data: CreateLeadInput) =>
      createMutation.mutateAsync({ data: toCreateLeadDto(data) }),
    updateLead: (id: string, data: Partial<CreateLeadInput>) =>
      updateMutation.mutateAsync({ id, data: toUpdateLeadDto(data) }),
    changeStatus: (id: string, status: LeadStatusEnum) =>
      statusMutation.mutateAsync({ id, data: { status } }),
    assignLead: (id: string, assignedToId: string) =>
      assignMutation.mutateAsync({ id, data: { assignedToId } }),
    convertLead: (data: ConvertLeadInput) =>
      convertMutation.mutateAsync({
        id: data.leadId,
        data: { nid: data.nid, addressLine1: data.address, occupation: data.occupation },
      }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isConverting: convertMutation.isPending,
  };
}
