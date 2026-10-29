/**
 * Event management permission.
 *
 * Creating or updating an event requires a global admin (Admin or SuperUser) or
 * the OrganizationAdmin role on the event's organization — the same rule the API
 * applies. A global role is known up front, but an organization's role has to be
 * looked up, so this reports whether a check is still in flight.
 */

import { type IRolePermission, useRolePermission } from './useRolePermission';
import { canCreateEvent } from '../utils/roles';

export type IEventManagementPermission = IRolePermission;

/**
 * Whether the current user may create or update events.
 *
 * @param organizationId The organization the user is acting on. Without one only
 *   the global roles can grant access, since there is nothing to look a
 *   role up against.
 */
export function useCanManageEvents(organizationId?: string | null): IRolePermission {
  return useRolePermission(organizationId, canCreateEvent);
}
