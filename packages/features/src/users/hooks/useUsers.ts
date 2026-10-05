import { useQueryClient } from '@tanstack/react-query';
import {
  useUserAdminControllerListUsers,
  useUserAdminControllerCreateUser,
  useUserAdminControllerInviteUser,
  useUserAdminControllerDeactivateUser,
  useUserAdminControllerReactivateUser,
  useUserAdminControllerUpdateUserRoles,
  useUserAdminControllerUpdateUserBranches,
} from '@exzaestate/api-client';
import type { CreateUserFormData, InviteUserFormData, UserItem } from '../schemas/user.schema.js';

export function useUsers(params?: { status?: string; search?: string; roleId?: string }) {
  const queryClient = useQueryClient();

  const usersQuery = useUserAdminControllerListUsers({
    request: { params: params || {} },
  });

  const createUserMutation = useUserAdminControllerCreateUser();
  const inviteUserMutation = useUserAdminControllerInviteUser();
  const deactivateMutation = useUserAdminControllerDeactivateUser();
  const reactivateMutation = useUserAdminControllerReactivateUser();
  const updateRolesMutation = useUserAdminControllerUpdateUserRoles();
  const updateBranchesMutation = useUserAdminControllerUpdateUserBranches();

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
  };

  const createUser = async (data: CreateUserFormData) => {
    const res = await createUserMutation.mutateAsync({ data });
    invalidateUsers();
    return res;
  };

  const inviteUser = async (data: InviteUserFormData) => {
    const res = await inviteUserMutation.mutateAsync({ data });
    invalidateUsers();
    return res;
  };

  const deactivateUser = async (id: string) => {
    const res = await deactivateMutation.mutateAsync({ id });
    invalidateUsers();
    return res;
  };

  const reactivateUser = async (id: string) => {
    const res = await reactivateMutation.mutateAsync({ id });
    invalidateUsers();
    return res;
  };

  const updateUserRoles = async (id: string, roleIds: string[]) => {
    const res = await updateRolesMutation.mutateAsync({
      id,
      data: { roleIds },
    });
    invalidateUsers();
    return res;
  };

  const updateUserBranches = async (
    id: string,
    branches: Array<{ branchId: string; isDefault: boolean }>,
  ) => {
    const res = await updateBranchesMutation.mutateAsync({
      id,
      data: { branches },
    });
    invalidateUsers();
    return res;
  };

  return {
    users: ((usersQuery.data as { items?: UserItem[] } | undefined)?.items ||
      (usersQuery.data as UserItem[] | undefined) ||
      []) as UserItem[],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    refetch: usersQuery.refetch,
    createUser,
    inviteUser,
    deactivateUser,
    reactivateUser,
    updateUserRoles,
    updateUserBranches,
    isMutating:
      createUserMutation.isPending ||
      inviteUserMutation.isPending ||
      deactivateMutation.isPending ||
      reactivateMutation.isPending ||
      updateRolesMutation.isPending ||
      updateBranchesMutation.isPending,
  };
}
