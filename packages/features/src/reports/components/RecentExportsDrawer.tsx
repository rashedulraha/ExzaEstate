import { Download, Trash2, X } from 'lucide-react';
import type { RecentExportItem } from '../reports.types.js';

export interface RecentExportsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  exports: RecentExportItem[];
  onClearHistory: () => void;
  onDownloadItem: (item: RecentExportItem) => void;
}

export function RecentExportsDrawer({
  isOpen,
  onClose,
  exports,
  onClearHistory,
  onDownloadItem,
}: RecentExportsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recent Downloads & Export Activity"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity"
    >
      <div className="w-full max-w-md bg-surface border-l border-border h-full shadow-lg flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-body font-semibold text-text">Recent Downloads & Exports</h2>
            <p className="text-caption text-text-muted mt-0.5">
              Instant retrieval of previously generated report archives
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recent downloads drawer"
            className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-sunken transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {exports.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-body font-medium text-text">No Recent Downloads</p>
              <p className="text-small text-text-muted mt-1">
                Generated PDF, Excel, and CSV files will appear here for instant download.
              </p>
            </div>
          ) : (
            exports.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-surface-sunken/50 border border-border rounded-lg flex items-center justify-between gap-3 hover:border-border-strong transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-caption font-semibold px-1.5 py-0.2 rounded bg-surface border border-border text-text">
                      {item.reportCode}
                    </span>
                    <span className="text-caption font-mono uppercase font-semibold text-primary">
                      {item.format}
                    </span>
                  </div>
                  <h4 className="text-small font-medium text-text truncate mt-1">
                    {item.reportTitle}
                  </h4>
                  <div className="text-caption text-text-muted mt-0.5 flex items-center gap-2">
                    <span>{item.createdAt}</span>
                    <span>·</span>
                    <span>{item.fileSize}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDownloadItem(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-semibold bg-surface hover:bg-surface-sunken text-primary border border-border rounded-md shadow-xs transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {exports.length > 0 && (
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between bg-surface-sunken/30">
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-danger transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
            <span className="text-caption text-text-muted font-mono">
              {exports.length} archived files
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
