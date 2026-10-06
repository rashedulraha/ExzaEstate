import { Star, ArrowRight, Download } from 'lucide-react';
import type { ReportItem } from '../reports.types.js';

export interface ReportCardProps {
  report: ReportItem;
  isPinned: boolean;
  onTogglePin: (reportId: string) => void;
  onOpenReport: (report: ReportItem) => void;
  onQuickExport: (report: ReportItem) => void;
}

export function ReportCard({
  report,
  isPinned,
  onTogglePin,
  onOpenReport,
  onQuickExport,
}: ReportCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 shadow-xs hover:border-border-strong transition-all flex flex-col justify-between group">
      <div>
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption font-semibold px-2 py-0.5 rounded bg-surface-sunken text-text border border-border">
              {report.code}
            </span>
            <span className="text-caption font-medium text-text-muted">
              {report.frequency.replace('_', ' ')}
            </span>
          </div>

          {/* Favorite Pin Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(report.id);
            }}
            aria-label={isPinned ? 'Unpin report' : 'Pin report to top'}
            className={`p-1.5 rounded transition-colors ${
              isPinned
                ? 'text-primary hover:text-primary-deep'
                : 'text-text-muted/40 hover:text-text-muted'
            }`}
          >
            <Star className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Title & Description */}
        <h3
          role="button"
          tabIndex={0}
          onClick={() => onOpenReport(report)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenReport(report);
            }
          }}
          className="text-body font-semibold text-text group-hover:text-primary transition-colors cursor-pointer text-left"
        >
          {report.title}
        </h3>
        <p className="text-small text-text-muted mt-1.5 leading-relaxed line-clamp-2 text-left">
          {report.description}
        </p>

        {/* Tags & Formats */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span
            className={`text-caption px-2 py-0.5 rounded font-medium ${
              report.statutoryLevel === 'P0'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-surface-sunken text-text-muted border border-border'
            }`}
          >
            {report.tag}
          </span>
          <span className="text-caption px-2 py-0.5 rounded bg-surface-sunken text-text-muted border border-border font-mono">
            {report.formats.join(' · ')}
          </span>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onQuickExport(report)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium text-text-muted hover:text-text hover:bg-surface-sunken rounded border border-border transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenReport(report)}
          className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:text-primary-deep transition-colors"
        >
          <span>View Report</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
