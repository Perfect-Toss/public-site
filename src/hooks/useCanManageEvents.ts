/**
 * Event management permission.
 *
 * Creating or updating an event requires a global admin (Admin or SuperUser) or
 * the OrganizationAdmin role on the event's organization — the same rule the API
 * applies. A global role is known up front, but an organization's role has to be
 * looked up, so this reports whether a check is still in flight.
 */

import { useEffect, useState } from 'react';

import { canCreateEvent } from '../utils/roles';
import { fetchEntityUserRoles } from '../api/api.entities';
import { useAuth } from '../contexts/useAuth';

export interface IEventManagementPermission {
  /** True when the current user may create or update events for the organization. */
  allowed: boolean;
  /** True while an organization-scoped role lookup is in flight. */
  checking: boolean;
}

/**
 * Whether the current user may create or update events.
 *
 * @param organizationId The organization the user is acting on. Without one only
 *   the global roles can grant access, since there is nothing to look a
 *   role up against.
 */
export function useCanManageEvents(organizationId?: string | null): IEventManagementPermission {
  const { currentUser, canCreateEvents } = useAuth();
  const userId = currentUser?.id;

  const [permission, setPermission] = useState<IEventManagementPermission>(() => ({
    allowed: canCreateEvents,
    checking: !canCreateEvents && Boolean(organizationId),
  }));

  useEffect(() => {
    if (canCreateEvents) {
      setPermission({ allowed: true, checking: false });
      return;
    }

    if (!organizationId || !userId) {
      setPermission({ allowed: false, checking: false });
      return;
    }

    let cancelled = false;
    setPermission({ allowed: false, checking: true });

    fetchEntityUserRoles(organizationId, userId)
      .then((roles) => {
        if (!cancelled) setPermission({ allowed: canCreateEvent(roles), checking: false });
      })
      .catch(() => {
        if (!cancelled) setPermission({ allowed: false, checking: false });
      });

    return () => {
      cancelled = true;
    };
  }, [canCreateEvents, organizationId, userId]);

  return permission;
}
