export interface BudgetAlertState {
  alert70Sent: boolean;
  alert85Sent: boolean;
  alert100Sent: boolean;
}

export type BudgetAlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface BudgetAlertTrigger {
  level: BudgetAlertLevel;
  thresholdPercent: number;
  message: string;
}

export interface BudgetEvaluationResult {
  spendPercentage: number;
  alertsToTrigger: BudgetAlertTrigger[];
  nextState: BudgetAlertState;
}

export function evaluateBudgetThresholds(
  budgetAmountPaisa: bigint,
  actualSpendPaisa: bigint,
  state: BudgetAlertState,
  budgetName = 'Budget',
): BudgetEvaluationResult {
  if (budgetAmountPaisa <= 0n) {
    return { spendPercentage: 0, alertsToTrigger: [], nextState: { ...state } };
  }

  const spendPercentage = Number((actualSpendPaisa * 10000n) / budgetAmountPaisa) / 100;

  const alertsToTrigger: BudgetAlertTrigger[] = [];
  const nextState: BudgetAlertState = { ...state };

  if (spendPercentage >= 70 && !nextState.alert70Sent) {
    alertsToTrigger.push({
      level: 'INFO',
      thresholdPercent: 70,
      message: `${budgetName} spend reached 70% threshold (${spendPercentage.toFixed(1)}%)`,
    });
    nextState.alert70Sent = true;
  }

  if (spendPercentage >= 85 && !nextState.alert85Sent) {
    alertsToTrigger.push({
      level: 'WARNING',
      thresholdPercent: 85,
      message: `${budgetName} spend reached 85% warning threshold (${spendPercentage.toFixed(1)}%)`,
    });
    nextState.alert85Sent = true;
  }

  if (spendPercentage >= 100 && !nextState.alert100Sent) {
    alertsToTrigger.push({
      level: 'CRITICAL',
      thresholdPercent: 100,
      message: `${budgetName} spend reached or exceeded 100% critical threshold (${spendPercentage.toFixed(1)}%)`,
    });
    nextState.alert100Sent = true;
  }

  return { spendPercentage, alertsToTrigger, nextState };
}
