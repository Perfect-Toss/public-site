import { faCirclePlay, faHistory, faListCheck } from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Event, EventInstance } from '../../../api/api.events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { OrganizationPageContext } from '../OrganizationPage';
import { fetchEventInstances } from '../../../api/api.events';
import { fetchEvents } from '../../../api/api.events';
import { formatDateTime } from '../../../utils/format';
import {
  instanceChangeCount,
  instanceEndedAt,
  instanceStartedAt,
  instanceStatus,
  type EventInstanceStatus,
} from '../../../utils/events';
import { useOutletContext } from 'react-router-dom';

const PAGE_SIZE = 200;
const INSTANCE_PAGE_SIZE = 100;

/** An instance paired with the event it belongs to. */
interface IOrgInstance {
  instance: EventInstance;
  event?: Event;
}

const STATUS_LABELS: Record<EventInstanceStatus, string> = {
  NotStarted: 'Not started',
  Running: 'Running',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  Unknown: 'Unknown',
};

/** Sort instances newest first, by when they started. */
function byStartDesc(a: IOrgInstance, b: IOrgInstance): number {
  const at = instanceStartedAt(a.instance)?.getTime() ?? 0;
  const bt = instanceStartedAt(b.instance)?.getTime() ?? 0;
  return bt - at;
}

function InstanceRow({ entry }: { entry: IOrgInstance }) {
  const { instance, event } = entry;
  const status = instanceStatus(instance);
  const started = instanceStartedAt(instance);
  const ended = instanceEndedAt(instance);

  return (
    <div className="org-instance-row">
      <div className="org-instance-main">
        <span className="org-instance-event">{event?.name || 'Untitled event'}</span>
        <span className="org-instance-when">
          {started ? formatDateTime(started.toISOString()) : '—'}
          {ended ? ` → ${formatDateTime(ended.toISOString())}` : ''}
        </span>
      </div>

      <div className="org-instance-meta">
        <span className="org-instance-changes" title="State changes recorded">
          <FontAwesomeIcon icon={faListCheck} />
          {instanceChangeCount(instance)}
        </span>
        <span className={`instance-status ${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>
      </div>
    </div>
  );
}

function EventInstancesView() {
  const { organization } = useOutletContext<OrganizationPageContext>();

  const [entries, setEntries] = useState<IOrgInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    if (!organization.id) return;
    setLoading(true);
    setError(null);
    try {
      // The organization's full history, so ended events bring their sessions too.
      const response = await fetchEvents(1, PAGE_SIZE, organization.id, true);
      const events = response.items ?? [];

      const perEvent = await Promise.all(
        events.map(async (event) => {
          if (!event.id) return [] as IOrgInstance[];
          const instances = await fetchEventInstances(event.id, 1, INSTANCE_PAGE_SIZE);
          return (instances.items ?? []).map((instance) => ({ instance, event }));
        }),
      );

      setEntries(perEvent.flat().sort(byStartDesc));
    } catch (err) {
      console.error('Failed to load event instances:', err);
      setError('Failed to load event instances. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [organization.id]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const running = useMemo(
    () => entries.filter((entry) => instanceStatus(entry.instance) === 'Running'),
    [entries],
  );

  const history = useMemo(
    () =>
      entries.filter((entry) => {
        const status = instanceStatus(entry.instance);
        return status === 'Completed' || status === 'Cancelled';
      }),
    [entries],
  );

  if (loading) {
    return (
      <div className="empty-state-large">
        <div className="spinner" />
        <p>Loading event instances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state-large">
        <h3>Could not load event instances</h3>
        <p>{error}</p>
        <button className="secondary-btn" onClick={loadInstances}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="org-instances-view">
      <section className="org-instance-section">
        <div className="org-view-header">
          <div>
            <h3 className="org-view-title">
              <FontAwesomeIcon icon={faCirclePlay} />
              Running Now
            </h3>
            <p className="org-view-subtitle">
              {running.length === 0
                ? 'No sessions are running'
                : `${running.length} ${running.length === 1 ? 'session' : 'sessions'} in progress`}
            </p>
          </div>
        </div>

        {running.length === 0 ? (
          <p className="org-instance-empty">Nothing running at the moment.</p>
        ) : (
          <div className="org-instance-list">
            {running.map((entry) => (
              <InstanceRow key={entry.instance.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section className="org-instance-section">
        <div className="org-view-header">
          <div>
            <h3 className="org-view-title">
              <FontAwesomeIcon icon={faHistory} />
              History
            </h3>
            <p className="org-view-subtitle">
              {history.length === 0
                ? 'No completed sessions yet'
                : `${history.length} past ${history.length === 1 ? 'session' : 'sessions'}`}
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="org-instance-empty">Completed and cancelled sessions will be listed here.</p>
        ) : (
          <div className="org-instance-list">
            {history.map((entry) => (
              <InstanceRow key={entry.instance.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default EventInstancesView;
