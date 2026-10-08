import '../../styles/page.css';
import './AdminCachePage.css';

import {
  faArrowsRotate,
  faDatabase,
  faSpinner,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  fetchEntityInfoCacheStats,
  fetchUserInfoCacheStats,
  flushEntityInfoCache,
  flushUserInfoCache,
  refreshEntityInfoCacheEntry,
  refreshUserInfoCacheEntry,
  type CacheStats,
} from '../../api/api.admin';
import { formatBytes } from '../../utils/format';
import { OrganizationPicker } from '../common/OrganizationPicker';
import { UserPicker } from '../common/UserPicker';
import { useEntityStore } from '../../stores/entityStore';
import { useUserStore } from '../../stores/userStore';

/* ─── Cache controller ────────────────────────────────────────────── */

/** The three admin operations a single cache exposes. */
interface ICacheEndpoint {
  fetchStats: () => Promise<CacheStats>;
  flush: () => Promise<void>;
  refreshEntry: (id: string) => Promise<void>;
}

interface ICacheController {
  stats: CacheStats | null;
  statsLoading: boolean;
  refreshingAll: boolean;
  refreshingOne: boolean;
  message: string | null;
  error: string | null;
  reload: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshOne: (id: string) => Promise<void>;
}

/** Owns the stats + action state for one cache. */
function useCacheController(endpoint: ICacheEndpoint): ICacheController {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingOne, setRefreshingOne] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await endpoint.fetchStats());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cache statistics');
    } finally {
      setStatsLoading(false);
    }
  }, [endpoint]);

  const refreshAll = useCallback(async () => {
    setRefreshingAll(true);
    setMessage(null);
    setError(null);
    try {
      await endpoint.flush();
      setStats(await endpoint.fetchStats());
      setMessage('Cache flushed and re-warmed from the database.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flush the cache');
    } finally {
      setRefreshingAll(false);
    }
  }, [endpoint]);

  const refreshOne = useCallback(
    async (id: string) => {
      if (!id) return;
      setRefreshingOne(true);
      setMessage(null);
      setError(null);
      try {
        await endpoint.refreshEntry(id);
        setStats(await endpoint.fetchStats());
        setMessage('Entry dropped and reloaded from the database.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refresh the entry');
      } finally {
        setRefreshingOne(false);
      }
    },
    [endpoint],
  );

  return {
    stats,
    statsLoading,
    refreshingAll,
    refreshingOne,
    message,
    error,
    reload,
    refreshAll,
    refreshOne,
  };
}

/* ─── Cache card ──────────────────────────────────────────────────── */

interface CacheCardProps {
  title: string;
  description: string;
  icon: IconDefinition;
  cache: ICacheController;
  /** The single-entry refresh control (picker + button). */
  children: ReactNode;
}

function CacheCard({ title, description, icon, cache, children }: CacheCardProps) {
  return (
    <div className="info-card cache-card">
      <div className="info-card-header">
        <span className="info-card-title">
          <FontAwesomeIcon icon={icon} />
          {title}
        </span>
        <button
          type="button"
          className="secondary-btn"
          onClick={cache.refreshAll}
          disabled={cache.refreshingAll}
        >
          <FontAwesomeIcon
            icon={cache.refreshingAll ? faSpinner : faTrashCan}
            spin={cache.refreshingAll}
          />
          Flush &amp; re-warm
        </button>
      </div>

      <p className="cache-card-description">{description}</p>

      <div className="cache-stats">
        <div className="cache-stat">
          <span className="cache-stat-value">
            {cache.statsLoading ? '—' : cache.stats?.count ?? '—'}
          </span>
          <span className="cache-stat-label">Entries</span>
        </div>
        <div className="cache-stat">
          <span className="cache-stat-value">
            {cache.statsLoading ? '—' : cache.stats ? formatBytes(cache.stats.totalSize) : '—'}
          </span>
          <span className="cache-stat-label">Estimated size</span>
        </div>
      </div>

      <div className="cache-refresh-one">
        <span className="cache-refresh-label">Refresh a single entry</span>
        {children}
      </div>

      {cache.message && <div className="cache-message">{cache.message}</div>}
      {cache.error && <div className="cache-error">{cache.error}</div>}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

const USER_CACHE: ICacheEndpoint = {
  fetchStats: fetchUserInfoCacheStats,
  flush: flushUserInfoCache,
  refreshEntry: refreshUserInfoCacheEntry,
};

const ENTITY_CACHE: ICacheEndpoint = {
  fetchStats: fetchEntityInfoCacheStats,
  flush: flushEntityInfoCache,
  refreshEntry: refreshEntityInfoCacheEntry,
};

function AdminCachePage() {
  const { users, loadUsers } = useUserStore();
  const { entities, loadEntities } = useEntityStore();

  const userCache = useCacheController(USER_CACHE);
  const entityCache = useCacheController(ENTITY_CACHE);
  const { reload: reloadUserStats } = userCache;
  const { reload: reloadEntityStats } = entityCache;

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  useEffect(() => {
    reloadUserStats();
    reloadEntityStats();
    loadUsers();
    loadEntities();
  }, [reloadUserStats, reloadEntityStats, loadUsers, loadEntities]);

  return (
    <div className="admin-cache-page">
      <section className="section">
        <div className="section-header">
          <h2>Cache Management</h2>
        </div>

        <div className="cache-grid">
          <CacheCard
            title="User Info Cache"
            description="Hydrated audit-user records used when mapping domain objects. Flushing re-warms every entry from the database."
            icon={faDatabase}
            cache={userCache}
          >
            <div className="cache-refresh-row">
              <UserPicker
                users={users}
                multiple={false}
                values={selectedUserId ? [selectedUserId] : []}
                onChange={(ids) => setSelectedUserId(ids[0] ?? '')}
                placeholder="Select a user..."
                searchPlaceholder="Search users..."
              />
              <button
                type="button"
                className="secondary-btn"
                disabled={!selectedUserId || userCache.refreshingOne}
                onClick={() => userCache.refreshOne(selectedUserId)}
              >
                <FontAwesomeIcon
                  icon={userCache.refreshingOne ? faSpinner : faArrowsRotate}
                  spin={userCache.refreshingOne}
                />
                Refresh
              </button>
            </div>
          </CacheCard>

          <CacheCard
            title="Entity Info Cache"
            description="Cached organization records used for hierarchy and descendant lookups. Flushing re-warms every entry from the database."
            icon={faDatabase}
            cache={entityCache}
          >
            <div className="cache-refresh-row">
              <OrganizationPicker
                organizations={entities}
                value={selectedEntityId}
                onChange={setSelectedEntityId}
                placeholder="Select an organization..."
              />
              <button
                type="button"
                className="secondary-btn"
                disabled={!selectedEntityId || entityCache.refreshingOne}
                onClick={() => entityCache.refreshOne(selectedEntityId)}
              >
                <FontAwesomeIcon
                  icon={entityCache.refreshingOne ? faSpinner : faArrowsRotate}
                  spin={entityCache.refreshingOne}
                />
                Refresh
              </button>
            </div>
          </CacheCard>
        </div>
      </section>
    </div>
  );
}

export default AdminCachePage;
