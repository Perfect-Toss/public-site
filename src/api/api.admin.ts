/**
 * Admin API functions.
 *
 * The cache-statistics endpoints return a JSON body the OpenAPI document does
 * not describe (the 200 response declares no content), so the shape is
 * asserted here as `{ count, totalSize }`.
 */

import { api } from './index';

/** Entry count and estimated total size of a server-side cache. */
export interface CacheStats {
  count: number;
  totalSize: number;
}

/* ─── User-info cache ─────────────────────────────────────────────────── */

/** Get statistics for the user-info cache. */
export async function fetchUserInfoCacheStats(): Promise<CacheStats> {
  const { data, error } = await api.GET('/api/v1/admin/cache/user-info', {});

  if (error) {
    console.error('Failed to fetch user-info cache stats:', error);
    throw new Error('Failed to fetch user-info cache stats');
  }

  return (data as CacheStats | undefined) ?? { count: 0, totalSize: 0 };
}

/** Flush the entire user-info cache and re-warm it from the database. */
export async function flushUserInfoCache(): Promise<void> {
  const { error } = await api.DELETE('/api/v1/admin/cache/user-info', {});

  if (error) {
    console.error('Failed to flush user-info cache:', error);
    throw new Error('Failed to flush user-info cache');
  }
}

/** Drop a single user from the user-info cache and reload it from the database. */
export async function refreshUserInfoCacheEntry(userId: string): Promise<void> {
  const { error } = await api.DELETE('/api/v1/admin/cache/user-info/{userId}', {
    params: { path: { userId } },
  });

  if (error) {
    console.error('Failed to refresh user-info cache entry:', error);
    throw new Error('Failed to refresh user-info cache entry');
  }
}

/* ─── Entity-info cache ───────────────────────────────────────────────── */

/** Get statistics for the entity-info cache. */
export async function fetchEntityInfoCacheStats(): Promise<CacheStats> {
  const { data, error } = await api.GET('/api/v1/admin/cache/entity-info', {});

  if (error) {
    console.error('Failed to fetch entity-info cache stats:', error);
    throw new Error('Failed to fetch entity-info cache stats');
  }

  return (data as CacheStats | undefined) ?? { count: 0, totalSize: 0 };
}

/** Flush the entire entity-info cache and re-warm it from the database. */
export async function flushEntityInfoCache(): Promise<void> {
  const { error } = await api.DELETE('/api/v1/admin/cache/entity-info', {});

  if (error) {
    console.error('Failed to flush entity-info cache:', error);
    throw new Error('Failed to flush entity-info cache');
  }
}

/** Drop a single entity from the entity-info cache and reload it from the database. */
export async function refreshEntityInfoCacheEntry(entityId: string): Promise<void> {
  const { error } = await api.DELETE('/api/v1/admin/cache/entity-info/{entityId}', {
    params: { path: { entityId } },
  });

  if (error) {
    console.error('Failed to refresh entity-info cache entry:', error);
    throw new Error('Failed to refresh entity-info cache entry');
  }
}
