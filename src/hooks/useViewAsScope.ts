import { useMemo } from 'react';
import { useViewAsStore } from '../stores/viewAsStore';
import type { IViewAsScope } from '../utils/viewAs';

/**
 * The emulated account's scope, or null when viewing as yourself.
 *
 * Lists narrow to this scope so a super user sees the data another account
 * has access to, not the full result set their own token returns.
 */
export function useViewAsScope(): IViewAsScope | null {
  const target = useViewAsStore((state) => state.target);
  const entityIds = useViewAsStore((state) => state.entityIds);

  return useMemo(
    () => (target ? { userId: target.id, entityIds: new Set(entityIds) } : null),
    [target, entityIds],
  );
}
