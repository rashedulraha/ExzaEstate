import { type ReactElement } from 'react';
import { Button, ExzaLogoIcon } from '@exzaestate/ui';

interface WelcomeSectionProps {
  onNext: () => void;
}

export function WelcomeSection({ onNext }: WelcomeSectionProps): ReactElement {
  return (
    <div className="w-full flex flex-col items-center text-center space-y-6 select-none py-2">
      {/* Brand Icon */}
      <div className="w-14 h-14 rounded-modal bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
        <ExzaLogoIcon size={32} variant="gold" />
      </div>

      {/* Welcome Heading & Intro */}
      <div className="space-y-2">
        <h1 className="text-display font-bold text-text tracking-tight">Welcome to ExzaEstate</h1>
        <p className="text-body text-text-muted max-w-md mx-auto leading-relaxed">
          Your complete real estate management and accounting platform. Let's set up your
          organization's workspace in a few quick steps.
        </p>
      </div>

      {/* Simple 3 Key Points */}
      <div className="w-full max-w-md space-y-2.5 text-left py-2 border-y border-border/40">
        <div className="flex items-center gap-3 text-body text-text">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span>Land & apartment property inventories and unit booking</span>
        </div>
        <div className="flex items-center gap-3 text-body text-text">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span>Automated installment collections and double-entry accounting</span>
        </div>
        <div className="flex items-center gap-3 text-body text-text">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span>Run 100% offline on this computer or connect to enterprise cloud</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2 w-full max-w-md">
        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          className="w-full py-2.5 font-semibold text-btn shadow-sm"
        >
          Get Started →
        </Button>
      </div>
    </div>
  );
}
