import { Star, Download, ArrowRight, FileText } from 'lucide-react';
import { EmptyState } from '@exzaestate/ui';
import type { ReportItem } from '../reports.types.js';

export interface ReportsTableViewProps {
  reports: readonly ReportItem[];
  pinnedReportIds: string[];
  onTogglePin: (reportId: string) => void;
  onOpenReport: (report: ReportItem) => void;
  onQuickExport: (report: ReportItem) => void;
  className?: string;
}

export function ReportsTableView({
  reports,
  pinnedReportIds,
  onTogglePin,
  onOpenReport,
  onQuickExport,
  className,
}: ReportsTableViewProps) {
  if (reports.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No Reports Match Your Filters"
          description="Try adjusting your search query or selecting a different category."
          dashedBorder
        />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className || 'bg-surface'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-small">
          <thead className="bg-surface-sunken/80 text-text-muted border-b border-border text-th font-semibold">
            <tr>
              <th className="w-10 px-3 py-3 text-center">Pin</th>
              <th className="w-24 px-4 py-3 font-mono">Code</th>
              <th className="px-4 py-3">Report Name & Scope</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Formats</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {reports.map((r) => {
              const isPinned = pinnedReportIds.includes(r.id);
              return (
                <tr key={r.id} className="hover:bg-surface-sunken/50 transition-colors group">
                  {/* Pin Column */}
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onTogglePin(r.id)}
                      aria-label={isPinned ? 'Unpin report' : 'Pin report'}
                      className={`p-1 rounded-button transition-colors cursor-pointer ${
                        isPinned ? 'text-primary' : 'text-text-muted/40 hover:text-text-muted'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                    </button>
                  </td>

                  {/* Code */}
                  <td className="px-4 py-3 font-mono text-caption font-bold text-text">{r.code}</td>

                  {/* Title & Description */}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenReport(r)}
                      className="font-medium text-text hover:text-primary transition-colors text-left font-sans block cursor-pointer"
                    >
                      {r.title}
                    </button>
                    <span className="text-caption text-text-muted line-clamp-1 mt-0.5">
                      {r.description}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="text-caption font-medium text-text-muted">{r.category}</span>
                  </td>

                  {/* Frequency */}
                  <td className="px-4 py-3">
                    <span className="text-caption px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted border border-border">
                      {r.frequency.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Formats */}
                  <td className="px-4 py-3 font-mono text-caption text-text-muted">
                    {r.formats.join(' / ')}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onQuickExport(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-caption font-medium text-text-muted hover:text-text hover:bg-surface-sunken rounded-button border border-border transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenReport(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-caption font-semibold text-primary hover:text-primary-deep transition-colors cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
