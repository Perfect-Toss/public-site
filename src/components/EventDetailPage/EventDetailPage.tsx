import '../../styles/page.css';
import './EventDetailPage.css';

import {
  faArrowLeft,
  faBuilding,
  faCalendarDays,
  faClipboardList,
  faLocationDot,
  faPenToSquare,
  faPlay,
  faSpinner,
  faTimes,
  faTrash,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Event, EventInstance } from '../../api/api.events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { UserInfo } from '../common';
import {
  describeSchedule,
  eventOccurrencesInRange,
  formatTimeRange,
  instanceChangeCount,
  instanceEndedAt,
  instanceStartedAt,
  instanceStatus,
  type EventInstanceStatus,
} from '../../utils/events';
import { deleteEvent, fetchEventById, fetchEventInstances } from '../../api/api.events';
import { formatDateTime } from '../../utils/format';
import { useCanManageEvents } from '../../hooks/useCanManageEvents';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

/** How far ahead the "upcoming" list looks. */
const UPCOMING_DAYS = 90;
const UPCOMING_LIMIT = 5;
const INSTANCE_PAGE_SIZE = 50;

const STATUS_LABELS: Record<EventInstanceStatus, string> = {
  NotStarted: 'Not started',
  Running: 'Running',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  Unknown: 'Unknown',
};

