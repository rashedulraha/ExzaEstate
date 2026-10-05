import { useQueryClient } from '@tanstack/react-query';
import {
  useCustomerControllerCreateCustomer,
  useCustomerControllerUpdateCustomer,
  useCustomerControllerAddCoBuyer,
  useCustomerControllerAddNominee,
  useCustomerControllerVerifyKyc,
  useCustomerControllerAttachDocument,
  getCustomerControllerListCustomersQueryKey,
  getCustomerControllerGetCustomerByIdQueryKey,
  type CreateCustomerDto,
  type CreateCustomerCoBuyerDto,
  type CreateCustomerNomineeDto,
  type VerifyKycDto,
  type AttachCustomerDocumentDto,
} from '@exzaestate/api-client';
import { useToast } from '@exzaestate/ui';
import type {
  CreateCustomerInput,
  CoBuyerInput,
  NomineeInput,
  VerifyKycInput,
} from '../schemas/customer.schema.js';

function toCreateCustomerDto(data: CreateCustomerInput): CreateCustomerDto {
  return {
    name: data.fullName,
    phone: data.phone,
    email: data.email || undefined,
    nid: data.nid,
    fatherOrSpouseName: data.fatherName || data.spouseName || undefined,
    motherName: data.motherName || undefined,
    dateOfBirth: data.dateOfBirth || undefined,
    occupation: data.occupation || undefined,
  };
}

function toCreateCustomerCoBuyerDto(data: CoBuyerInput): CreateCustomerCoBuyerDto {
  return {
    name: data.fullName,
    phone: data.phone,
    email: data.email || undefined,
    nid: data.nid || undefined,
    relationship: data.relation,
    sharePercentage: data.sharePercentage,
  };
}

function toCreateCustomerNomineeDto(data: NomineeInput): CreateCustomerNomineeDto {
  return {
    name: data.fullName,
    phone: data.phone,
    nid: data.nid || undefined,
    relationship: data.relation,
    sharePercentage: data.sharePercentage,
  };
}

function toVerifyKycDto(data: VerifyKycInput): VerifyKycDto {
  return {
    notes: data.remarks,
  };
}

function toAttachCustomerDocumentDto(data: {
  title: string;
  category?: string;
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}): AttachCustomerDocumentDto {
  return {
    title: data.title,
    category: data.category || 'OTHER',
    fileKey: data.fileKey || `docs/${Date.now()}-${data.title.toLowerCase().replace(/\s+/g, '-')}`,
    fileName: data.fileName || `${data.title}.pdf`,
    mimeType: data.mimeType || 'application/pdf',
    sizeBytes: data.sizeBytes || 1024,
  };
}

export function useCustomerActions(customerId?: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getCustomerControllerListCustomersQueryKey() });
    if (customerId) {
      void queryClient.invalidateQueries({
        queryKey: getCustomerControllerGetCustomerByIdQueryKey(customerId),
      });
    }
  };

  const createMutation = useCustomerControllerCreateCustomer({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Customer Created',
          description: 'Customer 360 profile initialized.',
        });
      },
    },
  });

  const updateMutation = useCustomerControllerUpdateCustomer({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Profile Updated',
          description: 'Customer details saved.',
        });
      },
    },
  });

  const coBuyerMutation = useCustomerControllerAddCoBuyer({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Joint Buyer Added',
          description: 'Co-buyer linked with ownership share.',
        });
      },
    },
  });

  const nomineeMutation = useCustomerControllerAddNominee({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Nominee Added',
          description: 'Legal beneficiary registered.',
        });
      },
    },
  });

  const kycMutation = useCustomerControllerVerifyKyc({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'KYC Status Updated',
          description: 'Verification audit event recorded.',
        });
      },
    },
  });

  const docMutation = useCustomerControllerAttachDocument({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Document Attached',
          description: 'File linked to customer profile.',
        });
      },
    },
  });

  return {
    createCustomer: (data: CreateCustomerInput) =>
      createMutation.mutateAsync({ data: toCreateCustomerDto(data) }),
    updateCustomer: (id: string, data: Partial<CreateCustomerInput>) =>
      updateMutation.mutateAsync({
        id,
        data: { name: data.fullName, phone: data.phone, email: data.email || undefined },
      }),
    addCoBuyer: (id: string, data: CoBuyerInput) =>
      coBuyerMutation.mutateAsync({ id, data: toCreateCustomerCoBuyerDto(data) }),
    addNominee: (id: string, data: NomineeInput) =>
      nomineeMutation.mutateAsync({ id, data: toCreateCustomerNomineeDto(data) }),
    verifyKyc: (id: string, data: VerifyKycInput) =>
      kycMutation.mutateAsync({ id, data: toVerifyKycDto(data) }),
    attachDocument: (
      id: string,
      data: {
        title: string;
        category?: string;
        fileKey?: string;
        fileName?: string;
        mimeType?: string;
        sizeBytes?: number;
      },
    ) => docMutation.mutateAsync({ id, data: toAttachCustomerDocumentDto(data) }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isAddingCoBuyer: coBuyerMutation.isPending,
    isAddingNominee: nomineeMutation.isPending,
    isVerifyingKyc: kycMutation.isPending,
  };
}
