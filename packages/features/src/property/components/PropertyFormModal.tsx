import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import { Money } from '@exzaestate/shared';
import type { CreatePropertyDto, UpdatePropertyDto } from '@exzaestate/api-client';
import { createPropertySchema, type CreatePropertyInput } from '../schemas/property.schema.js';
import { usePropertyActions } from '../hooks/usePropertyActions.js';
import type { PropertyItem } from '../hooks/usePropertyList.js';
import {
  PropertyIdentificationFields,
  PropertyLocationFields,
  PropertyPricingFields,
} from './PropertyFormSections.js';

export interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  property?: PropertyItem | null;
  defaultProjectId?: string;
}

function toCreateDto(data: CreatePropertyInput): CreatePropertyDto {
  return {
    projectId: data.projectId,
    blockId: data.blockId || undefined,
    floorId: data.floorId || undefined,
    code: data.code,
    title: data.title || undefined,
    type: data.type as CreatePropertyDto['type'],
    areaSqft: data.areaSqft,
    facing: (data.facing || undefined) as CreatePropertyDto['facing'],
    basePricePaisa: data.basePricePaisa,
    premiumPaisa: data.premiumPaisa || undefined,
    discountLimitPct: data.discountLimitPct || undefined,
    ownerType: data.ownerType as CreatePropertyDto['ownerType'],
    description: data.description || undefined,
  };
}

function toUpdateDto(data: CreatePropertyInput): UpdatePropertyDto {
  return {
    title: data.title || undefined,
    areaSqft: data.areaSqft,
    facing: (data.facing || undefined) as UpdatePropertyDto['facing'],
    basePricePaisa: data.basePricePaisa,
    premiumPaisa: data.premiumPaisa || undefined,
    discountLimitPct: data.discountLimitPct || undefined,
    ownerType: data.ownerType as UpdatePropertyDto['ownerType'],
    description: data.description || undefined,
  };
}

const DEFAULT_FORM_VALUES: CreatePropertyInput = {
  projectId: '',
  blockId: '',
  floorId: '',
  code: '',
  title: '',
  type: 'FLAT',
  areaSqft: '',
  facing: '',
  basePricePaisa: '',
  premiumPaisa: '0',
  discountLimitPct: '0',
  ownerType: 'COMPANY',
  description: '',
};

function propertyToFormValues(property: PropertyItem): CreatePropertyInput {
  return {
    projectId: property.projectId,
    blockId: property.blockId || '',
    floorId: property.floorId || '',
    code: property.code,
    title: property.title || '',
    type: (property.type as CreatePropertyInput['type']) || 'FLAT',
    areaSqft: property.areaSqft,
    facing: (property.facing as CreatePropertyInput['facing']) || '',
    basePricePaisa: property.basePricePaisa,
    premiumPaisa: property.premiumPaisa || '0',
    discountLimitPct: property.discountLimitPct || '0',
    ownerType: (property.ownerType as CreatePropertyInput['ownerType']) || 'COMPANY',
    description: property.description || '',
  };
}

export function PropertyFormModal({
  isOpen,
  onClose,
  property,
  defaultProjectId = '0192a000-0000-7000-8000-000000000001',
}: PropertyFormModalProps) {
  const isEdit = Boolean(property);
  const { createProperty, updateProperty, isCreating, isUpdating } = usePropertyActions();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: { ...DEFAULT_FORM_VALUES, projectId: defaultProjectId },
  });

  useEffect(() => {
    if (property) {
      reset(propertyToFormValues(property));
    } else {
      reset({ ...DEFAULT_FORM_VALUES, projectId: defaultProjectId });
    }
  }, [property, defaultProjectId, reset, isOpen]);

  const watchedBasePrice = watch('basePricePaisa');
  const watchedPremium = watch('premiumPaisa');
  const watchedArea = watch('areaSqft');

  const calculatedNetPrice = useMemo(() => {
    try {
      const base = watchedBasePrice ? BigInt(watchedBasePrice.trim()) : 0n;
      const prem = watchedPremium ? BigInt(watchedPremium.trim()) : 0n;
      return Money.add(base, prem);
    } catch {
      return 0n;
    }
  }, [watchedBasePrice, watchedPremium]);

  const calculatedKatha = useMemo(() => {
    const num = Number(watchedArea);
    if (!isNaN(num) && num > 0) {
      return (num / 720).toFixed(2);
    }
    return null;
  }, [watchedArea]);

  const onSubmit = async (data: CreatePropertyInput) => {
    try {
      if (isEdit && property) {
        await updateProperty(property.id, toUpdateDto(data));
      } else {
        await createProperty(toCreateDto(data));
      }
      onClose();
    } catch {
      // Handled by toast notifications
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Property: ${property?.code}` : 'Add Property Unit'}
      description="Enter the unit dimensions, boundary parameters, and BDT pricing breakdown."
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isCreating || isUpdating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={isCreating || isUpdating}
          >
            {isEdit ? 'Save Changes' : 'Create Property'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <PropertyIdentificationFields
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
          isEdit={isEdit}
        />

        <PropertyLocationFields
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
          calculatedKatha={calculatedKatha}
        />

        <PropertyPricingFields
          register={register}
          errors={errors}
          calculatedNetPrice={calculatedNetPrice}
        />

        <div className="space-y-3">
          <FormField
            id="property-description"
            label="Description & Boundary Notes"
            error={errors.description?.message}
          >
            <Input
              id="property-description"
              {...register('description')}
              placeholder="Boundary marks, road width, khasra details, etc."
              aria-invalid={!!errors.description}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
