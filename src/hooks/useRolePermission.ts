/**
 * Applies a role rule to the current user.
 *
 * The account's global roles are known up front, so the rule is checked against
 * them first. Only when that fails is a lookup made against an organization,
 * and the rule is then re-checked with both sets — a role held on the
 * organization counts alongside the account's own roles.
 */

import { useEffect, useState } from 'react';

import { fetchEntityUserRoles } from '../api/api.entities';
import { useAuth } from '../contexts/useAuth';

export interface IRolePermission {
  /** True when the current user's roles satisfy the rule. */
  allowed: boolean;
  /** True while an organization-scoped role lookup is in flight. */
  checking: boolean;
}

/**
 * Whether the current user's roles satisfy `isAllowed`.
 *
 * @param organizationId The organization the user is acting on. Without one
 *   only the global roles can grant permission, since there is nothing to look
 *   a role up against.
 * @param isAllowed The rule to apply. Pass a module-level function — the lookup
 *   re-runs whenever this reference changes.
 */
export function useRolePermission(
  organizationId: string | null | undefined,
  isAllowed: (roles: readonly string[]) => boolean,
): IRolePermission {
  const { currentUser } = useAuth();
  const userId = currentUser?.id;
  const globalRoles = currentUser?.roles ?? null;

  const [permission, setPermission] = useState<IRolePermission>(() => ({
    allowed: isAllowed(globalRoles ?? []),
    checking: false,
  }));

  useEffect(() => {
    if (isAllowed(globalRoles ?? [])) {
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
      .then((organizationRoles) => {
        if (cancelled) return;
        setPermission({
          allowed: isAllowed([...(globalRoles ?? []), ...organizationRoles]),
          checking: false,
        });
      })
      .catch(() => {
        if (!cancelled) setPermission({ allowed: false, checking: false });
      });

    return () => {
      cancelled = true;
    };
  }, [globalRoles, organizationId, userId, isAllowed]);

  return permission;
}
