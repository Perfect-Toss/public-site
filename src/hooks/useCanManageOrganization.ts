/**
 * Organization management permission.
 *
 * Editing an organization — its details, its members, its staff and its
 * sub-organizations — requires a global admin (Admin or SuperUser) or one of
 * the organization's own admin roles. The organization's roles have to be
 * looked up, so this reports whether a check is still in flight.
 */

import { type IRolePermission, useRolePermission } from './useRolePermission';
import { canManageOrganization } from '../utils/roles';

/**
 * Whether the current user may manage the organization.
 *
 * @param organizationId The organization the user is acting on. Without one only
 *   the global roles can grant access, since there is nothing to look a
 *   role up against.
 */
export function useCanManageOrganization(
  organizationId?: string | null,
): IRolePermission {
  return useRolePermission(organizationId, canManageOrganization);
}
