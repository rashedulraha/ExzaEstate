import type { ReactElement } from 'react';
import { Button } from '@exzaestate/ui';

function getStepButtonClass(stepIndex: number, currentStep: number): string {
  if (currentStep === stepIndex) return 'bg-primary w-5';
  if (currentStep > stepIndex) return 'bg-primary/50 w-2';
  return 'bg-border w-2';
}

function getStepLabel(subStep: number): string {
  if (subStep === 1) return 'Step 1 of 3: Organization Details';
  if (subStep === 2) return 'Step 2 of 3: Administrator Account';
  return 'Step 3 of 3: Software Licensing';
}

export function StepIndicatorBar({
  subStep,
  onGoToStep1,
  onGoToStep2,
  onGoToStep3,
}: {
  subStep: 1 | 2 | 3;
  onGoToStep1: () => void;
  onGoToStep2: () => void;
  onGoToStep3: () => void;
}): ReactElement {
  return (
    <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-caption font-bold">
          {subStep}
        </span>
        <span className="text-caption font-semibold text-text">{getStepLabel(subStep)}</span>
      </div>
      <div className="flex items-center gap-1.5" role="tablist">
        <button
          type="button"
          onClick={onGoToStep1}
          aria-label="Step 1: Organization"
          className={`h-2 rounded-full transition-all cursor-pointer ${getStepButtonClass(1, subStep)}`}
        />
        <button
          type="button"
          onClick={onGoToStep2}
          aria-label="Step 2: Administrator"
          className={`h-2 rounded-full transition-all cursor-pointer ${getStepButtonClass(2, subStep)}`}
        />
        <button
          type="button"
          onClick={onGoToStep3}
          aria-label="Step 3: Licensing"
          className={`h-2 rounded-full transition-all cursor-pointer ${getStepButtonClass(3, subStep)}`}
        />
      </div>
    </div>
  );
}

export function LocalFormFooterActions({
  subStep,
  isLoading,
  onBack,
  onPrevSubStep,
  onNextToAdmin,
  onNextToLicense,
}: {
  subStep: 1 | 2 | 3;
  isLoading: boolean;
  onBack?: () => void;
  onPrevSubStep: () => void;
  onNextToAdmin: () => void;
  onNextToLicense: () => void;
}): ReactElement {
  const renderBackBtn = () => {
    if (subStep === 1) {
      if (!onBack) return <div />;
      return (
        <Button type="button" variant="secondary" onClick={onBack} disabled={isLoading}>
          ← Back to Choose Mode
        </Button>
      );
    }
    return (
      <Button type="button" variant="secondary" onClick={onPrevSubStep} disabled={isLoading}>
        ← Back
      </Button>
    );
  };

  return (
    <div className="pt-3 flex items-center justify-between border-t border-border/40 mt-4">
      {renderBackBtn()}

      <div className="flex items-center gap-2">
        {subStep === 1 && (
          <Button
            type="button"
            variant="primary"
            onClick={onNextToAdmin}
            disabled={isLoading}
            className="px-6 py-2.5 font-semibold text-btn shadow-sm"
          >
            Next: Admin Account →
          </Button>
        )}

        {subStep === 2 && (
          <Button
            type="button"
            variant="primary"
            onClick={onNextToLicense}
            disabled={isLoading}
            className="px-6 py-2.5 font-semibold text-btn shadow-sm"
          >
            Next: Software License →
          </Button>
        )}

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
          className={subStep === 3 ? 'px-6 py-2.5 font-semibold text-btn shadow-sm' : 'sr-only'}
        >
          {isLoading ? 'Provisioning Workspace...' : 'Install & Launch Workspace →'}
        </Button>
      </div>
    </div>
  );
}
