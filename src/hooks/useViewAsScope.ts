import type { IViewAsScope } from '../utils/viewAs';
import { useMemo } from 'react';
import { useViewAsStore } from '../stores/viewAsStore';

/**
 * The emulated account's scope, or null when viewing as yourself.
 *
 * Lists narrow to this scope so an admin sees the data another account has
 * access to, not the full result set their own token returns.
 */
export function useViewAsScope(): IViewAsScope | null {
  const target = useViewAsStore((state) => state.target);
  const entityIds = useViewAsStore((state) => state.entityIds);
  const entityRoles = useViewAsStore((state) => state.entityRoles);

  return useMemo(
    () =>
      target
        ? {
            userId: target.id,
            entityIds: new Set(entityIds),
            entityRoles: new Map(
              Object.entries(entityRoles).map(([entityId, roles]) => [entityId, new Set(roles)]),
            ),
          }
        : null,
    [target, entityIds, entityRoles],
  );
}
