import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Input, Button } from '@exzaestate/ui';
import { Search } from 'lucide-react';
import { useCustomerStatement } from '../hooks/useCustomerStatement.js';
import { CustomerStatementViewer } from '../components/statements/CustomerStatementViewer.js';

export function CustomerStatementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';
  const [customerIdInput, setCustomerIdInput] = useState(initialCustomerId);

  const { filter, setFilter, statement, reconciliation, isLoading } =
    useCustomerStatement(initialCustomerId);

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    const clean = customerIdInput.trim();
    if (clean) {
      setSearchParams({ customerId: clean });
      setFilter({ ...filter, customerId: clean });
    }
  };

  const handleDateChange = (from: string, to: string) => {
    setFilter({
      ...filter,
      fromDate: from,
      toDate: to,
    });
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6" data-testid="customer-statement-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text">Customer Account Statement</h1>
          <p className="text-small text-text-muted mt-1">
            Complete history of customer bookings, installment payments, and outstanding balances.
          </p>
        </div>

        <form onSubmit={handleLookup} className="flex items-center gap-2">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="statementCustomerId"
              placeholder="Enter customer ID or name..."
              value={customerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {/* Main Statement Viewer Component */}
      <CustomerStatementViewer
        statement={statement ?? null}
        reconciliation={reconciliation ?? null}
        isLoading={isLoading}
        fromDate={filter.fromDate}
        toDate={filter.toDate}
        onFilterChange={handleDateChange}
        onExportPdf={handleExportPdf}
      />
    </div>
  );
}
