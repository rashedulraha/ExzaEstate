import { SlidersHorizontal, ShoppingBag, Landmark, Hash, User } from 'lucide-react';

export type SettingsTabId = 'general' | 'sales' | 'finance' | 'numbering' | 'profile';

export interface SettingsNavTabsProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsNavTabs({ activeTab, onTabChange }: SettingsNavTabsProps) {
  const tabs: Array<{
    id: SettingsTabId;
    label: string;
    description: string;
    icon: typeof SlidersHorizontal;
  }> = [
    {
      id: 'general',
      label: 'General & Land',
      description: 'Fiscal periods, land unit conversions, timezone',
      icon: SlidersHorizontal,
    },
    {
      id: 'sales',
      label: 'Sales & Booking',
      description: 'Hold hours, discounts, minimum booking threshold',
      icon: ShoppingBag,
    },
    {
      id: 'finance',
      label: 'Accounting & Finance',
      description: 'Revenue recognition, approval thresholds, cancellations',
      icon: Landmark,
    },
    {
      id: 'numbering',
      label: 'Numbering Patterns',
      description: 'Document sequences, branches, and custom formats',
      icon: Hash,
    },
    {
      id: 'profile',
      label: 'Profile & Account',
      description: 'Identity, active session & sign out',
      icon: User,
    },
  ];

  return (
    <div className="border border-border bg-surface-sunken p-1.5 rounded-card mb-6">
      <nav
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2"
        aria-label="Settings categories"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-start p-3 sm:px-4 sm:py-3 rounded-button text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-surface border border-border text-primary shadow-xs ring-1 ring-primary/20'
                  : 'text-text-muted hover:text-text hover:bg-surface/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}
                />
                <span
                  className={`text-label font-medium ${isActive ? 'text-primary' : 'text-text'}`}
                >
                  {tab.label}
                </span>
              </div>
              <span className="text-caption text-text-muted line-clamp-1">{tab.description}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
