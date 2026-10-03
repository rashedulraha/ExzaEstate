import { MD_GM_ROLES } from './md-gm-roles.data.js';
import { ACC_EXEC_ROLES } from './acc-exec-roles.data.js';
import { RoleDefinition } from './role-definition.interface.js';

export * from './role-definition.interface.js';

export const DEFAULT_TENANT_ROLES: RoleDefinition[] = [...MD_GM_ROLES, ...ACC_EXEC_ROLES];
