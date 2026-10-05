import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@exzaestate/ui';
import {
  usePropertyControllerCreateProperty,
  usePropertyControllerUpdateProperty,
  usePropertyControllerDeleteProperty,
  usePropertyControllerHoldProperty,
  usePropertyControllerReleaseHold,
  usePropertyControllerBlockProperty,
  usePropertyControllerUnblockProperty,
  usePropertyControllerOverrideStatus,
  usePropertyControllerPreviewPricing,
  type CreatePropertyDto,
  type UpdatePropertyDto,
  type HoldPropertyDto,
  type BlockPropertyDto,
  type StatusOverrideDto,
  type PricingPreviewDto,
} from '@exzaestate/api-client';

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      message?: string;
      error?: string;
      response?: { data?: { message?: string } };
    };
    if (err.response?.data?.message) return err.response.data.message;
    if (err.message) return err.message;
  }
  return fallback;
}

export function usePropertyActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const invalidatePropertyList = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/properties'] });
  };

  const createMutation = usePropertyControllerCreateProperty({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'success',
          title: 'Property Created',
          description: 'The property unit was successfully added to inventory.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Creation Failed',
          description: getErrorMessage(err, 'Failed to create property unit.'),
        });
      },
    },
  });

  const updateMutation = usePropertyControllerUpdateProperty({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'success',
          title: 'Property Updated',
          description: 'The property details have been saved.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Update Failed',
          description: getErrorMessage(err, 'Failed to update property details.'),
        });
      },
    },
  });

  const deleteMutation = usePropertyControllerDeleteProperty({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'success',
          title: 'Property Deleted',
          description: 'The property unit has been soft-deleted.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Deletion Failed',
          description: getErrorMessage(err, 'Could not delete property.'),
        });
      },
    },
  });

  const holdMutation = usePropertyControllerHoldProperty({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'success',
          title: 'Hold Placed',
          description: 'Property placed on management hold.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Hold Failed',
          description: getErrorMessage(err, 'Could not place property on hold.'),
        });
      },
    },
  });

  const releaseHoldMutation = usePropertyControllerReleaseHold({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'success',
          title: 'Hold Released',
          description: 'Property has returned to Available status.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Release Failed',
          description: getErrorMessage(err, 'Could not release hold.'),
        });
      },
    },
  });

  const blockMutation = usePropertyControllerBlockProperty({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'success',
          title: 'Property Blocked',
          description: 'Unit blocked from sale.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Block Failed',
          description: getErrorMessage(err, 'Could not block property.'),
        });
      },
    },
  });

  const unblockMutation = usePropertyControllerUnblockProperty({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'success',
          title: 'Property Unblocked',
          description: 'Unit has returned to Available status.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Unblock Failed',
          description: getErrorMessage(err, 'Could not unblock property.'),
        });
      },
    },
  });

  const overrideMutation = usePropertyControllerOverrideStatus({
    mutation: {
      onSuccess: () => {
        showToast({
          family: 'warning',
          title: 'Status Overridden',
          description: 'Property status was forcefully changed and logged to audit trail.',
        });
        invalidatePropertyList();
      },
      onError: (err) => {
        showToast({
          family: 'danger',
          title: 'Override Failed',
          description: getErrorMessage(err, 'Status override was rejected.'),
        });
      },
    },
  });

  const previewPricingMutation = usePropertyControllerPreviewPricing();

  return {
    createProperty: (data: CreatePropertyDto) => createMutation.mutateAsync({ data }),
    updateProperty: (id: string, data: UpdatePropertyDto) =>
      updateMutation.mutateAsync({ id, data }),
    deleteProperty: (id: string) => deleteMutation.mutateAsync({ id }),
    holdProperty: (id: string, data: HoldPropertyDto) => holdMutation.mutateAsync({ id, data }),
    releaseHold: (id: string) => releaseHoldMutation.mutateAsync({ id }),
    blockProperty: (id: string, data: BlockPropertyDto) => blockMutation.mutateAsync({ id, data }),
    unblockProperty: (id: string) => unblockMutation.mutateAsync({ id }),
    overrideStatus: (id: string, data: StatusOverrideDto) =>
      overrideMutation.mutateAsync({ id, data }),
    previewPricing: (data: PricingPreviewDto) => previewPricingMutation.mutateAsync({ data }),

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isHolding: holdMutation.isPending,
    isReleasingHold: releaseHoldMutation.isPending,
    isBlocking: blockMutation.isPending,
    isUnblocking: unblockMutation.isPending,
    isOverriding: overrideMutation.isPending,
    isPreviewingPricing: previewPricingMutation.isPending,
  };
}
