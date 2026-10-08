import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '@exzaestate/api-client';
import type {
  SystemHealthMetrics,
  TenantItem,
  PlatformLicenseItem,
  PlatformAuditLogItem,
  OnboardTenantFormData,
  GenerateLicenseFormData,
  GeneratedLicenseResult,
} from '../schemas/system-admin.schema.js';

export function useSystemAdmin() {
  const queryClient = useQueryClient();

  // Query: All Platform Tenants
  const tenantsQuery = useQuery<TenantItem[]>({
    queryKey: ['system', 'tenants'],
    queryFn: async () => {
      const data = await customInstance<TenantItem[] | { data: TenantItem[] }>({
        url: '/api/v1/system/tenants',
        method: 'GET',
      });
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
    staleTime: 30_000,
  });

  // Query: Platform Telemetry & Server Health
  const healthQuery = useQuery<SystemHealthMetrics>({
    queryKey: ['system', 'health'],
    queryFn: async () => {
      const res = await customInstance<SystemHealthMetrics | { data: SystemHealthMetrics }>({
        url: '/api/v1/system/health',
        method: 'GET',
      });
      if (res && typeof res === 'object' && 'data' in res && res.data) {
        return res.data;
      }
      return res as SystemHealthMetrics;
    },
    refetchInterval: 15_000, // Live poll every 15 seconds
  });

  // Query: All Issued Cryptographic Licenses
  const licensesQuery = useQuery<PlatformLicenseItem[]>({
    queryKey: ['system', 'licenses'],
    queryFn: async () => {
      const data = await customInstance<PlatformLicenseItem[] | { data: PlatformLicenseItem[] }>({
        url: '/api/v1/system/licenses',
        method: 'GET',
      });
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
    staleTime: 30_000,
  });

  // Query: Platform Audit Logs
  const auditLogsQuery = useQuery<PlatformAuditLogItem[]>({
    queryKey: ['system', 'audit-logs'],
    queryFn: async () => {
      const data = await customInstance<PlatformAuditLogItem[] | { data: PlatformAuditLogItem[] }>({
        url: '/api/v1/system/tenants/audit-logs',
        method: 'GET',
      });
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
    staleTime: 30_000,
  });

  // Mutation: Onboard New Tenant Company
  const onboardMutation = useMutation({
    mutationFn: async (dto: OnboardTenantFormData) => {
      const res = await customInstance<
        | { companyId: string; companyCode: string; branchId: string }
        | { data: { companyId: string; companyCode: string; branchId: string } }
      >({
        url: '/api/v1/system/tenants',
        method: 'POST',
        data: dto,
      });
      if (res && typeof res === 'object' && 'data' in res && res.data) {
        return res.data;
      }
      return res as { companyId: string; companyCode: string; branchId: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'tenants'] });
    },
  });

  // Mutation: Suspend Tenant Company
  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return customInstance<{ success: boolean; message: string }>({
        url: `/api/v1/system/tenants/${id}/suspend`,
        method: 'POST',
        data: { reason },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'tenants'] });
    },
  });

  // Mutation: Reactivate Tenant Company
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return customInstance<{ success: boolean; message: string }>({
        url: `/api/v1/system/tenants/${id}/reactivate`,
        method: 'POST',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'tenants'] });
    },
  });

  // Mutation: Generate Cryptographic Ed25519 License
  const licenseMutation = useMutation({
    mutationFn: async (dto: GenerateLicenseFormData) => {
      const res = await customInstance<GeneratedLicenseResult | { data: GeneratedLicenseResult }>({
        url: '/api/v1/system/licenses',
        method: 'POST',
        data: dto,
      });
      if (res && typeof res === 'object' && 'data' in res && res.data) {
        return res.data;
      }
      return res as GeneratedLicenseResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'licenses'] });
    },
  });

  // Fetch single tenant details
  const fetchTenantDetails = async (id: string): Promise<TenantItem> => {
    return customInstance<TenantItem>({
      url: `/api/v1/system/tenants/${id}`,
      method: 'GET',
    });
  };

  return {
    tenants: tenantsQuery.data ?? [],
    isLoadingTenants: tenantsQuery.isLoading,
    isTenantsError: tenantsQuery.isError,
    refetchTenants: tenantsQuery.refetch,

    health: healthQuery.data,
    isLoadingHealth: healthQuery.isLoading,
    isHealthError: healthQuery.isError,
    refetchHealth: healthQuery.refetch,

    licenses: licensesQuery.data ?? [],
    isLoadingLicenses: licensesQuery.isLoading,
    refetchLicenses: licensesQuery.refetch,

    auditLogs: auditLogsQuery.data ?? [],
    isLoadingAuditLogs: auditLogsQuery.isLoading,
    refetchAuditLogs: auditLogsQuery.refetch,

    onboardTenant: onboardMutation.mutateAsync,
    isOnboarding: onboardMutation.isPending,

    suspendTenant: suspendMutation.mutateAsync,
    isSuspending: suspendMutation.isPending,

    reactivateTenant: reactivateMutation.mutateAsync,
    isReactivating: reactivateMutation.isPending,

    generateLicense: licenseMutation.mutateAsync,
    isGeneratingLicense: licenseMutation.isPending,

    fetchTenantDetails,
  };
}
