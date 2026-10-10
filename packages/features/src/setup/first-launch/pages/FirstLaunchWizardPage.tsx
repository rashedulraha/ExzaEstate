import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { usePlatform } from '@exzaestate/app-core';
import { useFirstLaunch } from '../hooks/useFirstLaunch.js';
import { WelcomeSection } from '../components/WelcomeSection.js';
import { ModeSelectionCard } from '../components/ModeSelectionCard.js';
import { CloudSetupSection } from '../components/CloudSetupSection.js';
import { LocalSetupSection } from '../components/LocalSetupSection.js';
import { FirstLaunchSummary } from '../components/FirstLaunchSummary.js';

function WizardAlertBanners({
  isOnline,
  error,
}: {
  isOnline: boolean;
  error: string | null;
}): ReactElement | null {
  if (isOnline && !error) return null;

  return (
    <div className="space-y-2 mb-3">
      {!isOnline && (
        <div className="p-3 rounded-card bg-warning/10 border border-warning/30 text-warning text-caption flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span className="flex-1 font-medium">
            Internet connection required: An active connection is needed during setup to verify your
            software purchase and bind your hardware license.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-card bg-danger/10 border border-danger/30 text-danger text-caption flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span className="flex-1">{error}</span>
        </div>
      )}
    </div>
  );
}

export function FirstLaunchWizardPage(): ReactElement {
  const navigate = useNavigate();
  const platform = usePlatform();
  const isDesktop = platform.apiConfig.clientType === 'desktop';

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const {
    currentStep,
    selectedMode,
    isLoading,
    error,
    machineFingerprint,
    provisionedDetails,
    selectMode,
    goToNextStep,
    goToPreviousStep,
    configureCloud,
    createLocalCompany,
  } = useFirstLaunch();

  // NOTE: Auto-redirect disabled temporarily per user request so the onboarding wizard
  // can be freely accessed and reviewed anytime during development and testing.

  const handleProceedToDashboard = () => {
    void navigate('/dashboard', { replace: true });
  };

  const handleProceedToLogin = () => {
    void navigate('/auth/login', { replace: true });
  };

  if (!isDesktop) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Primary Fixed Content Container */}
      <div className="w-full max-w-[560px] min-h-[520px] bg-surface border border-border/70 rounded-modal p-6 sm:p-8 shadow-lg flex flex-col justify-between transition-all">
        <WizardAlertBanners isOnline={isOnline} error={error} />

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
