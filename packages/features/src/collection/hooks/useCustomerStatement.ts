import { useState } from 'react';
import {
  useStatementControllerGetCustomerStatement,
  useStatementControllerGetArReconciliation,
} from '@exzaestate/api-client';
import type {
  CustomerStatementFilterInput,
  CustomerStatementReport,
  ArReconciliationReport,
} from '../schemas/collection.schema.js';

function getStatementQueryParams(filter: CustomerStatementFilterInput) {
  return {
    fromDate: filter.fromDate ? filter.fromDate : undefined,
    toDate: filter.toDate ? filter.toDate : undefined,
    bookingId: filter.bookingId ? filter.bookingId : undefined,
  };
}

export function useCustomerStatement(initialCustomerId = '') {
  const [filter, setFilter] = useState<CustomerStatementFilterInput>({
    customerId: initialCustomerId,
    fromDate: '',
    toDate: '',
    bookingId: '',
  });

  const hasCustomer = Boolean(filter.customerId);
  const statementQuery = useStatementControllerGetCustomerStatement(
    filter.customerId,
    getStatementQueryParams(filter),
    {
      query: {
        enabled: hasCustomer,
      },
    },
  );

  const reconciliationQuery = useStatementControllerGetArReconciliation(filter.customerId, {
    query: {
      enabled: hasCustomer,
    },
  });

  const statementData = statementQuery.data as unknown as CustomerStatementReport | undefined;
  const reconciliationData = reconciliationQuery.data as unknown as
    | ArReconciliationReport
    | undefined;
  const lines = statementData?.lines ?? [];

  return {
    filter,
    setFilter,
    statement: statementData,
    reconciliation: reconciliationData,
    lines,
    isLoading: statementQuery.isLoading || reconciliationQuery.isLoading,
    isError: statementQuery.isError || reconciliationQuery.isError,
    error: statementQuery.error ?? reconciliationQuery.error,
    refetch: () => {
      statementQuery.refetch();
      reconciliationQuery.refetch();
    },
  };
}
