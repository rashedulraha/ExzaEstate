import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { FormField, Input, Select } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import {
  type CreatePropertyInput,
  PROPERTY_TYPES,
  FACING_DIRECTIONS,
  OWNER_TYPES,
  type PropertyTypeEnum,
  type FacingDirectionEnum,
  type OwnerTypeEnum,
} from '../schemas/property.schema.js';

interface FormSectionBaseProps {
  register: UseFormRegister<CreatePropertyInput>;
  watch: UseFormWatch<CreatePropertyInput>;
  setValue: UseFormSetValue<CreatePropertyInput>;
  errors: FieldErrors<CreatePropertyInput>;
}

export function PropertyIdentificationFields({
  register,
  watch,
  setValue,
  errors,
  isEdit,
}: FormSectionBaseProps & { isEdit: boolean }) {
  return (
    <div className="space-y-3">
      <h4 className="text-th border-b border-border pb-1">Basic Identification</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <FormField id="property-code" label="Unit Code" required error={errors.code?.message}>
          <Input
            id="property-code"
            {...register('code')}
            placeholder="e.g. FLAT-A3 or PLOT-12"
            disabled={isEdit}
            aria-invalid={!!errors.code}
          />
        </FormField>

        <FormField id="property-title" label="Unit Title" error={errors.title?.message}>
          <Input
            id="property-title"
            {...register('title')}
            placeholder="e.g. 3BHK Corner Facing Unit"
            aria-invalid={!!errors.title}
          />
        </FormField>

        <FormField id="property-type" label="Property Type" required error={errors.type?.message}>
          <Select
            id="property-type"
            value={watch('type')}
            onChange={(val) => setValue('type', val as PropertyTypeEnum, { shouldValidate: true })}
            options={PROPERTY_TYPES.map((t) => ({ label: t, value: t }))}
            isError={!!errors.type}
          />
        </FormField>

        <FormField
          id="property-owner-type"
          label="Owner Type"
          required
          error={errors.ownerType?.message}
        >
          <Select
            id="property-owner-type"
            value={watch('ownerType')}
            onChange={(val) =>
              setValue('ownerType', val as OwnerTypeEnum, { shouldValidate: true })
            }
            options={OWNER_TYPES.map((o) => ({ label: o, value: o }))}
            isError={!!errors.ownerType}
          />
        </FormField>
      </div>
    </div>
  );
}

export function PropertyLocationFields({
  register,
  watch,
  setValue,
  errors,
  calculatedKatha,
}: FormSectionBaseProps & { calculatedKatha: string | null }) {
  return (
    <div className="space-y-3">
      <h4 className="text-th border-b border-border pb-1">Location & Dimensions</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <FormField
          id="property-area"
          label="Area in Square Feet"
          required
          error={errors.areaSqft?.message}
          helperText={calculatedKatha ? `≈ ${calculatedKatha} katha` : undefined}
        >
          <Input
            id="property-area"
            {...register('areaSqft')}
            placeholder="e.g. 1450"
            aria-invalid={!!errors.areaSqft}
          />
        </FormField>

        <FormField id="property-facing" label="Facing Direction" error={errors.facing?.message}>
          <Select
            id="property-facing"
            value={watch('facing') ?? ''}
            onChange={(val) =>
              setValue('facing', val as FacingDirectionEnum, { shouldValidate: true })
            }
            options={[
              { label: 'Select facing...', value: '' },
              ...FACING_DIRECTIONS.map((f) => ({
                label: f.replace('_', ' '),
                value: f,
              })),
            ]}
            isError={!!errors.facing}
          />
        </FormField>

        <FormField id="property-block-id" label="Block ID" error={errors.blockId?.message}>
          <Input
            id="property-block-id"
            {...register('blockId')}
            placeholder="Optional Block UUID"
            aria-invalid={!!errors.blockId}
          />
        </FormField>

        <FormField id="property-floor-id" label="Floor / Road ID" error={errors.floorId?.message}>
          <Input
            id="property-floor-id"
            {...register('floorId')}
            placeholder="Optional Floor UUID"
            aria-invalid={!!errors.floorId}
          />
        </FormField>
      </div>
    </div>
  );
}

export function PropertyPricingFields({
  register,
  errors,
  calculatedNetPrice,
}: Omit<FormSectionBaseProps, 'watch' | 'setValue'> & { calculatedNetPrice: bigint }) {
  return (
    <div className="space-y-3">
      <h4 className="text-th border-b border-border pb-1">Pricing Breakdown</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <FormField
          id="property-base-price"
          label="Base Price (Paisa)"
          required
          error={errors.basePricePaisa?.message}
          helperText="1 BDT = 100 Paisa (e.g. ৳50,00,000 = 500000000 paisa)"
        >
          <Input
            id="property-base-price"
            {...register('basePricePaisa')}
            placeholder="e.g. 1200000000"
            aria-invalid={!!errors.basePricePaisa}
          />
        </FormField>

        <FormField
          id="property-premium-price"
          label="Premium Price (Paisa)"
          error={errors.premiumPaisa?.message}
          helperText="Corner / Lake / Floor premium"
        >
          <Input
            id="property-premium-price"
            {...register('premiumPaisa')}
            placeholder="0"
            aria-invalid={!!errors.premiumPaisa}
          />
        </FormField>

        <FormField
          id="property-discount-limit"
          label="Discount Limit (%)"
          error={errors.discountLimitPct?.message}
          helperText="Max discount allowed without elevated approval"
        >
          <Input
            id="property-discount-limit"
            {...register('discountLimitPct')}
            placeholder="0.00"
            aria-invalid={!!errors.discountLimitPct}
          />
        </FormField>

        <div className="p-3 bg-surface-sunken/60 rounded-card border border-border flex flex-col justify-center">
          <span className="text-caption text-text-muted font-medium uppercase">
            Calculated Net Price Preview
          </span>
          <span className="text-h2 font-semibold text-primary tabular-nums mt-0.5">
            {formatMoney(calculatedNetPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
