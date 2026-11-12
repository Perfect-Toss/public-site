import './EventCard.css';

import { faBuilding, faClock, faLocationDot, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IEventOccurrence } from '../../utils/events';
import { Tag } from './Tag';
import { UserInfo } from './UserInfo';
import { formatTimeRange } from '../../utils/events';
import { getDisplayName } from '../../utils/user';

export interface EventCardProps {
  occurrence: IEventOccurrence;
  /** "Today", "Tomorrow", "Mon, Nov 17". */
  dayLabel: string;
}

/** One upcoming occurrence as a card, opening its event. */
export function EventCard({ occurrence, dayLabel }: EventCardProps) {
  const navigate = useNavigate();
  const { event, start, end } = occurrence;
  const organizers = event.organizers ?? [];
  const firstTag = event.tags?.[0] ?? null;
  const athleteCount = event.athletes?.length ?? 0;
  const hasMeta = Boolean(event.organization?.name || event.location);

  const openEvent = useCallback(() => navigate(`/events/${event.id}`), [navigate, event.id]);

  return (
    <div
      className="event-card"
      role="button"
      tabIndex={0}
      aria-label={`Open event ${event.name || 'Untitled event'}`}
      onClick={openEvent}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEvent();
        }
      }}
    >
      <span className="event-card-head">
        <span className="event-card-when">
          <span className="event-card-day">{dayLabel}</span>
          <span className="event-card-time">
            <FontAwesomeIcon icon={faClock} />
            {formatTimeRange(start, end)}
          </span>
        </span>

        {firstTag && <Tag name={firstTag.name} colorHex={firstTag.colorHex} size="sm" />}
      </span>

      <span className="event-card-name">{event.name || 'Untitled event'}</span>

      {hasMeta && (
        <span className="event-card-meta">
          {event.organization?.name && (
            <span className="event-card-meta-line">
              <FontAwesomeIcon icon={faBuilding} />
              {event.organization.name}
            </span>
          )}
          {event.location && (
            <span className="event-card-meta-line">
              <FontAwesomeIcon icon={faLocationDot} />
              {event.location}
            </span>
          )}
        </span>
      )}

      {(organizers.length > 0 || athleteCount > 0) && (
        <span className="event-card-foot">
          {organizers.length > 0 && (
            <span className="event-card-organizers">
              {organizers.map((organizer) => (
                <span
                  key={organizer.id ?? getDisplayName(organizer)}
                  className="event-card-organizer"
                >
                  <UserInfo user={organizer} size={18} />
                  <sup className="event-card-pro">PRO</sup>
                </span>
              ))}
            </span>
          )}

          {athleteCount > 0 && (
            <span className="event-card-athletes">
              <FontAwesomeIcon icon={faUserGroup} />
              {athleteCount} {athleteCount === 1 ? 'athlete' : 'athletes'}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
