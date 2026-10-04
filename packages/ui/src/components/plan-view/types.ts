export interface PlanViewPlot {
  id: string;
  code: string;
  status:
    | 'AVAILABLE'
    | 'HOLD'
    | 'RESERVED'
    | 'BOOKED'
    | 'SOLD'
    | 'BLOCKED'
    | 'CANCELLED'
    | 'TRANSFERRED'
    | string;
  block?: string;
  road?: string;
  sizeSqFt?: number;
  katha?: string;
  priceFormatted?: string;
  facing?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface PlanViewProps {
  plots: PlanViewPlot[];
  onPlotClick?: (plot: PlanViewPlot) => void;
  selectedPlotId?: string;
  className?: string;
}
