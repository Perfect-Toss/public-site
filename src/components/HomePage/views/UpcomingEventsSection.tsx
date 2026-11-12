import './UpcomingEventsSection.css';

import { Link } from 'react-router-dom';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useState } from 'react';

import { CACHE_KEYS, readCache, writeCache } from '../../../utils/pageCache';
import {
  addDays,
  daysBetween,
  expandEventsInRange,
  formatTimeRange,
  isEventParticipant,
  isSameDay,
  startOfDay,
  type IEventOccurrence,
} from '../../../utils/events';
import { fetchAllEvents, type Event } from '../../../api/api.events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../../contexts/useAuth';
import { useViewAsTarget } from '../../../stores/viewAsStore';

/** How far ahead the section looks, in days. */
const UPCOMING_DAYS = 14;

/** One day's worth of upcoming occurrences. */
interface IDayGroup {
  day: Date;
  label: string;
  occurrences: IEventOccurrence[];
}

/** "Today", "Tomorrow", then "Mon, Nov 17". */
function dayLabel(day: Date, today: Date): string {
  const offset = daysBetween(today, day);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * The current user's own events over the next two weeks.
 *
 * "Own" means the account is on the event's athlete or organizer roster; a user
 * who is on neither roster of any event gets no section at all, and so does one
 * with nothing scheduled inside the window.
 */
function UpcomingEventsSection() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id;
  const viewAsUserId = useViewAsTarget()?.id;

  // The calendar keeps the same snapshot, so visiting either page first spares
  // the other a cold load.
  const [events, setEvents] = useState<Event[]>(() => readCache<Event[]>(CACHE_KEYS.EVENTS) ?? []);

  useEffect(() => {
    let cancelled = false;
    fetchAllEvents(viewAsUserId)
      .then((fresh) => {
        if (cancelled) return;
        writeCache(CACHE_KEYS.EVENTS, fresh);
        setEvents(fresh);
      })
      .catch((error) => {
        // The calendar page owns the failure state; here the section stays empty.
        console.error('Failed to load upcoming events:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [viewAsUserId]);

  const days = useMemo<IDayGroup[]>(() => {
    if (!userId) return [];

    const from = new Date();
    const mine = events.filter((event) => isEventParticipant(event, userId));
    const occurrences = expandEventsInRange(mine, { start: from, end: addDays(from, UPCOMING_DAYS) });
    const today = startOfDay(from);

    // Occurrences arrive sorted, so a day's events are always consecutive.
    const groups: IDayGroup[] = [];
    for (const occurrence of occurrences) {
      const day = startOfDay(occurrence.start);
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.day, day)) last.occurrences.push(occurrence);
      else groups.push({ day, label: dayLabel(day, today), occurrences: [occurrence] });
    }
    return groups;
  }, [events, userId]);

  if (days.length === 0) return null;

  return (
    <section className="section">
      <div className="section-header">
        <h2>Upcoming Events</h2>
        <Link className="view-all-btn upcoming-events-link" to="/events">
          VIEW ALL
        </Link>
      </div>

      <div className="upcoming-events">
        {days.map(({ day, label, occurrences }) => (
          <div key={day.toISOString()} className="upcoming-day">
            <h3 className="upcoming-day-label">{label}</h3>

            <div className="upcoming-day-events">
              {occurrences.map((occurrence) => (
                <Link
                  key={occurrence.id}
                  to={`/events/${occurrence.event.id}`}
                  className="upcoming-event"
                >
                  <span className="upcoming-event-time">
                    {formatTimeRange(occurrence.start, occurrence.end)}
                  </span>

                  <span className="upcoming-event-main">
                    <span className="upcoming-event-name">
                      {occurrence.event.name || 'Untitled event'}
                    </span>
                    {occurrence.event.location && (
                      <span className="upcoming-event-location">
                        <FontAwesomeIcon icon={faLocationDot} />
                        {occurrence.event.location}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default UpcomingEventsSection;
