import { type ReactElement, useState, useMemo } from 'react';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { FormField, Input } from '@exzaestate/ui';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { usePropertyList, type PropertyItem } from '../../../../property/hooks/usePropertyList.js';
import type { BookingWizardInput } from '../../../schemas/booking.schema.js';
import { SelectedUnitBanner, AvailableUnitsList } from './Step1PropertySelectComponents.js';

interface Step1PropertySelectProps {
  register: UseFormRegister<BookingWizardInput>;
  setValue: UseFormSetValue<BookingWizardInput>;
  watch: UseFormWatch<BookingWizardInput>;
  errors: FieldErrors<BookingWizardInput>;
}

export function Step1PropertySelect({
  register,
  setValue,
  watch,
  errors,
}: Step1PropertySelectProps): ReactElement {
  const selectedPropertyId = watch('propertyId');
  const propertyCode = watch('propertyCode');
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const { properties, isLoading } = usePropertyList({
    params: { status: 'Available', limit: 50 },
  });

  const selectedUnit = useMemo(() => {
    if (!selectedPropertyId) return null;
    return properties.find((p) => p.id === selectedPropertyId) || null;
  }, [properties, selectedPropertyId]);

  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return properties;
    const term = searchTerm.toLowerCase().trim();
    return properties.filter((p) => {
      const codeMatch = p.code.toLowerCase().includes(term);
      const titleMatch = p.title?.toLowerCase().includes(term);
      const typeMatch = p.type.toLowerCase().includes(term);
      const blockMatch = p.block?.name.toLowerCase().includes(term);
      return codeMatch || titleMatch || typeMatch || blockMatch;
    });
  }, [properties, searchTerm]);

  const handleSelectUnit = (unit: PropertyItem) => {
    setValue('propertyId', unit.id, { shouldValidate: true });
    setValue('propertyCode', unit.code, { shouldValidate: true });
    setValue('basePricePaisa', unit.basePricePaisa, { shouldValidate: true });
    setValue('netPricePaisa', unit.netPricePaisa, { shouldValidate: true });
  };

  const handleClearSelection = () => {
    setValue('propertyId', '', { shouldValidate: true });
    setValue('propertyCode', '', { shouldValidate: true });
    setValue('basePricePaisa', '', { shouldValidate: true });
    setValue('netPricePaisa', '', { shouldValidate: true });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-h3 font-semibold text-text">Step 1: Property Unit Selection</h3>
        <p className="text-caption text-text-muted mt-0.5">
          Select an available property unit from inventory to lock for this booking.
        </p>
      </div>

      {/* Selected Unit Spotlight Banner */}
      {selectedPropertyId && (
        <SelectedUnitBanner
          selectedUnit={selectedUnit}
          propertyCode={propertyCode}
          propertyId={selectedPropertyId}
          onClear={handleClearSelection}
        />
      )}

      {/* Inventory Search & Card Picker */}
      {!selectedPropertyId && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <Input
              id="property-search"
              placeholder="Search available units by code (e.g. FLT-K1A), floor, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-small"
            />
          </div>

          <AvailableUnitsList
            isLoading={isLoading}
            filteredUnits={filteredUnits}
            searchTerm={searchTerm}
            onSelectUnit={handleSelectUnit}
          />
        </div>
      )}

      {errors.propertyId && <p className="text-caption text-danger">{errors.propertyId.message}</p>}

      {/* Manual Fallback (Collapsible) */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => setShowManualInput((prev) => !prev)}
          className="flex items-center gap-1.5 text-caption text-text-muted hover:text-text cursor-pointer transition-colors"
        >
          {showManualInput ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          <span>
            {showManualInput ? 'Hide manual UUID input' : 'Or enter unit ID / code manually'}
          </span>
        </button>

        {showManualInput && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-surface-sunken/30 rounded-card border border-border">
            <FormField
              id="booking-propertyId"
              label="Property Unit UUID"
              required
              error={errors.propertyId?.message}
            >
              <Input
                id="booking-propertyId"
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                {...register('propertyId')}
              />
            </FormField>

            <FormField
              id="booking-propertyCode"
              label="Unit Code / Reference"
              error={errors.propertyCode?.message}
            >
              <Input
                id="booking-propertyCode"
                placeholder="e.g. APT-4B or PLOT-12"
                {...register('propertyCode')}
              />
            </FormField>
          </div>
        )}
      </div>
    </div>
  );
}
