import type { PropertyItem } from '../hooks/usePropertyList.js';
import {
  PropertyOverviewTab,
  PropertyPricingTab,
  PropertyHistoryTab,
  type StatusHistoryRecord,
} from './PropertyDetailComponents.js';

interface PropertyDetailTabsProps {
  activeTab: 'overview' | 'pricing' | 'history';
  onTabChange: (tab: 'overview' | 'pricing' | 'history') => void;
  property: PropertyItem;
  historyItems: StatusHistoryRecord[];
}

export function PropertyDetailTabs({
  activeTab,
  onTabChange,
  property,
  historyItems,
}: PropertyDetailTabsProps) {
  return (
    <div className="card-workspace">
      <div className="flex border-b border-border bg-surface-sunken/20 px-4">
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className={`py-3 px-4 text-btn border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'overview'
              ? 'border-primary text-primary bg-surface'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Overview & Specifications
        </button>
        <button
          type="button"
          onClick={() => onTabChange('pricing')}
          className={`py-3 px-4 text-btn border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'pricing'
              ? 'border-primary text-primary bg-surface'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Pricing Breakdown
        </button>
        <button
          type="button"
          onClick={() => onTabChange('history')}
          className={`py-3 px-4 text-btn border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary bg-surface'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Status History ({historyItems.length})
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && <PropertyOverviewTab property={property} />}
        {activeTab === 'pricing' && <PropertyPricingTab property={property} />}
        {activeTab === 'history' && <PropertyHistoryTab historyItems={historyItems} />}
      </div>
    </div>
  );
}
