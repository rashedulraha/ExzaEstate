import type { ReportItem } from '../reports.types.js';
import { ReportCard } from './ReportCard.js';
import { ReportsTableView } from './ReportsTableView.js';

export interface ReportsDirectoryViewProps {
  viewMode: 'grid' | 'table';
  reports: readonly ReportItem[];
  pinnedIds: string[];
  onTogglePin: (id: string) => void;
  onOpenReport: (report: ReportItem) => void;
  onQuickExport: (report: ReportItem) => void;
}

export function ReportsDirectoryView({
  viewMode,
  reports,
  pinnedIds,
  onTogglePin,
  onOpenReport,
  onQuickExport,
}: ReportsDirectoryViewProps) {
  if (reports.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-12 text-center">
        <p className="text-body font-medium text-text">No reports match your filters</p>
        <p className="text-small text-text-muted mt-1">
          Try adjusting your search query or selecting a different category.
        </p>
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <ReportsTableView
        reports={reports}
        pinnedReportIds={pinnedIds}
        onTogglePin={onTogglePin}
        onOpenReport={onOpenReport}
        onQuickExport={onQuickExport}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          isPinned={pinnedIds.includes(report.id)}
          onTogglePin={onTogglePin}
          onOpenReport={onOpenReport}
          onQuickExport={onQuickExport}
        />
      ))}
    </div>
  );
}
