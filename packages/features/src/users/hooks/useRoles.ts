import { useQueryClient } from '@tanstack/react-query';
import {
  useRoleControllerListRoles,
  useRoleControllerCreateRole,
  useRoleControllerCloneRole,
  useRoleControllerUpdateRole,
  useRoleControllerUpdateRolePermissions,
  useRoleControllerDeleteRole,
} from '@exzaestate/api-client';
import type {
  CreateRoleFormData,
  CloneRoleFormData,
  RoleItem,
  RolePermissionItem,
} from '../schemas/role.schema.js';

export function useRoles() {
  const queryClient = useQueryClient();

  const rolesQuery = useRoleControllerListRoles();
  const createMutation = useRoleControllerCreateRole();
  const cloneMutation = useRoleControllerCloneRole();
  const updateMutation = useRoleControllerUpdateRole();
  const updatePermsMutation = useRoleControllerUpdateRolePermissions();
  const deleteMutation = useRoleControllerDeleteRole();

  const invalidateRoles = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/roles'] });
  };

  const createRole = async (data: CreateRoleFormData) => {
    const res = await createMutation.mutateAsync({ data });
    invalidateRoles();
    return res;
  };

  const cloneRole = async (id: string, data: CloneRoleFormData) => {
    const res = await cloneMutation.mutateAsync({
      id,
      data,
    });
    invalidateRoles();
    return res;
  };

  const updateRole = async (id: string, data: { name?: string; description?: string }) => {
    const res = await updateMutation.mutateAsync({
      id,
      data,
    });
    invalidateRoles();
    return res;
  };

  const updateRolePermissions = async (id: string, permissions: RolePermissionItem[]) => {
    const res = await updatePermsMutation.mutateAsync({
      id,
      data: { permissions },
    });
    invalidateRoles();
    return res;
  };

  const deleteRole = async (id: string) => {
    const res = await deleteMutation.mutateAsync({ id });
    invalidateRoles();
    return res;
  };

  return {
    roles: Array.isArray(rolesQuery.data)
      ? (rolesQuery.data as RoleItem[])
      : (rolesQuery.data as { items?: RoleItem[] } | undefined)?.items || [],
    isLoading: rolesQuery.isLoading,
    isError: rolesQuery.isError,
    refetch: rolesQuery.refetch,
    createRole,
    cloneRole,
    updateRole,
    updateRolePermissions,
    deleteRole,
    isMutating:
      createMutation.isPending ||
      cloneMutation.isPending ||
      updateMutation.isPending ||
      updatePermsMutation.isPending ||
      deleteMutation.isPending,
  };
}