/** A labelled row inside a detail card. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="event-detail-row">
      <span className="event-detail-label">{label}</span>
      <span className="event-detail-value">{children}</span>
    </div>
  );
}

/** One recorded session of the event. */
function SessionRow({ instance }: { instance: EventInstance }) {
  const status = instanceStatus(instance);
  const started = instanceStartedAt(instance);
  const ended = instanceEndedAt(instance);

  return (
    <div className="event-session-row">
      <div className="event-session-when">
        <span>{started ? formatDateTime(started.toISOString()) : '—'}</span>
        {ended && <span className="event-session-ended">ended {formatDateTime(ended.toISOString())}</span>}
      </div>
      <div className="event-session-meta">
        <span title="State changes recorded">{instanceChangeCount(instance)} changes</span>
        <span className={`instance-status ${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>
      </div>
    </div>
  );
}

function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [instances, setInstances] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { allowed } = useCanManageEvents(event?.organizationId);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const loaded = await fetchEventById(id);
      if (!loaded) {
        setEvent(null);
        setError('That event could not be found.');
        return;
      }
      setEvent(loaded);
      // Sessions are a secondary panel — a failure there must not blank the page.
      try {
        const page = await fetchEventInstances(id, 1, INSTANCE_PAGE_SIZE);
        setInstances(page.items ?? []);
      } catch (err) {
        console.error('Failed to load event sessions:', err);
        setInstances([]);
      }
    } catch (err) {
      console.error('Failed to load event:', err);
      setError('Failed to load the event. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const upcoming = useMemo(() => {
    if (!event) return [];
    const from = new Date();
    const until = new Date(from.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000);
    return eventOccurrencesInRange(event, { start: from, end: until }).slice(0, UPCOMING_LIMIT);
  }, [event]);

  // ── Delete ──────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent(id);
      navigate('/events');
    } catch (err) {
      console.error('Failed to delete event:', err);
      setDeleteError('Failed to delete the event. Please try again.');
      setDeleting(false);
    }
  }, [id, navigate]);

  // Escape cancels / Enter accepts on the delete confirm modal.
  useModalKeyboard({
    active: confirmOpen,
    onCancel: () => setConfirmOpen(false),
    onAccept: handleDelete,
    busy: deleting,
  });

  if (loading) {
    return (
      <div className="event-detail-page">
        <div className="empty-state-large">
          <div className="spinner" />
          <p>Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faCalendarDays} size="3x" style={{ opacity: 0.3 }} />
          <h3>Event not found</h3>
          <p>{error ?? 'The requested event could not be found.'}</p>
          <button className="secondary-btn" onClick={() => navigate('/events')}>
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const title = event.name || 'Untitled event';

  return (
    <div className="event-detail-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/events')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Events</span>
          </button>
          <h2>{title}</h2>
          <div />
        </div>

        <div className="event-detail-header">
          <div className="event-detail-title-block">
            <h3 className="event-detail-title">{title}</h3>
            <div className="event-detail-badges">
              {event.organization?.name && (
                <span className="event-detail-badge">
                  <FontAwesomeIcon icon={faBuilding} />
                  {event.organization.name}
                </span>
              )}
              {event.location && (
                <span className="event-detail-badge">
                  <FontAwesomeIcon icon={faLocationDot} />
                  {event.location}
                </span>
              )}
              {(event.tags ?? []).map((tag) => (
                <span
                  key={tag.id}
                  className="event-detail-tag"
                  style={tag.colorHex ? { borderColor: tag.colorHex } : undefined}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          <div className="event-detail-actions">
            {allowed && (
              <>
                <button
                  className="event-danger-btn"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmOpen(true);
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  Delete Event
                </button>
                <button
                  className="primary-btn"
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                  style={{ padding: '9px 18px', fontSize: 13 }}
                >
                  <FontAwesomeIcon icon={faPenToSquare} />
                  Edit Event
                </button>
              </>
            )}
          </div>
        </div>

        <div className="event-detail-grid">
          {/* ── Details ─────────────────────────────────────────── */}
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-card-title">
                <FontAwesomeIcon icon={faClipboardList} />
                Details
              </span>
            </div>
            <DetailRow label="Description">
              {event.description || <span className="empty">No description</span>}
            </DetailRow>
            <DetailRow label="Location">
              {event.location || <span className="empty">—</span>}
            </DetailRow>
            <DetailRow label="Notes">{event.notes || <span className="empty">—</span>}</DetailRow>
            <DetailRow label="Between athletes">
              {event.secondsBetweenAthletes != null ? `${event.secondsBetweenAthletes}s` : <span className="empty">—</span>}
            </DetailRow>
            <DetailRow label="Recording length">
              {event.lengthOfRecordingInSeconds != null ? `${event.lengthOfRecordingInSeconds}s` : <span className="empty">—</span>}
            </DetailRow>
            <DetailRow label="Created">{formatDateTime(event.createdAt)}</DetailRow>
          </div>

          {/* ── Schedule ────────────────────────────────────────── */}
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-card-title">
                <FontAwesomeIcon icon={faCalendarDays} />
                Schedule
              </span>
            </div>
            <DetailRow label="Repeats">{describeSchedule(event)}</DetailRow>
            <DetailRow label="Next">
              {upcoming.length > 0 ? (
                formatDateTime(upcoming[0].start.toISOString())
              ) : (
                <span className="empty">No upcoming occurrences</span>
              )}
            </DetailRow>

            <div className="event-upcoming">
              <span className="event-upcoming-title">Next {UPCOMING_LIMIT} occurrences</span>
              {upcoming.length === 0 ? (
                <p className="event-detail-muted">
                  Nothing scheduled in the next {UPCOMING_DAYS} days.
                </p>
              ) : (
                upcoming.map((occurrence) => (
                  <div key={occurrence.id} className="event-upcoming-row">
                    <span>{occurrence.start.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}</span>
                    <span className="event-detail-muted">
                      {formatTimeRange(occurrence.start, occurrence.end)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Roster ──────────────────────────────────────────── */}
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-card-title">
                <FontAwesomeIcon icon={faUsers} />
                Roster
              </span>
            </div>

            <div className="event-roster">
              <span className="event-roster-label">Athletes ({(event.athletes ?? []).length})</span>
              {(event.athletes ?? []).length === 0 ? (
                <p className="event-detail-muted">No athletes on this event.</p>
              ) : (
                (event.athletes ?? []).map((athlete, index) => (
                  <UserInfo key={athlete.id ?? `athlete-${index}`} user={athlete} size={22} />
                ))
              )}
            </div>

            <div className="event-roster">
              <span className="event-roster-label">
                Organizers ({(event.organizers ?? []).length})
              </span>
              {(event.organizers ?? []).length === 0 ? (
                <p className="event-detail-muted">No organizers on this event.</p>
              ) : (
                (event.organizers ?? []).map((organizer, index) => (
                  <UserInfo key={organizer.id ?? `organizer-${index}`} user={organizer} size={22} />
                ))
              )}
            </div>
          </div>

          {/* ── Sessions ────────────────────────────────────────── */}
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-card-title">
                <FontAwesomeIcon icon={faPlay} />
                Sessions ({instances.length})
              </span>
            </div>

            {instances.length === 0 ? (
              <p className="event-detail-muted">No sessions recorded against this event yet.</p>
            ) : (
              <div className="event-session-list">
                {instances.map((instance) => (
                  <SessionRow key={instance.id} instance={instance} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {confirmOpen && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-header">
              <h3>Delete Event</h3>
              <button
                className="close-btn"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <p className="event-delete-message">
                Are you sure you want to delete <strong>{title}</strong>? This action cannot be
                undone.
              </p>
              {instances.length > 0 && (
                <p className="event-delete-message">
                  It has {instances.length} recorded {instances.length === 1 ? 'session' : 'sessions'}.
                </p>
              )}
              {deleteError && <p className="event-delete-error">{deleteError}</p>}
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="submit-btn"
                  style={{ background: '#dc3545', color: '#fff' }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetailPage;
