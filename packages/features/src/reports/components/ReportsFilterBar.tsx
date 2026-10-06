import { Search, LayoutGrid, List, History } from 'lucide-react';
import { Select, type SelectOption } from '@exzaestate/ui';
import type { ReportCategory, ReportFrequency } from '../reports.types.js';

export interface ReportsFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ReportCategory;
  onSelectCategory: (category: ReportCategory) => void;
  selectedFrequency: ReportFrequency | 'ALL';
  onSelectFrequency: (freq: ReportFrequency | 'ALL') => void;
  viewMode: 'grid' | 'table';
  onToggleViewMode: (mode: 'grid' | 'table') => void;
  categoryCounts: Record<ReportCategory, number>;
  totalRecentExports: number;
  onOpenRecentExports: () => void;
}

const CATEGORIES: { id: ReportCategory; label: string }[] = [
  { id: 'ALL', label: 'All Reports' },
  { id: 'FINANCIAL', label: 'Financial & Statutory' },
  { id: 'SALES', label: 'Sales & CRM' },
  { id: 'COLLECTION', label: 'Collections & AR' },
  { id: 'INVENTORY', label: 'Inventory & Projects' },
  { id: 'PROCUREMENT', label: 'Payables & AP' },
  { id: 'AUDIT', label: 'Audit & Compliance' },
];

const FREQUENCIES: { id: ReportFrequency | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Frequencies' },
  { id: 'REAL_TIME', label: 'Real-Time / Live' },
  { id: 'DAILY', label: 'Daily Run' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'MONTHLY_CLOSE', label: 'Monthly Close' },
  { id: 'QUARTERLY', label: 'Quarterly' },
];

const FREQUENCY_OPTIONS: SelectOption<ReportFrequency | 'ALL'>[] = FREQUENCIES.map((f) => ({
  value: f.id,
  label: f.label,
}));

export function ReportsFilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedFrequency,
  onSelectFrequency,
  viewMode,
  onToggleViewMode,
  categoryCounts,
  totalRecentExports,
  onOpenRecentExports,
}: ReportsFilterBarProps) {
  return (
    <div className="space-y-3.5">
      {/* Top Row: Search + Frequency Filter + View Switcher + History Drawer Trigger */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reports by code (e.g. FIN-01), name, or tag..."
            className="w-full pl-9 pr-3.5 py-2 text-body bg-surface border border-border rounded-md text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          {/* Custom Styled Frequency Selector */}
          <div className="w-48 sm:w-52">
            <Select<ReportFrequency | 'ALL'>
              options={FREQUENCY_OPTIONS}
              value={selectedFrequency}
              onChange={onSelectFrequency}
              inputSize="md"
            />
          </div>

          {/* View Mode Toggle: List (Table) vs Box (Grid) */}
          <div className="flex items-center bg-surface-sunken border border-border rounded-md p-0.5">
            <button
              type="button"
              onClick={() => onToggleViewMode('table')}
              aria-label="Table view"
              title="List view (Default)"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-surface text-text shadow-xs font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('grid')}
              aria-label="Grid view"
              title="Box view"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-surface text-text shadow-xs font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Recent Exports Button */}
          <button
            type="button"
            onClick={onOpenRecentExports}
            className="flex items-center gap-1.5 px-3 py-2 text-body font-medium bg-surface hover:bg-surface-sunken border border-border rounded-md text-text transition-colors"
          >
            <History className="w-4 h-4 text-text-muted" />
            <span>Recent Downloads</span>
            {totalRecentExports > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-caption font-mono font-semibold bg-primary text-on-primary">
                {totalRecentExports}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Category Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border scrollbar-none">
        {CATEGORIES.map((c) => {
          const isActive = selectedCategory === c.id;
          const count = categoryCounts[c.id] ?? 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={`px-3 py-2 text-body font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-surface text-primary border border-border shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-sunken/60'
              }`}
            >
              <span>{c.label}</span>
              <span
                className={`text-caption font-mono px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'bg-surface-sunken text-text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
