import './UpcomingEventsSection.css';

import { EventCard } from '../../common';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { CACHE_KEYS, readCache, writeCache } from '../../../utils/pageCache';
import {
  addDays,
  daysBetween,
  expandEventsInRange,
  isEventParticipant,
  startOfDay,
  type IEventOccurrence,
} from '../../../utils/events';
import { fetchAllEvents, type Event } from '../../../api/api.events';
import { useAuth } from '../../../contexts/useAuth';
import { useViewAsTarget } from '../../../stores/viewAsStore';

/** How far ahead the section looks, in days. */
const UPCOMING_DAYS = 14;

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

  const upcoming = useMemo<IEventOccurrence[]>(() => {
    if (!userId) return [];

    const from = new Date();
    const mine = events.filter((event) => isEventParticipant(event, userId));
    return expandEventsInRange(mine, { start: from, end: addDays(from, UPCOMING_DAYS) });
  }, [events, userId]);

  if (upcoming.length === 0) return null;

  const today = startOfDay(new Date());

  return (
    <section className="section">
      <div className="section-header">
        <h2>Upcoming Events</h2>
        <Link className="view-all-btn upcoming-events-link" to="/events">
          VIEW ALL
        </Link>
      </div>

      <div className="upcoming-events-scroll">
        {upcoming.map((occurrence) => (
          <EventCard
            key={occurrence.id}
            occurrence={occurrence}
            dayLabel={dayLabel(startOfDay(occurrence.start), today)}
          />
        ))}
      </div>
    </section>
  );
}

export default UpcomingEventsSection;
