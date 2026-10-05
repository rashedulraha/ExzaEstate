import { type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { ExzaLogoIcon } from '@exzaestate/ui';
import { useFirstLaunch } from '../hooks/useFirstLaunch.js';
import { ModeSelectionCard } from '../components/ModeSelectionCard.js';
import { CloudSetupSection } from '../components/CloudSetupSection.js';
import { LocalSetupSection } from '../components/LocalSetupSection.js';
import { FirstLaunchSummary } from '../components/FirstLaunchSummary.js';

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps): ReactElement {
  const steps = ['Choose Mode', 'Configure Engine', 'Ready'];

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isCurrent = currentStep === stepNum;
        const isComplete = currentStep > stepNum;

        let badgeClass = 'bg-surface-sunken text-text-muted border-border';
        let textClass = 'text-text-muted';
        if (isCurrent) {
          badgeClass = 'bg-primary text-text-inverse border-primary ring-2 ring-primary/20';
          textClass = 'text-primary font-bold';
        } else if (isComplete) {
          badgeClass = 'bg-success text-text-inverse border-success';
          textClass = 'text-text';
        }

        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold border ${badgeClass}`}
              >
                {isComplete ? '✓' : stepNum}
              </span>
              <span className={`text-caption font-medium ${textClass}`}>{label}</span>
            </div>
            {idx < steps.length - 1 && <div className="w-8 h-0.5 bg-border mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

export function FirstLaunchWizardPage(): ReactElement {
  const navigate = useNavigate();
  const {
    currentStep,
    selectedMode,
    isLoading,
    selectMode,
    configureCloud,
    createLocalCompany,
    restoreLocalBackup,
    handleBrowseFile,
  } = useFirstLaunch();

  const handleProceedToLogin = () => {
    void navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between">
      <header className="border-b border-border bg-surface px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-button bg-primary flex items-center justify-center text-accent shadow-sm">
              <ExzaLogoIcon size={22} variant="gold" />
            </div>
            <div>
              <span className="text-h3 font-bold text-text">ExzaEstate</span>
              <span className="ml-2 text-caption text-text-muted font-medium">
                Initial Deployment Wizard
              </span>
            </div>
          </div>
          <span className="text-caption px-2.5 py-1 rounded-full bg-surface-sunken border border-border text-text-muted font-mono">
            v0.1.0 • Desktop Shell
          </span>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto px-4 py-8 flex-1">
        <StepIndicator currentStep={currentStep} />

        <div className="mt-6">
          {currentStep === 1 && (
            <ModeSelectionCard selectedMode={selectedMode} onSelectMode={selectMode} />
          )}

          {currentStep === 2 && selectedMode === 'cloud' && (
            <CloudSetupSection
              onConfirm={(url) => void configureCloud(url)}
              isConnecting={isLoading}
            />
          )}

          {currentStep === 2 && selectedMode === 'local' && (
            <LocalSetupSection
              onCreateCompany={(data) => void createLocalCompany(data)}
              onRestoreBackup={(path) => void restoreLocalBackup(path)}
              isLoading={isLoading}
              onBrowseFile={handleBrowseFile}
            />
          )}

          {currentStep === 3 && (
            <FirstLaunchSummary mode={selectedMode} onProceedToLogin={handleProceedToLogin} />
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-surface px-6 py-4 text-center text-caption text-text-muted">
        <p>ExzaEstate Enterprise ERP • Dual-Mode Architecture (Cloud & Local Standalone)</p>
      </footer>
    </div>
  );
}
