export interface RoleDefinition {
  code: string;
  name: string;
  description: string;
  permissions: Array<{ code: string; scope?: string }>;
}
