import { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { Dialog, FormField, Button, Input, Select, type SelectOption } from '@exzaestate/ui';
import type { ReportItem, ExportFormat } from '../reports.types.js';

export interface QuickGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportItem | null;
  onExport: (params: {
    reportId: string;
    format: ExportFormat;
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    projectId?: string;
  }) => Promise<{ jobId: string; message: string }>;
}

const PROJECT_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Projects (Consolidated)' },
  { value: 'proj_gulshan', label: 'Gulshan North Avenue' },
  { value: 'proj_banani', label: 'Banani Heights' },
  { value: 'proj_dhanmondi', label: 'Dhanmondi Lake View' },
];

function getFormatDescription(format: ExportFormat): string {
  if (format === 'PDF') return 'Executive PDF';
  if (format === 'EXCEL') return 'Excel (.xlsx)';
  return 'Raw CSV';
}

function checkIsAsOfReport(report: ReportItem): boolean {
  if (report.frequency === 'MONTHLY_CLOSE' || report.frequency === 'QUARTERLY') return true;
  return (
    report.id.includes('balance') || report.id.includes('aging') || report.id.includes('inventory')
  );
}

interface ExportSuccessViewProps {
  message: string;
  jobId: string;
  onDone: () => void;
}

function ExportSuccessView({ message, jobId, onDone }: ExportSuccessViewProps) {
  return (
    <div className="py-4 space-y-4 text-center">
      <div className="w-12 h-12 rounded-full bg-success/12 text-success mx-auto flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-body font-semibold text-text">Export Dispatched</h4>
        <p className="text-small text-text-muted mt-1">{message}</p>
        <p className="text-caption font-mono text-text-muted mt-2">
          Job ID: <span className="font-semibold text-text">{jobId}</span>
        </p>
      </div>
      <div className="pt-2">
        <Button variant="primary" onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    </div>
  );
}

export function QuickGenerateModal({ isOpen, onClose, report, onExport }: QuickGenerateModalProps) {
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [asOfDate, setAsOfDate] = useState<string>('2026-10-01');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  const [projectId, setProjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedJob, setCompletedJob] = useState<{ jobId: string; message: string } | null>(null);

  if (!report) return null;
  const isAsOfReport = checkIsAsOfReport(report);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await onExport({
        reportId: report.id,
        format,
        asOfDate: isAsOfReport ? asOfDate : undefined,
        startDate: isAsOfReport ? undefined : startDate,
        endDate: isAsOfReport ? undefined : endDate,
        projectId: projectId || undefined,
      });
      setCompletedJob(res);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCompletedJob(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={`Generate & Export: ${report.title}`}
      description={`Queue background document rendering (${report.code} · ${report.tag})`}
      size="md"
    >
      {completedJob ? (
        <ExportSuccessView
          message={completedJob.message}
          jobId={completedJob.jobId}
          onDone={handleResetAndClose}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Format Selection Buttons */}
          <div className="space-y-1.5">
            <label className="block text-caption text-text-muted uppercase font-semibold">
              Output Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {report.formats.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`p-3 rounded-button border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    format === f
                      ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30'
                      : 'border-border bg-surface text-text-muted hover:border-primary/40 hover:text-text'
                  }`}
                >
                  <span className="font-mono text-body font-bold">{f}</span>
                  <span className="text-caption text-text-muted">{getFormatDescription(f)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Selector */}
          {isAsOfReport ? (
            <FormField id="gen-as-of-date" label="As of Date">
              <Input
                id="gen-as-of-date"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </FormField>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <FormField id="gen-start-date" label="Start Date">
                <Input
                  id="gen-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormField>
              <FormField id="gen-end-date" label="End Date">
                <Input
                  id="gen-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </FormField>
            </div>
          )}

          {/* Project Filter */}
          <div className="space-y-1">
            <label htmlFor="gen-project" className="block text-body font-medium text-text">
              Project Scope
            </label>
            <Select
              id="gen-project"
              options={PROJECT_OPTIONS}
              value={projectId}
              onChange={(val) => setProjectId(val)}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {isSubmitting ? 'Queueing Export...' : `Export ${format}`}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
