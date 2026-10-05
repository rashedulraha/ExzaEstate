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
    <div className="w-full py-3 border-b border-border bg-surface-sunken/50 px-4">
      <div className="flex items-center justify-between max-w-3xl mx-auto overflow-x-auto">
        {STEPS.map((stepName, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          let badgeClass = 'bg-surface-sunken text-text-muted border-border';
          let labelClass = 'text-text-muted';
          if (isCompleted) {
            badgeClass = 'bg-success text-on-action border-success';
            labelClass = 'text-text';
          } else if (isCurrent) {
            badgeClass = 'bg-primary text-on-action border-primary ring-2 ring-primary/20';
            labelClass = 'text-primary font-bold';
          }

          return (
            <div key={stepName} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!isCompleted && !isCurrent}
                onClick={() => onStepClick?.(stepNumber)}
                className="flex items-center gap-1.5 focus:outline-none"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold border ${badgeClass}`}
                >
                  {isCompleted ? '✓' : stepNumber}
                </span>
                <span className={`text-caption font-medium ${labelClass}`}>{stepName}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-4 sm:w-8 h-0.5 ${
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
