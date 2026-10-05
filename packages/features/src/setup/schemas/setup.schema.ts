export interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isMandatory: boolean;
  details?: Record<string, unknown>;
}

export interface SetupChecklistResult {
  items: ChecklistItem[];
  totalCount: number;
  completedCount: number;
  percentage: number;
  canTransact: boolean;
}
