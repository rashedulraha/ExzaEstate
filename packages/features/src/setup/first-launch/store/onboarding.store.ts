import { useSyncExternalStore } from 'react';
import { getEnvApiBaseUrl, getEnvInitialLicenseKey } from '@exzaestate/app-core';
import type { RuntimeModeChoice, CreateLocalCompanyInput } from '../schemas/first-launch.schema.js';

export interface OnboardingState {
  currentStep: number;
  selectedMode: RuntimeModeChoice;
  companyData: Partial<CreateLocalCompanyInput>;
  cloudBaseUrl: string;
  isEmailVerified: boolean;
  provisionedDetails: {
    companyName?: string;
    companyCode?: string;
    adminEmail?: string;
  } | null;
}

export interface OnboardingActions {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setMode: (mode: RuntimeModeChoice) => void;
  updateCompanyData: (data: Partial<CreateLocalCompanyInput>) => void;
  setCloudBaseUrl: (url: string) => void;
  setEmailVerified: (verified: boolean) => void;
  setProvisionedDetails: (details: OnboardingState['provisionedDetails']) => void;
  resetOnboarding: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

const initialState: OnboardingState = {
  currentStep: 1,
  selectedMode: 'local',
  companyData: {
    companyName: '',
    companyCode: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    tradeLicense: '',
    licenseKey: getEnvInitialLicenseKey(),
  },
  cloudBaseUrl: getEnvApiBaseUrl(),
  isEmailVerified: true,
  provisionedDetails: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

let state: OnboardingStore;

const getState = (): OnboardingStore => state;

const setState = (
  partial: Partial<OnboardingStore> | ((prev: OnboardingStore) => Partial<OnboardingStore>),
) => {
  const next = typeof partial === 'function' ? partial(state) : partial;
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

state = {
  ...initialState,
  setStep: (step: number) => setState({ currentStep: step }),
  nextStep: () => setState((s) => ({ currentStep: Math.min(4, s.currentStep + 1) })),
  prevStep: () => setState((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),
  setMode: (selectedMode: RuntimeModeChoice) => setState({ selectedMode }),
  updateCompanyData: (data: Partial<CreateLocalCompanyInput>) =>
    setState((s) => ({ companyData: { ...s.companyData, ...data } })),
  setCloudBaseUrl: (cloudBaseUrl: string) => setState({ cloudBaseUrl }),
  setEmailVerified: (isEmailVerified: boolean) => setState({ isEmailVerified }),
  setProvisionedDetails: (provisionedDetails: OnboardingState['provisionedDetails']) =>
    setState({ provisionedDetails }),
  resetOnboarding: () => setState({ ...initialState }),
};

/**
 * Zustand-compatible reactive hook for First-Launch Onboarding ephemeral state.
 */
export function useOnboardingStore(): OnboardingStore;
export function useOnboardingStore<T>(selector: (state: OnboardingStore) => T): T;
export function useOnboardingStore<T>(
  selector?: (state: OnboardingStore) => T,
): T | OnboardingStore {
  const getSnapshot = () => (selector ? selector(state) : state);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

useOnboardingStore.getState = getState;
useOnboardingStore.setState = setState;
useOnboardingStore.subscribe = subscribe;
