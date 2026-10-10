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
  compact?: boolean;
  nameColumnTitle?: string;
}

export function ReportsTableView({
  reports,
  pinnedReportIds,
  onTogglePin,
  onOpenReport,
  onQuickExport,
  className,
  compact = false,
  nameColumnTitle,
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
    <div
      className={`overflow-hidden ${compact ? '' : 'rounded-b-card'} ${className || 'bg-surface'}`}
    >
      <div
        className={`overflow-x-auto ${
          compact ? '' : 'overflow-y-auto max-h-[calc(100vh-21rem)] min-h-[420px]'
        }`}
      >
        <table className="w-full text-left text-small">
          <thead className="sticky top-0 z-10 bg-surface-sunken text-text-muted border-b border-border text-th font-semibold shadow-xs">
            <tr>
              <th className="w-10 px-3 py-3 text-center shrink-0">Pin</th>
              <th className="w-20 px-3 py-3 font-mono shrink-0 whitespace-nowrap">Code</th>
              <th className="min-w-[180px] px-4 py-3">
                {nameColumnTitle ?? 'Report Name & Scope'}
              </th>
              <th className="w-28 px-3 py-3 whitespace-nowrap shrink-0">Category</th>
              <th className="w-36 px-3 py-3 whitespace-nowrap shrink-0">Frequency</th>
              <th className="w-36 px-3 py-3 whitespace-nowrap shrink-0">Formats</th>
              <th className="w-40 px-3 py-3 text-right whitespace-nowrap shrink-0">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {reports.map((r) => {
              const isPinned = pinnedReportIds.includes(r.id);
              return (
                <tr
                  key={r.id}
                  onClick={() => onOpenReport(r)}
                  className="hover:bg-surface-sunken/60 transition-colors group cursor-pointer"
                >
                  {/* Pin Column */}
                  <td className="w-10 px-3 py-3 text-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(r.id);
                      }}
                      aria-label={isPinned ? 'Unpin report' : 'Pin report'}
                      className={`p-1 rounded-button transition-colors cursor-pointer ${
                        isPinned ? 'text-primary' : 'text-text-muted/40 hover:text-text-muted'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                    </button>
                  </td>

                  {/* Code */}
                  <td className="w-20 px-3 py-3 font-mono text-caption font-bold text-text whitespace-nowrap shrink-0">
                    {r.code}
                  </td>

                  {/* Title & Description */}
                  <td className="min-w-0 px-4 py-3">
                    <span className="font-medium text-text group-hover:text-primary transition-colors text-left font-sans block truncate max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                      {r.title}
                    </span>
                    <span className="text-caption text-text-muted mt-0.5 truncate block max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                      {r.description}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="w-28 px-3 py-3 whitespace-nowrap shrink-0">
                    <span className="text-caption font-medium text-text-muted whitespace-nowrap">
                      {r.category}
                    </span>
                  </td>

                  {/* Frequency */}
                  <td className="w-36 px-3 py-3 whitespace-nowrap shrink-0">
                    <span className="text-caption px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-muted border border-border whitespace-nowrap inline-flex items-center">
                      {r.frequency.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Formats */}
                  <td className="w-36 px-3 py-3 font-mono text-caption text-text-muted whitespace-nowrap shrink-0">
                    {r.formats.join(' / ')}
                  </td>

                  {/* Actions */}
                  <td className="w-40 px-3 py-3 text-right whitespace-nowrap shrink-0">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickExport(r);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-caption font-medium text-text-muted hover:text-text hover:bg-surface-sunken rounded-button border border-border transition-colors cursor-pointer shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReport(r);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-caption font-semibold text-primary hover:text-primary-deep transition-colors cursor-pointer shrink-0"
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
