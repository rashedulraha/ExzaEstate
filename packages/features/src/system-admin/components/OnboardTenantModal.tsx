import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Button } from '@exzaestate/ui';
import { Building2, User, Mail, Lock, Phone } from 'lucide-react';
import { onboardTenantSchema, type OnboardTenantFormData } from '../schemas/system-admin.schema.js';

interface OnboardTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OnboardTenantFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const inputClass =
  'block w-full rounded-button border border-border-input bg-surface px-3 py-2 text-body text-text placeholder:text-text-disabled transition focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus';

export function OnboardTenantModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: OnboardTenantModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OnboardTenantFormData>({
    resolver: zodResolver(onboardTenantSchema),
    defaultValues: {
      timezone: 'Asia/Dhaka',
      branchName: 'Head Office',
      branchCode: 'HO',
      managingDirector: {
        password: 'Password@2026!',
      },
    },
  });

  const handleFormSubmit = async (data: OnboardTenantFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Register New Company"
      description="Add a new business to ExzaEstate, set up their primary office branch, and create their administrator account."
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Section 1: Company Profile */}
        <div className="space-y-3">
          <h3 className="text-caption font-semibold text-text-muted flex items-center gap-1.5 border-b border-border pb-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            Company Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label text-text font-medium mb-1">Company Name *</label>
              <input
                type="text"
                placeholder="e.g. Shanta Holdings Ltd."
                {...register('name')}
                className={inputClass}
              />
              {errors.name && (
                <p className="mt-1 text-caption text-danger">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-label text-text font-medium mb-1">
                Company Short Code *
              </label>
              <input
                type="text"
                placeholder="e.g. SHANTA"
                {...register('code')}
                className={`${inputClass} uppercase`}
              />
              {errors.code && (
                <p className="mt-1 text-caption text-danger">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label text-text font-medium mb-1">
                Primary Office Branch
              </label>
              <input
                type="text"
                placeholder="Head Office"
                {...register('branchName')}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-label text-text font-medium mb-1">
                Timezone / Region
              </label>
              <input
                type="text"
                placeholder="Asia/Dhaka"
                {...register('timezone')}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Managing Director (Company Admin) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-caption font-semibold text-text-muted flex items-center gap-1.5 border-b border-border pb-1.5">
            <User className="w-3.5 h-3.5 text-primary" />
            Company Administrator / Managing Director Account
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label text-text font-medium mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Mahbubur Rahman"
                {...register('managingDirector.fullName')}
                className={inputClass}
              />
              {errors.managingDirector?.fullName && (
                <p className="mt-1 text-caption text-danger">
                  {errors.managingDirector.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-label text-text font-medium mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-text-muted" />
                Official Email Address *
              </label>
              <input
                type="email"
                placeholder="md@company.com"
                {...register('managingDirector.email')}
                className={inputClass}
              />
              {errors.managingDirector?.email && (
                <p className="mt-1 text-caption text-danger">
                  {errors.managingDirector.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label text-text font-medium mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-text-muted" />
                Initial Password *
              </label>
              <input
                type="text"
                placeholder="Password@2026!"
                {...register('managingDirector.password')}
                className={inputClass}
              />
              {errors.managingDirector?.password && (
                <p className="mt-1 text-caption text-danger">
                  {errors.managingDirector.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-label text-text font-medium mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-text-muted" />
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+880 1712-000000"
                {...register('managingDirector.phone')}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Register &amp; Create Company
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
