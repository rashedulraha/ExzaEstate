import { useMemo } from 'react';
import { PlanView, type PlanViewPlot } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import type { PropertyItem } from '../hooks/usePropertyList.js';

export interface PropertyPlanViewProps {
  properties: PropertyItem[];
  isLoading: boolean;
  onSelectProperty: (property: PropertyItem) => void;
  selectedPropertyId?: string;
  emptyState?: React.ReactNode;
}

export function PropertyPlanView({
  properties,
  isLoading,
  onSelectProperty,
  selectedPropertyId,
  emptyState,
}: PropertyPlanViewProps) {
  const plots: PlanViewPlot[] = useMemo(() => {
    return properties.map((p) => {
      const areaNum = Number(p.areaSqft);
      const katha = !isNaN(areaNum) ? (areaNum / 720).toFixed(2) : undefined;
      return {
        id: p.id,
        code: p.code,
        status: p.status,
        block: p.block?.name,
        road: p.floor?.name,
        sizeSqFt: !isNaN(areaNum) ? areaNum : undefined,
        katha,
        priceFormatted: formatMoney(p.netPricePaisa),
        facing: p.facing ? p.facing.replace('_', ' ') : undefined,
      };
    });
  }, [properties]);

  if (isLoading) {
    return (
      <div className="w-full h-112 flex flex-col items-center justify-center bg-surface-sunken/30 rounded-card border border-border animate-skeleton-breathe">
        <div className="w-16 h-16 rounded-full bg-surface-sunken mb-4" />
        <p className="text-small text-text-muted font-medium">
          Generating Cadastral Plan Layout...
        </p>
      </div>
    );
  }

  if (plots.length === 0) {
    return <div className="p-8 text-center">{emptyState}</div>;
  }

  const handlePlotClick = (plot: PlanViewPlot) => {
    const item = properties.find((p) => p.id === plot.id);
    if (item) onSelectProperty(item);
  };

  return (
    <div className="w-full overflow-hidden rounded-card">
      <PlanView
        plots={plots}
        onPlotClick={handlePlotClick}
        selectedPlotId={selectedPropertyId}
        className="rounded-card border-border"
      />
    </div>
  );
}
