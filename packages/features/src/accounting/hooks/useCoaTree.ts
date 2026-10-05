import { useMemo } from 'react';
import {
  useCoaControllerGetAccounts,
  useCoaControllerCreateAccount,
  useCoaControllerUpdateAccount,
  useCoaControllerGetAccountById,
} from '@exzaestate/api-client';
import type { AccountTreeItem, AccountFormInput } from '../schemas/accounting.schema.js';

interface RawAccountItem {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string | null;
  isGroup?: boolean;
  system?: boolean;
  partyType?: string | null;
  description?: string | null;
  balancePaisa?: string | number | bigint;
}

function parseRawAccounts(data: unknown): RawAccountItem[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data as RawAccountItem[];
  if ('items' in data && Array.isArray((data as { items: unknown[] }).items)) {
    return (data as { items: RawAccountItem[] }).items;
  }
  if ('data' in data && Array.isArray((data as { data: unknown[] }).data)) {
    return (data as { data: RawAccountItem[] }).data;
  }
  return [];
}

export function mapRawToAccountItem(acc: RawAccountItem): AccountTreeItem {
  return {
    id: acc.id,
    code: acc.code,
    name: acc.name,
    type: acc.type as AccountTreeItem['type'],
    parentId: acc.parentId ?? null,
    isGroup: Boolean(acc.isGroup),
    system: Boolean(acc.system),
    partyType: (acc.partyType as AccountTreeItem['partyType']) ?? null,
    description: acc.description ?? null,
    balancePaisa: (acc.balancePaisa ?? '0').toString(),
    children: [],
  };
}

export function buildAccountTree(flatAccounts: RawAccountItem[]): AccountTreeItem[] {
  const itemMap = new Map<string, AccountTreeItem>();

  for (const acc of flatAccounts) {
    itemMap.set(acc.id, mapRawToAccountItem(acc));
  }

  const roots: AccountTreeItem[] = [];

  for (const item of itemMap.values()) {
    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId);
      parent?.children?.push(item);
    } else {
      roots.push(item);
    }
  }

  // Sort by account code ascending
  const sortByCode = (nodes: AccountTreeItem[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        sortByCode(n.children);
      }
    }
  };

  sortByCode(roots);
  return roots;
}

export function useCoaTree() {
  const accountsQuery = useCoaControllerGetAccounts();
  const createAccountMutation = useCoaControllerCreateAccount();
  const updateAccountMutation = useCoaControllerUpdateAccount();

  const flatAccounts = useMemo(() => {
    return parseRawAccounts(accountsQuery.data);
  }, [accountsQuery.data]);

  const accounts = useMemo((): AccountTreeItem[] => {
    return flatAccounts.map(mapRawToAccountItem);
  }, [flatAccounts]);

  const tree = useMemo(() => {
    return buildAccountTree(flatAccounts);
  }, [flatAccounts]);

  const handleCreateAccount = async (data: AccountFormInput) => {
    await createAccountMutation.mutateAsync({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId || undefined,
        isGroup: data.isGroup,
        partyType: data.partyType,
        description: data.description,
      },
    });
    accountsQuery.refetch();
  };

  const handleUpdateAccount = async (id: string, data: Partial<AccountFormInput>) => {
    await updateAccountMutation.mutateAsync({
      id,
      data: {
        name: data.name,
        parentId: (data.parentId ?? undefined) as never,
        description: data.description,
      },
    });
    accountsQuery.refetch();
  };

  return {
    accounts,
    tree,
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    error: accountsQuery.error,
    refetch: accountsQuery.refetch,
    createAccount: handleCreateAccount,
    updateAccount: handleUpdateAccount,
    isSubmitting: createAccountMutation.isPending || updateAccountMutation.isPending,
  };
}

export function useAccountDetail(accountId?: string) {
  const query = useCoaControllerGetAccountById(accountId || '', {
    query: {
      enabled: Boolean(accountId),
    },
  });

  return {
    account: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
