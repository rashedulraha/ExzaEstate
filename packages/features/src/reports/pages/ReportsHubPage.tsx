import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Star, ChevronDown, List, LayoutGrid } from 'lucide-react';
import { Breadcrumbs } from '@exzaestate/ui';
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
import { ReportsTableView } from '../components/ReportsTableView.js';
import { ReportsDirectoryView } from '../components/ReportsDirectoryView.js';
import { RecentExportsDrawer } from '../components/RecentExportsDrawer.js';
import { QuickGenerateModal } from '../components/QuickGenerateModal.js';

const PINNED_STORAGE_KEY = 'exza_pinned_report_ids';
const DEFAULT_PINNED_IDS = ['trial-balance', 'balance-sheet', 'sales-report', 'collection-report'];
const RECENT_EXPORTS_STORAGE_KEY = 'exza_recent_report_exports';
const FAVORITES_EXPANDED_STORAGE_KEY = 'exza_favorite_reports_expanded';
const FAVORITE_VIEW_MODE_STORAGE_KEY = 'exza_favorite_reports_view_mode';

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
  const [favoriteViewMode, setFavoriteViewMode] = useState<'grid' | 'table'>(() => {
    try {
      const stored = localStorage.getItem(FAVORITE_VIEW_MODE_STORAGE_KEY);
      return stored === 'table' || stored === 'grid' ? stored : 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITE_VIEW_MODE_STORAGE_KEY, favoriteViewMode);
    } catch {
      // Ignore storage write issues
    }
  }, [favoriteViewMode]);

  const [isFavoriteExpanded, setIsFavoriteExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_EXPANDED_STORAGE_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_EXPANDED_STORAGE_KEY, String(isFavoriteExpanded));
    } catch {
      // Ignore storage write issues
    }
  }, [isFavoriteExpanded]);

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
    <div className="container-page space-y-6 pb-10" data-testid="reports-hub-page">
      {/* Tier 1: Breadcrumbs & Executive Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Reports', href: '/reports', onClick: () => navigate('/reports') },
            { label: 'Reports Hub' },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-h1 font-bold text-text">Reports & Statutory Statements</h1>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
                NBR Statutory Mode · FY 2026–27
              </span>
              <span className="text-caption font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {filteredReports.length} Reports
              </span>
            </div>
            <p className="text-small text-text-muted mt-1">
              Financial statements, sales registers, and operational reports with export to Excel
              and PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Tier 2: Executive Metrics Bar */}
      <ReportsMetricsBar />

      {/* Pinned Favorites Ribbon */}
      {selectedCategory === 'ALL' && searchQuery === '' && pinnedReports.length > 0 && (
        <div
          data-testid="favorite-reports-section"
          className="rounded-card border border-border bg-surface shadow-xs overflow-hidden transition-all duration-200"
        >
          {/* Collapsible Header */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsFavoriteExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsFavoriteExpanded((prev) => !prev);
              }
            }}
            aria-expanded={isFavoriteExpanded}
            aria-controls="favorite-reports-content"
            id="favorite-reports-toggle"
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface-sunken/40 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-button bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                <Star className="w-4 h-4 fill-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-body font-semibold text-text">Favorite Reports</h2>
                  <span className="text-caption font-mono text-text-muted px-2.5 py-0.5 rounded-full bg-surface-sunken border border-border">
                    {pinnedReports.length} Pinned
                  </span>
                  <span className="text-caption font-mono text-text-muted px-2 py-0.5 rounded-full bg-surface-sunken/60 border border-border/60 hidden sm:inline-block">
                    {favoriteViewMode === 'grid' ? 'Grid View' : 'Table View'}
                  </span>
                </div>
                <p className="text-caption text-text-muted truncate mt-0.5">
                  {isFavoriteExpanded
                    ? 'Quick access to frequently viewed financial & operational reports'
                    : 'Click to expand frequently viewed reports'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Quick View Mode Switcher for Favorite Reports */}
              <div
                className="flex items-center rounded-button border border-border bg-surface p-0.5 shadow-2xs"
                onClick={(e) => e.stopPropagation()}
                role="group"
                aria-label="Favorite reports view mode switcher"
              >
                <button
                  type="button"
                  onClick={() => setFavoriteViewMode('table')}
                  aria-label="Switch to list view"
                  title="List / Table view"
                  className={`p-1.5 rounded-button transition-colors cursor-pointer ${
                    favoriteViewMode === 'table'
                      ? 'bg-surface-sunken text-primary font-semibold shadow-2xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFavoriteViewMode('grid')}
                  aria-label="Switch to box view"
                  title="Box / Grid view"
                  className={`p-1.5 rounded-button transition-colors cursor-pointer ${
                    favoriteViewMode === 'grid'
                      ? 'bg-surface-sunken text-primary font-semibold shadow-2xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Accordion Expand / Collapse indicator */}
              <div className="flex items-center gap-1.5 text-text-muted hover:text-text pl-1">
                <span className="text-caption font-medium hidden sm:inline-block">
                  {isFavoriteExpanded ? 'Collapse' : 'Expand'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isFavoriteExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Collapsible Content */}
          {isFavoriteExpanded && (
            <div
              id="favorite-reports-content"
              aria-labelledby="favorite-reports-toggle"
              className="border-t border-border"
            >
              {favoriteViewMode === 'grid' ? (
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface">
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
              ) : (
                <ReportsTableView
                  reports={pinnedReports}
                  pinnedReportIds={pinnedIds}
                  onTogglePin={togglePin}
                  onOpenReport={handleOpenReport}
                  onQuickExport={(r) => setActiveModalReport(r)}
                  nameColumnTitle="Favorite Report & Scope"
                  compact
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Tier 3: Unified Reports Directory Workspace Card */}
      <div className="rounded-card border border-border bg-surface shadow-xs overflow-hidden flex flex-col">
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
        <ReportsDirectoryView
          viewMode={viewMode}
          reports={filteredReports}
          pinnedIds={pinnedIds}
          onTogglePin={togglePin}
          onOpenReport={handleOpenReport}
          onQuickExport={(r) => setActiveModalReport(r)}
        />
      </div>

      {/* Quick Export Modal */}
      <QuickGenerateModal
        isOpen={Boolean(activeModalReport)}
        onClose={() => setActiveModalReport(null)}
        report={activeModalReport}
        onExport={handleExportSubmit}
      />

      {/* Recent Exports Slide-Over Drawer */}
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
