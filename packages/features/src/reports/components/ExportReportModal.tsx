import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Dialog, FormField, Button, Input } from '@exzaestate/ui';

export interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  onExport: (
    format: 'PDF' | 'EXCEL' | 'CSV',
    filters?: Record<string, string>,
  ) => Promise<{ jobId: string; message: string }>;
}

export function ExportReportModal({
  isOpen,
  onClose,
  reportTitle,
  onExport,
}: ExportReportModalProps) {
  const [format, setFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('PDF');
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedJob, setCompletedJob] = useState<{ jobId: string; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await onExport(format, { asOfDate });
      setCompletedJob(res);
    } catch {
      // handled by parent or mutation
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
      title={`Export ${reportTitle}`}
      description="Queue an asynchronous server-side document export job"
      size="md"
    >
      {completedJob ? (
        <div className="py-4 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-success/12 text-success mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-body font-semibold text-text">Export Job Queued</h4>
            <p className="text-small text-text-muted mt-1">{completedJob.message}</p>
            <p className="text-caption font-mono text-text-muted mt-2">
              Job ID: <span className="font-semibold text-text">{completedJob.jobId}</span>
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" onClick={handleResetAndClose} className="w-full">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-h4 text-text font-medium">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat('PDF')}
                className={`p-3 rounded-button border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  format === 'PDF'
                    ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30'
                    : 'border-border bg-surface text-text-muted hover:border-primary/40'
                }`}
              >
                <FileText className="w-5 h-5 text-danger" />
                <span className="text-caption font-medium">PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('EXCEL')}
                className={`p-3 rounded-button border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  format === 'EXCEL'
                    ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30'
                    : 'border-border bg-surface text-text-muted hover:border-primary/40'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-success" />
                <span className="text-caption font-medium">Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('CSV')}
                className={`p-3 rounded-button border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  format === 'CSV'
                    ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30'
                    : 'border-border bg-surface text-text-muted hover:border-primary/40'
                }`}
              >
                <Download className="w-5 h-5 text-info" />
                <span className="text-caption font-medium">Raw CSV</span>
              </button>
            </div>
          </div>

          <FormField id="export-as-of-date" label="As of Date">
            <Input
              id="export-as-of-date"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </FormField>

          <div className="pt-3 border-t border-border flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {isSubmitting ? 'Queueing...' : `Export as ${format}`}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
