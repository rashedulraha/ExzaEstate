import type { ReactElement } from 'react';

const STEPS = [
  'Property',
  'Buyers',
  'Pricing',
  'Plan',
  'Nominee',
  'Attribution',
  'Review',
] as const;

interface BookingWizardStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function BookingWizardStepper({
  currentStep,
  onStepClick,
}: BookingWizardStepperProps): ReactElement {
  return (
    <div className="w-full py-3.5 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center justify-between w-full">
        {STEPS.map((stepName, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          let badgeClass = 'bg-surface-sunken text-text-muted border-border';
          let labelClass = 'text-text-muted';
          if (isCompleted) {
            badgeClass = 'bg-success text-white border-success';
            labelClass = 'text-text font-medium';
          } else if (isCurrent) {
            badgeClass = 'bg-primary text-on-primary border-primary ring-2 ring-primary/30';
            labelClass = 'text-primary font-bold';
          }

          return (
            <div key={stepName} className="flex items-center flex-1 last:flex-initial">
              <button
                type="button"
                disabled={!isCompleted && !isCurrent}
                onClick={() => onStepClick?.(stepNumber)}
                className="flex items-center gap-1.5 focus:outline-none cursor-pointer disabled:cursor-default shrink-0"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold border transition-all ${badgeClass}`}
                >
                  {isCompleted ? '✓' : stepNumber}
                </span>
                <span className={`text-caption whitespace-nowrap transition-colors ${labelClass}`}>
                  {stepName}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 mx-2 sm:mx-3 h-0.5 min-w-[8px] transition-colors ${
                    stepNumber < currentStep ? 'bg-success' : 'bg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
