import { useMemo } from 'react';
import { setBaseUrl, setClientInfo, setLocalSecret } from '@exzaestate/api-client';
import { formatMoney, formatDate } from '@exzaestate/shared';
import { usePlatform, type ApiConfig } from '../platform/index.js';

/**
 * Initializes the API client from an ApiConfig object.
 */
export function initApiClient(config: ApiConfig): void {
  setBaseUrl(config.baseUrl);
  setClientInfo(config.clientType, config.clientVersion);
  if (config.localSecret !== undefined) {
    setLocalSecret(config.localSecret || null);
  }
}

/**
 * Hook to access the current ApiConfig.
 */
export function useApiConfig(): ApiConfig {
  const platform = usePlatform();
  return platform.apiConfig;
}

/**
 * Currency formatting hook following ARCH-MONEY & Bangladeshi localization.
 * Formats integer paisa as BDT 5,00,000.00.
 */
export function useCurrency(amountPaisa: bigint | number | string, showCurrency = true): string {
  return useMemo(() => formatMoney(amountPaisa, { showCurrency }), [amountPaisa, showCurrency]);
}

/**
 * Date formatting hook following ARCH-DATES.
 * Formats dates in Asia/Dhaka timezone.
 */
export function useDateFormat(
  date: Date | string | number,
  formatPattern: string = 'dd MMM yyyy',
  timezone: string = 'Asia/Dhaka',
): string {
  return useMemo(() => formatDate(date, timezone, formatPattern), [date, timezone, formatPattern]);
}
