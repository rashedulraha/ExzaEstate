import { type ReactElement, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@exzaestate/app-core';
import { useFirstLaunch } from '../hooks/useFirstLaunch.js';
import { WelcomeSection } from '../components/WelcomeSection.js';
import { ModeSelectionCard } from '../components/ModeSelectionCard.js';
import { CloudSetupSection } from '../components/CloudSetupSection.js';
import { LocalSetupSection } from '../components/LocalSetupSection.js';
import { FirstLaunchSummary } from '../components/FirstLaunchSummary.js';

export function FirstLaunchWizardPage(): ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    currentStep,
    selectedMode,
    isLoading,
    isAlreadyProvisioned,
    machineFingerprint,
    provisionedDetails,
    selectMode,
    goToNextStep,
    goToPreviousStep,
    configureCloud,
    createLocalCompany,
  } = useFirstLaunch();

  useEffect(() => {
    const isLocalProvisioned =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('exzaestate_workspace_provisioned') === 'true';
    if (isAlreadyProvisioned || isLocalProvisioned) {
      if (isAuthenticated) {
        void navigate('/dashboard', { replace: true });
      } else {
        void navigate('/auth/login', { replace: true });
      }
    }
  }, [isAlreadyProvisioned, isAuthenticated, navigate]);

  const handleProceedToDashboard = () => {
    void navigate('/dashboard', { replace: true });
  };

  const handleProceedToLogin = () => {
    void navigate('/auth/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Primary Fixed Content Container */}
      <div className="w-full max-w-[560px] min-h-[520px] bg-surface border border-border/70 rounded-modal p-6 sm:p-8 shadow-lg flex flex-col justify-between transition-all">
        {currentStep === 1 && <WelcomeSection onNext={goToNextStep} />}

        {currentStep === 2 && (
          <ModeSelectionCard
            selectedMode={selectedMode}
            onSelectMode={selectMode}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}

        {currentStep === 3 && selectedMode === 'cloud' && (
          <CloudSetupSection
            onConfirm={(config) => void configureCloud(config)}
            isConnecting={isLoading}
            onBack={goToPreviousStep}
          />
        )}

        {currentStep === 3 && selectedMode === 'local' && (
          <LocalSetupSection
            onCreateCompany={(data) => void createLocalCompany(data)}
            isLoading={isLoading}
            machineFingerprint={machineFingerprint}
            onBack={goToPreviousStep}
          />
        )}

        {currentStep === 4 && (
          <FirstLaunchSummary
            mode={selectedMode}
            companyName={provisionedDetails?.companyName}
            onProceedToLogin={handleProceedToLogin}
            onProceedToDashboard={handleProceedToDashboard}
          />
        )}
      </div>
    </div>
  );
}
