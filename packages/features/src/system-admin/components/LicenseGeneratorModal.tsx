import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Button } from '@exzaestate/ui';
import { KeyRound, Copy, Check, ShieldCheck, Download } from 'lucide-react';
import {
  generateLicenseSchema,
  type GenerateLicenseFormData,
  type GeneratedLicenseResult,
  type TenantItem,
} from '../schemas/system-admin.schema.js';

interface LicenseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: TenantItem[];
  preselectedTenant?: TenantItem | null;
  onGenerate: (data: GenerateLicenseFormData) => Promise<GeneratedLicenseResult>;
  isGenerating?: boolean;
}

const inputClass =
  'block w-full rounded-button border border-border-input bg-surface px-3 py-2 text-body text-text placeholder:text-text-disabled transition focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus';

export function LicenseGeneratorModal({
  isOpen,
  onClose,
  tenants,
  preselectedTenant,
  onGenerate,
  isGenerating,
}: LicenseGeneratorModalProps) {
  const [result, setResult] = useState<GeneratedLicenseResult | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Default to 1 year ahead
  const defaultExpiry = new Date();
  defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
  const defaultExpiryStr = defaultExpiry.toISOString().split('T')[0] ?? '';

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GenerateLicenseFormData>({
    resolver: zodResolver(generateLicenseSchema),
    defaultValues: {
      plan: 'ENTERPRISE',
      validUntil: defaultExpiryStr,
      maxSeats: 15,
      maxBranches: 5,
      maxProjects: 20,
    },
  });

  useEffect(() => {
    if (preselectedTenant) {
      setValue('companyId', preselectedTenant.id);
    }
  }, [preselectedTenant, setValue]);

  const handleFormSubmit = async (data: GenerateLicenseFormData) => {
    const res = await onGenerate(data);
    setResult(res);
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exzaestate-license-${result.payload.companyId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    reset();
    setResult(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Ed25519 Cryptographic License Generator"
      description="Issue a digitally signed license payload bound to the company and optional machine hardware ID."
      size="lg"
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-card border border-success/30 bg-success/10 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <h4 className="text-body font-semibold text-text">License Key Signed Successfully</h4>
              <p className="text-caption text-text-muted mt-0.5">
                The Ed25519 cryptographic signature has been generated with SHA-512 validation.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-caption font-semibold text-text-muted">
                Signed License Key
              </label>
              <button
                type="button"
                onClick={() => handleCopy(result.licenseKey)}
                className="inline-flex items-center gap-1 text-caption text-primary font-medium hover:underline cursor-pointer"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={result.licenseKey}
              className="w-full font-mono text-small p-3 rounded-button bg-surface-sunken border border-border text-text select-all"
            />
          </div>

          <div>
            <label className="block text-caption font-semibold text-text-muted mb-1.5">
              Ed25519 Digital Signature
            </label>
            <textarea
              readOnly
              rows={2}
              value={result.signature}
              className="w-full font-mono text-small p-2.5 rounded-button bg-surface-sunken border border-border text-text-muted select-all"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download License File (.json)
            </Button>

            <Button variant="primary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label text-text font-medium mb-1">
                Target Company Tenant *
              </label>
              <select {...register('companyId')} className={inputClass}>
                <option value="">Select a company...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
              {errors.companyId && (
                <p className="mt-1 text-caption text-danger">{errors.companyId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-label text-text font-medium mb-1">
                License Plan Tier
              </label>
              <select {...register('plan')} className={inputClass}>
                <option value="STARTER">Starter Tier (Small Office)</option>
                <option value="GROWTH">Growth Tier (Multi-Branch)</option>
                <option value="ENTERPRISE">Enterprise Tier (Unlimited Scale)</option>
                <option value="CUSTOM">Custom Dedicated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label text-text font-medium mb-1">
                Valid Until (Expiry Date) *
              </label>
              <input type="date" {...register('validUntil')} className={inputClass} />
              {errors.validUntil && (
                <p className="mt-1 text-caption text-danger">{errors.validUntil.message}</p>
              )}
            </div>

            <div>
              <label className="block text-label text-text font-medium mb-1">
                Max Allowed Staff Seats
              </label>
              <input
                type="number"
                min={1}
                max={500}
                {...register('maxSeats', { valueAsNumber: true })}
                className={inputClass}
              />
              {errors.maxSeats && (
                <p className="mt-1 text-caption text-danger">{errors.maxSeats.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label text-text font-medium mb-1">
                Max Allowed Branches
              </label>
              <input
                type="number"
                min={1}
                max={50}
                {...register('maxBranches', { valueAsNumber: true })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-label text-text font-medium mb-1">
                Max Active Real Estate Projects
              </label>
              <input
                type="number"
                min={1}
                max={100}
                {...register('maxProjects', { valueAsNumber: true })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-label text-text font-medium mb-1">
              Machine Hardware Fingerprint ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. SHA256-HW-NODE-89F12A (leave empty for cloud access)"
              {...register('machineId')}
              className={inputClass}
            />
            <p className="mt-1 text-caption text-text-muted">
              Used strictly for offline Desktop Standalone installations to lock to client hardware.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isGenerating}>
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={isGenerating}
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              Sign & Generate License
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
