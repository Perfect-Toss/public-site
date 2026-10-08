/**
 * In-memory snapshot cache for page data.
 *
 * A page that already loaded its rows keeps them here, so the next visit paints
 * them straight away while the fetch refreshes them behind the scenes instead of
 * showing the loading state again. Snapshots live for the tab's lifetime — a
 * reload starts cold.
 */
const snapshots = new Map<string, unknown>();

/** One key per page whose loaded data is worth keeping between visits. */
export const CACHE_KEYS = {
  EVENTS: 'events',
  VIDEOS: 'videos',
} as const;

/** The snapshot stored under `key`, or undefined when the page never loaded. */
export function readCache<T>(key: string): T | undefined {
  return snapshots.get(key) as T | undefined;
}

/** Replace the snapshot stored under `key`. */
export function writeCache<T>(key: string, value: T): void {
  snapshots.set(key, value);
}

/** Drop every snapshot, so the next visit starts from a cold page. */
export function clearCache(): void {
  snapshots.clear();
}
