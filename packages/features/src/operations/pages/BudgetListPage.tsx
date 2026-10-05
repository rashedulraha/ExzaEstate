import { useState } from 'react';
import { Plus, PieChart } from 'lucide-react';
import { Button } from '@exzaestate/ui';
import { useBudgets } from '../hooks/useBudgets.js';
import { useExpenses } from '../hooks/useExpenses.js';
import { BudgetDataTable } from '../components/budgets/BudgetDataTable.js';
import { BudgetModal } from '../components/budgets/BudgetModal.js';
import type { CreateBudgetInput } from '../schemas/operations.schema.js';

export function BudgetListPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    budgets,
    isLoadingBudgets: isLoading,
    refetchBudgets: refetch,
    createBudget,
  } = useBudgets();
  const { categories } = useExpenses();

  const handleCreateBudget = async (input: CreateBudgetInput) => {
    await createBudget(input);
    refetch();
  };

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            <h1 className="text-h1 font-semibold text-text">
              Operational Budgets & Overrun Protection
            </h1>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Real-time threshold alert engine (70% Info, 85% Warning, 100% Critical Overrun)
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Set Budget
        </Button>
      </div>

      <BudgetDataTable budgets={budgets} isLoading={isLoading} />

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateBudget}
        categories={categories}
      />
    </div>
  );
}
