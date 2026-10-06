import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { REPORTS_CATALOG } from '../reports.catalog.js';
import type {
  ReportCategory,
  ReportFrequency,
  ReportItem,
  ExportFormat,
  RecentExportItem,
} from '../reports.types.js';
import { ReportsMetricsBar } from '../components/ReportsMetricsBar.js';
import { ReportsFilterBar } from '../components/ReportsFilterBar.js';
import { ReportCard } from '../components/ReportCard.js';
import { ReportsDirectoryView } from '../components/ReportsDirectoryView.js';
import { RecentExportsDrawer } from '../components/RecentExportsDrawer.js';
import { QuickGenerateModal } from '../components/QuickGenerateModal.js';

const PINNED_STORAGE_KEY = 'exza_pinned_report_ids';
const DEFAULT_PINNED_IDS = ['trial-balance', 'balance-sheet', 'sales-report', 'collection-report'];
const RECENT_EXPORTS_STORAGE_KEY = 'exza_recent_report_exports';

function calculateExportFileSize(format: ExportFormat): string {
  if (format === 'EXCEL') return '1.4 MB';
  if (format === 'PDF') return '680 KB';
  return '150 KB';
}

export function ReportsHubPage() {
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState<ReportFrequency | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isRecentExportsOpen, setIsRecentExportsOpen] = useState(false);
  const [activeModalReport, setActiveModalReport] = useState<ReportItem | null>(null);
  const [recentExports, setRecentExports] = useState<RecentExportItem[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_EXPORTS_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as RecentExportItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_EXPORTS_STORAGE_KEY, JSON.stringify(recentExports));
    } catch {
      // Ignore storage write issues
    }
  }, [recentExports]);

  // Pinned reports with localStorage persistence
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PINNED_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : DEFAULT_PINNED_IDS;
    } catch {
      return DEFAULT_PINNED_IDS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // Ignore storage write issues
    }
  }, [pinnedIds]);

  const togglePin = (reportId: string) => {
    setPinnedIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId],
    );
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ReportCategory, number> = {
      ALL: REPORTS_CATALOG.length,
      FINANCIAL: 0,
      SALES: 0,
      COLLECTION: 0,
      INVENTORY: 0,
      PROCUREMENT: 0,
      AUDIT: 0,
    };
    for (const r of REPORTS_CATALOG) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    return counts;
  }, []);

  // Filtered reports
  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return REPORTS_CATALOG.filter((r) => {
      const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
      const matchesFrequency = selectedFrequency === 'ALL' || r.frequency === selectedFrequency;
      const matchesSearch =
        query === '' ||
        r.code.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tag.toLowerCase().includes(query);
      return matchesCategory && matchesFrequency && matchesSearch;
    });
  }, [searchQuery, selectedCategory, selectedFrequency]);

  // Pinned report objects
  const pinnedReports = useMemo(() => {
    return REPORTS_CATALOG.filter((r) => pinnedIds.includes(r.id));
  }, [pinnedIds]);

  const handleOpenReport = (report: ReportItem) => {
    if (report.hasInteractiveView) {
      navigate(report.path);
    } else {
      setActiveModalReport(report);
    }
  };

  const handleExportSubmit = async (params: {
    reportId: string;
    format: ExportFormat;
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    projectId?: string;
  }) => {
    const matched = REPORTS_CATALOG.find((r) => r.id === params.reportId);
    const jobId = `job_${Date.now()}`;

    // Add to recent exports
    if (matched) {
      const newExport: RecentExportItem = {
        id: `exp-${Date.now()}`,
        reportCode: matched.code,
        reportTitle: matched.title,
        format: params.format,
        createdAt: 'Just now',
        fileSize: calculateExportFileSize(params.format),
        status: 'READY',
      };
      setRecentExports((prev) => [newExport, ...prev]);
    }

    return {
      jobId,
      message: `Asynchronous report generation dispatched for ${matched?.title ?? 'report'} (${params.format})`,
    };
  };

  return (
    <div className="space-y-7 pb-10" data-testid="reports-hub-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-heading-2 text-text font-semibold">Reports & Statutory Statements</h1>
          <p className="text-caption text-text-muted mt-0.5">
            Backend-generated audit-ready financial statements, sales registries, and operational
            reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-caption font-mono px-2.5 py-1 rounded bg-surface border border-border text-text font-medium shadow-xs">
            NBR Statutory Mode · FY 2026–27
          </span>
        </div>
      </div>

      {/* 1. Executive Metrics Bar */}
      <ReportsMetricsBar />

      {/* 2. Pinned Favorites Ribbon */}
      {selectedCategory === 'ALL' && searchQuery === '' && pinnedReports.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-semibold text-text">Pinned Priority Reports</h2>
            <span className="text-caption text-text-muted">Quick access to daily workflows</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pinnedReports.map((report) => (
              <ReportCard
                key={`pinned-${report.id}`}
                report={report}
                isPinned={true}
                onTogglePin={togglePin}
                onOpenReport={handleOpenReport}
                onQuickExport={(r) => setActiveModalReport(r)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Filter and Search Controls */}
      <ReportsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedFrequency={selectedFrequency}
        onSelectFrequency={setSelectedFrequency}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        categoryCounts={categoryCounts}
        totalRecentExports={recentExports.length}
        onOpenRecentExports={() => setIsRecentExportsOpen(true)}
      />

      {/* 4. Reports Directory View (Grid vs Table) */}
      <ReportsDirectoryView
        viewMode={viewMode}
        reports={filteredReports}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
        onOpenReport={handleOpenReport}
        onQuickExport={(r) => setActiveModalReport(r)}
      />

      {/* 5. Automated Closing Schedule Banner */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption text-text-muted">
        <div>
          <span className="font-semibold text-text">Automated Reporting Engine: </span>
          <span>
            Monthly financial statements (Trial Balance, P&L, AR Aging) are automatically generated
            on the 1st of every calendar month at 00:00 UTC.
          </span>
        </div>
        <span className="font-mono text-text font-medium shrink-0">BullMQ Active</span>
      </div>

      {/* 6. Quick Export Modal */}
      <QuickGenerateModal
        isOpen={Boolean(activeModalReport)}
        onClose={() => setActiveModalReport(null)}
        report={activeModalReport}
        onExport={handleExportSubmit}
      />

      {/* 7. Recent Exports Slide-Over Drawer */}
      <RecentExportsDrawer
        isOpen={isRecentExportsOpen}
        onClose={() => setIsRecentExportsOpen(false)}
        exports={recentExports}
        onClearHistory={() => {
          setRecentExports([]);
          try {
            localStorage.removeItem(RECENT_EXPORTS_STORAGE_KEY);
          } catch {
            // Ignore
          }
        }}
        onDownloadItem={() => {
          // Triggers instant simulated download
        }}
      />
    </div>
  );
}
