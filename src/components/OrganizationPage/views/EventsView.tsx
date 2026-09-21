import { faCalendarDays, faPlus, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useState } from 'react';

import type { Event } from '../../../api/api.events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import type { OrganizationPageContext } from '../OrganizationPage';
import { describeSchedule } from '../../../utils/events';
import { fetchEvents } from '../../../api/api.events';
import { formatDateTime } from '../../../utils/format';
import { nextOccurrence } from '../../../utils/events';
import { useCanManageEvents } from '../../../hooks/useCanManageEvents';
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';

const PAGE_SIZE = 200;

/** The next upcoming occurrence of an event, as display text. */
function nextOccurrenceLabel(event: Event): string {
  const next = nextOccurrence(event, new Date());
  return next ? formatDateTime(next.start.toISOString()) : '—';
}

function EventsView() {
  const { organization } = useOutletContext<OrganizationPageContext>();
  const navigate = useNavigate();
  // A global admin may create anywhere; anyone else needs OrganizationAdmin here.
  const { allowed: canCreateHere } = useCanManageEvents(organization.id);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!organization.id) return;
    setLoading(true);
    setError(null);
    try {
      // includeEnded=false: this tab is the organization's *active* events.
      const response = await fetchEvents(1, PAGE_SIZE, organization.id, false);
      setEvents(response.items ?? []);
    } catch (err) {
      console.error('Failed to load organization events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [organization.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  if (loading) {
    return (
      <div className="empty-state-large">
        <div className="spinner" />
        <p>Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state-large">
        <h3>Could not load events</h3>
        <p>{error}</p>
        <button className="secondary-btn" onClick={loadEvents}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="org-events-view">
      {canCreateHere && (
        <button
          className="fab"
          onClick={() => navigate(`/events/new?organizationId=${organization.id}`)}
          title="New Event"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      )}
      <div className="org-view-header">
        <div>
          <h3 className="org-view-title">Active Events</h3>
          <p className="org-view-subtitle">
            {events.length === 0
              ? 'No active events for this organization'
              : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faCalendarDays} size="3x" style={{ opacity: 0.3 }} />
          <h3>No active events</h3>
          <p>Events with an upcoming schedule will appear here</p>
        </div>
      ) : (
        <div className="org-event-list">
          {events.map((event) => (
            <Link key={event.id} className="org-event-row" to={`/events/${event.id}`}>
              <div className="org-event-main">
                <span className="org-event-name">{event.name || 'Untitled event'}</span>
                <span className="org-event-schedule">{describeSchedule(event)}</span>
                {event.location && <span className="org-event-location">{event.location}</span>}
              </div>

              <div className="org-event-meta">
                <span className="org-event-next" title="Next occurrence">
                  Next: {nextOccurrenceLabel(event)}
                </span>
                <span className="org-event-count" title="Athletes on the roster">
                  <FontAwesomeIcon icon={faUsers} />
                  {(event.athletes ?? []).length}
                </span>
                {(event.tags ?? []).length > 0 && (
                  <span className="org-event-tags">
                    {(event.tags ?? []).map((tag) => (
                      <span key={tag.id} className="org-event-tag" style={tag.colorHex ? { borderColor: tag.colorHex } : undefined}>
                        {tag.name}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default EventsView;
