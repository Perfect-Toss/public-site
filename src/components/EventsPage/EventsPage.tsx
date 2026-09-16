import '../../styles/page.css';
import './EventsPage.css';

import {
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faCircleNotch,
  faLocationDot,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Event, EventIEnumerablePagedResponse } from '../../api/api.events';
import {
  addDays,
  expandEventsInRange,
  formatTimeRange,
  formatWeekLabel,
  getWeekDays,
  getWeekRange,
  isSameDay,
  startOfDay,
  type IEventOccurrence,
} from '../../utils/events';
import { fetchEvents } from '../../api/api.events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';

/** Events are fetched a page at a time; a week view wants them all. */
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Loads every event the current user can access, including ended schedules. */
async function fetchAllEvents(): Promise<Event[]> {
  const all: Event[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response: EventIEnumerablePagedResponse = await fetchEvents(
      page,
      PAGE_SIZE,
      undefined,
      true,
    );
    const items = response.items ?? [];
    all.push(...items);
    const total = response.totalCount ?? all.length;
    if (items.length === 0 || all.length >= total) break;
  }
  return all;
}

function OccurrenceCard({ occurrence }: { occurrence: IEventOccurrence }) {
  const { event, start, end } = occurrence;
  const organizationName = event.organization?.name ?? '';

  return (
    <article className="event-chip" title={`${event.name ?? 'Untitled event'} — ${formatTimeRange(start, end)}`}>
      <span className="event-chip-time">{formatTimeRange(start, end)}</span>
      <span className="event-chip-name">{event.name || 'Untitled event'}</span>
      {organizationName && <span className="event-chip-org">{organizationName}</span>}
      {event.location && (
        <span className="event-chip-location">
          <FontAwesomeIcon icon={faLocationDot} />
          {event.location}
        </span>
      )}
    </article>
  );
}

function EventsPage() {
  const navigate = useNavigate();
  const { canCreateEvents } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchAllEvents());
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const today = useMemo(() => startOfDay(new Date()), []);

  // Expand the schedules into the occurrences that fall inside the visible week.
  const occurrences = useMemo(
    () => expandEventsInRange(events, getWeekRange(weekStart)),
    [events, weekStart],
  );

  const occurrenceCount = occurrences.length;
  const goToPreviousWeek = () => setWeekStart((week) => addDays(week, -7));
  const goToNextWeek = () => setWeekStart((week) => addDays(week, 7));
  const goToToday = () => setWeekStart(startOfDay(new Date()));

  return (
    <div className="events-page">
      <section className="section">
        <div className="section-header">
          <h2>Events</h2>
        </div>

        {canCreateEvents && (
          <button className="fab" onClick={() => navigate('/events/new')} title="New Event">
            <FontAwesomeIcon icon={faPlus} />
          </button>
        )}

        <div className="calendar-toolbar">
          <div className="calendar-nav">
            <button
              className="icon-only-btn secondary-btn"
              onClick={goToPreviousWeek}
              aria-label="Previous week"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button className="secondary-btn" onClick={goToToday}>
              Today
            </button>
            <button
              className="icon-only-btn secondary-btn"
              onClick={goToNextWeek}
              aria-label="Next week"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
          <div className="calendar-title">
            <FontAwesomeIcon icon={faCalendarDays} />
            <span>{formatWeekLabel(weekStart)}</span>
          </div>
          <div className="calendar-summary">
            {loading
              ? 'Loading…'
              : `${occurrenceCount} ${occurrenceCount === 1 ? 'event' : 'events'} this week`}
          </div>
        </div>

        {error ? (
          <div className="error-container">
            <p>{error}</p>
            <button className="retry-button" onClick={loadEvents}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading events...</p>
          </div>
        ) : (
          <div className="calendar-week">
            {weekDays.map((day) => {
              const dayOccurrences = occurrences.filter((occurrence) => isSameDay(occurrence.start, day));
              const isToday = isSameDay(day, today);

              return (
                <div key={day.toISOString()} className={`calendar-day${isToday ? ' today' : ''}`}>
                  <div className="calendar-day-header">
                    <span className="calendar-day-name">{DAY_LABELS[day.getDay()]}</span>
                    <span className="calendar-day-number">{day.getDate()}</span>
                  </div>

                  <div className="calendar-day-body">
                    {dayOccurrences.length === 0 ? (
                      <span className="calendar-day-empty">—</span>
                    ) : (
                      dayOccurrences.map((occurrence) => (
                        <OccurrenceCard key={occurrence.id} occurrence={occurrence} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && occurrenceCount === 0 && events.length === 0 && (
          <div className="empty-state-large">
            <FontAwesomeIcon icon={faCalendarDays} size="3x" style={{ opacity: 0.3 }} />
            <h3>No events yet</h3>
            <p>Events you can access will appear on this calendar</p>
          </div>
        )}

        {!loading && !error && occurrenceCount === 0 && events.length > 0 && (
          <div className="empty-state-large">
            <FontAwesomeIcon icon={faCircleNotch} size="3x" style={{ opacity: 0.3 }} />
            <h3>Nothing scheduled this week</h3>
            <p>Use the arrows above to look at another week</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default EventsPage;
