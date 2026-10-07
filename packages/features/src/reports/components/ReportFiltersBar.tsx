import { Download, RefreshCw, Calendar, Filter } from 'lucide-react';
import { Button, Select, Input, type SelectOption, StickyToolbar } from '@exzaestate/ui';

export interface ReportFiltersBarProps {
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  projectId?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  onAsOfDateChange?: (date: string) => void;
  onProjectIdChange?: (projId: string) => void;
  onRefresh?: () => void;
  onOpenExport?: () => void;
  mode?: 'range' | 'asOf';
  showProjectFilter?: boolean;
}

const PROJECT_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Projects' },
  { value: 'proj_gulshan', label: 'Gulshan North Avenue' },
  { value: 'proj_banani', label: 'Banani Heights' },
  { value: 'proj_dhanmondi', label: 'Dhanmondi Lake View' },
];

function DateFilterControls({
  mode,
  asOfDate,
  startDate,
  endDate,
  onAsOfDateChange,
  onStartDateChange,
  onEndDateChange,
}: {
  mode: 'range' | 'asOf';
  asOfDate: string;
  startDate: string;
  endDate: string;
  onAsOfDateChange?: (date: string) => void;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
}) {
  if (mode === 'asOf') {
    return (
      <div className="flex items-center gap-2 text-small">
        <span className="text-text-muted font-medium flex items-center gap-1.5 shrink-0">
          <Calendar className="w-4 h-4 text-text-muted" /> As of:
        </span>
        <Input
          id="report-as-of-date"
          type="date"
          value={asOfDate}
          onChange={(e) => onAsOfDateChange && onAsOfDateChange(e.target.value)}
          className="w-40"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-small flex-wrap sm:flex-nowrap">
      <span className="text-text-muted font-medium flex items-center gap-1.5 shrink-0">
        <Calendar className="w-4 h-4 text-text-muted" /> Period:
      </span>
      <Input
        id="report-start-date"
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
        className="w-38"
      />
      <span className="text-text-muted font-medium text-caption">to</span>
      <Input
        id="report-end-date"
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
        className="w-38"
      />
    </div>
  );
}

function FilterBarActions({
  onRefresh,
  onOpenExport,
}: {
  onRefresh?: () => void;
  onOpenExport?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {onRefresh && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      )}
      {onOpenExport && (
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenExport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export
        </Button>
      )}
    </div>
  );
}

export function ReportFiltersBar({
  startDate = '',
  endDate = '',
  asOfDate = '',
  projectId = '',
  onStartDateChange,
  onEndDateChange,
  onAsOfDateChange,
  onProjectIdChange,
  onRefresh,
  onOpenExport,
  mode = 'asOf',
  showProjectFilter = true,
}: ReportFiltersBarProps) {
  return (
    <StickyToolbar>
      <div className="shadow-xs rounded-card border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <DateFilterControls
            mode={mode}
            asOfDate={asOfDate}
            startDate={startDate}
            endDate={endDate}
            onAsOfDateChange={onAsOfDateChange}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />

          {showProjectFilter && (
            <div className="flex items-center gap-2 text-small">
              <span className="text-text-muted font-medium flex items-center gap-1.5 shrink-0">
                <Filter className="w-4 h-4 text-text-muted" /> Project:
              </span>
              <div className="min-w-[170px]">
                <Select
                  id="report-project-filter"
                  options={PROJECT_OPTIONS}
                  value={projectId}
                  onChange={(val) => onProjectIdChange && onProjectIdChange(val)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <FilterBarActions onRefresh={onRefresh} onOpenExport={onOpenExport} />
      </div>
    </StickyToolbar>
  );
}
