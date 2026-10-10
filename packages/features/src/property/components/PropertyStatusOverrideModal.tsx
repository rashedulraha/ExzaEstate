import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Button, Input, FormField, Select } from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { AlertTriangle } from 'lucide-react';
import {
  statusOverrideSchema,
  type StatusOverrideInput,
  type CanonicalPropertyStatusEnum,
  CANONICAL_PROPERTY_STATUSES,
} from '../schemas/property.schema.js';
import { usePropertyActions } from '../hooks/usePropertyActions.js';
import type { PropertyItem } from '../hooks/usePropertyList.js';

export interface PropertyStatusOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyItem | null;
}

export function PropertyStatusOverrideModal({
  isOpen,
  onClose,
  property,
}: PropertyStatusOverrideModalProps) {
  const { overrideStatus, isOverriding } = usePropertyActions();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StatusOverrideInput>({
    resolver: zodResolver(statusOverrideSchema),
    defaultValues: {
      targetStatus: 'Available',
      reason: '',
    },
  });

  if (!property) return null;

  const availableStatuses = CANONICAL_PROPERTY_STATUSES.filter(
    (s) => s.toLowerCase() !== property.status.toLowerCase(),
  );

  const onSubmit = async (data: StatusOverrideInput) => {
    try {
      await overrideStatus(property.id, {
        targetStatus: data.targetStatus,
        reason: data.reason,
      });
      reset();
      onClose();
    } catch {
      // Handled by toast notifications
    }
  };

  return (
    <PermissionGate permission={PERMISSIONS.PROPERTY_OVERRIDE_STATUS}>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={`Elevated Status Override: ${property.code}`}
        description="Force-transition this property unit's status. All overrides are recorded in the immutable security audit log."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={onClose} disabled={isOverriding}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmit(onSubmit)} isLoading={isOverriding}>
              Override Status
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3.5 bg-warning/12 border border-warning/30 rounded-card text-warning">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-small">
              <strong className="font-semibold">Elevated Administrative Action</strong>
              <p className="text-caption mt-0.5 text-warning/90">
                Current status is <span className="font-bold">{property.status}</span>. Overriding
                will bypass normal booking/cancellation workflows and record an executive audit
                event under company inventory policy.
              </p>
            </div>
          </div>

          <FormField
            id="override-target-status"
            label="New Target Status"
            required
            error={errors.targetStatus?.message}
          >
            <Select
              id="override-target-status"
              value={watch('targetStatus')}
              onChange={(val) =>
                setValue('targetStatus', val as CanonicalPropertyStatusEnum, {
                  shouldValidate: true,
                })
              }
              options={availableStatuses.map((s) => ({ label: s, value: s }))}
              isError={!!errors.targetStatus}
            />
          </FormField>

          <FormField
            id="override-reason"
            label="Mandatory Business Justification"
            required
            error={errors.reason?.message}
            helperText="State the administrative rationale, approval reference, or legal resolution."
          >
            <Input
              id="override-reason"
              {...register('reason')}
              placeholder="e.g. Management approval memo #2026-92; customer waived claim"
              aria-invalid={!!errors.reason}
            />
          </FormField>
        </form>
      </Dialog>
    </PermissionGate>
  );
}
