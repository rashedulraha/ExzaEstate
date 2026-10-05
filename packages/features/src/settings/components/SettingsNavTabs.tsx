export type SettingsTabId = 'general' | 'sales' | 'finance' | 'numbering';

export interface SettingsNavTabsProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsNavTabs({ activeTab, onTabChange }: SettingsNavTabsProps) {
  const tabs: Array<{ id: SettingsTabId; label: string; description: string }> = [
    {
      id: 'general',
      label: 'General & Land',
      description: 'Fiscal periods, land unit conversions, timezone',
    },
    {
      id: 'sales',
      label: 'Sales & Booking',
      description: 'Hold hours, discounts, minimum booking threshold',
    },
    {
      id: 'finance',
      label: 'Accounting & Finance',
      description: 'Revenue recognition, approval thresholds, cancellations',
    },
    {
      id: 'numbering',
      label: 'Numbering Patterns',
      description: 'Document sequences, branches, and custom formats',
    },
  ];

  return (
    <div className="border-b border-border bg-surface-elevated/50 backdrop-blur-sm rounded-card p-1 mb-6">
      <nav className="grid grid-cols-2 md:grid-cols-4 gap-2" aria-label="Settings categories">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-start px-4 py-3 rounded-button text-left transition-all ${
                isActive
                  ? 'bg-surface-elevated border border-border text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-text-muted hover:text-text hover:bg-surface-sunken/40'
              }`}
            >
              <span className={`text-label font-medium ${isActive ? 'text-primary' : 'text-text'}`}>
                {tab.label}
              </span>
              <span className="text-caption text-text-muted line-clamp-1 mt-0.5">
                {tab.description}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
