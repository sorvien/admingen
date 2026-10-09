import { useAuth } from './useAuth';
import type { AuthUser, ResourcePermissions } from '@sorvien/admingen-types';

export function extractUserRoles(user: AuthUser | null | undefined): Array<string> {
  if (!user) return [];
  const roles: Array<string> = [];
  if (user.role) roles.push(user.role);
  if (Array.isArray(user.roles)) roles.push(...user.roles);
  return roles;
}

export function hasPermission(
  resource: { permissions?: ResourcePermissions } | undefined,
  action: 'list' | 'read' | 'create' | 'update' | 'delete',
  user: AuthUser | null | undefined
): boolean {
  if (!resource || !resource.permissions) return true;
  const rule = resource.permissions[action] ?? (action === 'read' ? resource.permissions.list : undefined);
  if (rule === undefined) return true;
  if (typeof rule === 'boolean') return rule;
  if (Array.isArray(rule)) {
    if (rule.length === 0) return false;
    const userRoles = extractUserRoles(user);
    return rule.some((r) => userRoles.includes(r));
  }
  return true;
}

export function usePermission(resource: { permissions?: ResourcePermissions } | undefined) {
  const { user } = useAuth();
  return {
    canList: hasPermission(resource, 'list', user),
    canRead: hasPermission(resource, 'read', user),
    canCreate: hasPermission(resource, 'create', user),
    canUpdate: hasPermission(resource, 'update', user),
    canDelete: hasPermission(resource, 'delete', user),
    user,
  };
}
