import '../../styles/page.css';
import './EventFormPage.css';

import {
  faArrowLeft,
  faCalendarPlus,
  faCheck,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { CreateEventRequest, DayOfWeek, EventScheduleType } from '../../api/api.events';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { StyledSelect } from '../common';
import { createEvent } from '../../api/api.events';
import { newUuid } from '../../utils/uuid';
import { useEntityStore } from '../../stores/entityStore';
import { useTagStore } from '../../stores/tagStore';

/** The schedule recurrence options the API accepts. */
const SCHEDULE_TYPES: { value: EventScheduleType; label: string }[] = [
  { value: 'None', label: 'No schedule' },
  { value: 'Single', label: 'One-off' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Yearly', label: 'Yearly' },
];

const WEEKDAYS: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** `<input type="datetime-local">` wants "YYYY-MM-DDTHH:mm" in local time. */
function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** The next round hour, used as the default start time for a new event. */
function defaultStart(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toDateTimeLocal(date);
}

interface IFormState {
  organizationId: string;
  name: string;
  description: string;
  location: string;
  notes: string;
  secondsBetweenAthletes: string;
  lengthOfRecordingInSeconds: string;
  scheduleType: EventScheduleType;
  startDate: string;
  endDate: string;
  interval: string;
  occurrances: string;
  daysOfWeek: DayOfWeek[];
  lengthInMinutes: string;
}

const EMPTY_FORM: IFormState = {
  organizationId: '',
  name: '',
  description: '',
  location: '',
  notes: '',
  secondsBetweenAthletes: '30',
  lengthOfRecordingInSeconds: '10',
  scheduleType: 'Single',
  startDate: '',
  endDate: '',
  interval: '1',
  occurrances: '',
  daysOfWeek: [],
  lengthInMinutes: '60',
};

function EventFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { entities, loadEntities, entityUsers, loadEntityUsers } = useEntityStore();
  const { tags, loadTags } = useTagStore();

  const [form, setForm] = useState<IFormState>(() => ({
    ...EMPTY_FORM,
    organizationId: searchParams.get('organizationId') ?? '',
    startDate: defaultStart(),
  }));
  const [athleteIds, setAthleteIds] = useState<string[]>([]);
  const [organizerIds, setOrganizerIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `EventSchedule.id` is a required uuid and the client mints it — the server
  // cannot supply it because the id travels up in the request. Minted once so a
  // retry of the same form sends the same schedule id.
  const [scheduleId] = useState(newUuid);

  useEffect(() => {
    loadEntities();
    loadTags();
  }, [loadEntities, loadTags]);

  // Members of the chosen organization feed the athlete/organizer pickers.
  useEffect(() => {
    if (form.organizationId) loadEntityUsers(form.organizationId);
  }, [form.organizationId, loadEntityUsers]);

  const members = useMemo(
    () => entityUsers[form.organizationId] ?? [],
    [entityUsers, form.organizationId],
  );

  const setField = <K extends keyof IFormState>(key: K, value: IFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleId = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleWeekday = (day: DayOfWeek) =>
    setForm((f) => ({ ...f, daysOfWeek: toggleId(f.daysOfWeek, day) as DayOfWeek[] }));

  const isScheduled = form.scheduleType !== 'None';
  const isValid = Boolean(form.organizationId && form.name.trim()) && (!isScheduled || Boolean(form.startDate));

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    const toNumber = (value: string) => {
      const parsed = Number(value);
      return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed;
    };

    const dto: CreateEventRequest = {
      organizationId: form.organizationId,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      secondsBetweenAthletes: toNumber(form.secondsBetweenAthletes),
      lengthOfRecordingInSeconds: toNumber(form.lengthOfRecordingInSeconds),
      schedule: isScheduled
        ? {
            id: scheduleId,
            eventScheduleType: form.scheduleType,
            startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
            endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
            interval: toNumber(form.interval) ?? 1,
            occurrances: toNumber(form.occurrances) ?? null,
            daysOfWeek: form.scheduleType === 'Weekly' ? form.daysOfWeek : null,
            lengthInMinutes: toNumber(form.lengthInMinutes) ?? 60,
          }
        : undefined,
      athleteIds: athleteIds.length ? athleteIds : null,
      organizerIds: organizerIds.length ? organizerIds : null,
      tagIds: tagIds.length ? tagIds : null,
    };

    try {
      await createEvent(dto);
      navigate('/events');
    } catch (err) {
      console.error('Failed to create event:', err);
      setError('Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, isScheduled, athleteIds, organizerIds, tagIds, isValid, navigate, scheduleId]);

  return (
    <div className="event-form-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/events')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>New Event</h2>
          <div />
        </div>

        {error && (
          <div className="import-result error" style={{ marginBottom: 20 }}>
            <FontAwesomeIcon icon={faTimes} style={{ marginRight: 8 }} />
            {error}
          </div>
        )}

        <div className="event-form">
          {/* ── Details ─────────────────────────────────────────── */}
          <fieldset className="event-form-group">
            <legend>Details</legend>

            <div className="form-group">
              <label htmlFor="event-org">Organization *</label>
              <StyledSelect
                id="event-org"
                value={form.organizationId}
                onChange={(v) => setField('organizationId', v)}
                placeholder="Select an organization"
              >
                <option value="">— Select an organization —</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                    {entity.entityType ? ` (${entity.entityType})` : ''}
                  </option>
                ))}
              </StyledSelect>
            </div>

            <div className="form-group">
              <label htmlFor="event-name">Name *</label>
              <input
                id="event-name"
                type="text"
                maxLength={100}
                placeholder="e.g. Wednesday Night Practice"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="event-description">Description</label>
              <textarea
                id="event-description"
                rows={3}
                placeholder="What the event is for..."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>

            <div className="event-form-row">
              <div className="form-group">
                <label htmlFor="event-location">Location</label>
                <input
                  id="event-location"
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Main Hall"
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="event-notes">Notes</label>
                <input
                  id="event-notes"
                  type="text"
                  placeholder="Free-form notes"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {/* ── Schedule ────────────────────────────────────────── */}
          <fieldset className="event-form-group">
            <legend>Schedule</legend>

            <div className="event-form-row">
              <div className="form-group">
                <label htmlFor="event-schedule-type">Repeats</label>
                <StyledSelect
                  id="event-schedule-type"
                  value={form.scheduleType}
                  onChange={(v) => setField('scheduleType', v as EventScheduleType)}
                >
                  {SCHEDULE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </StyledSelect>
              </div>

              <div className="form-group">
                <label htmlFor="event-schedule-length">Duration (minutes)</label>
                <input
                  id="event-schedule-length"
                  type="number"
                  min={0}
                  disabled={!isScheduled}
                  value={form.lengthInMinutes}
                  onChange={(e) => setField('lengthInMinutes', e.target.value)}
                />
              </div>
            </div>

            <div className="event-form-row">
              <div className="form-group">
                <label htmlFor="event-start">Starts {isScheduled && '*'}</label>
                <input
                  id="event-start"
                  type="datetime-local"
                  disabled={!isScheduled}
                  value={form.startDate}
                  onChange={(e) => setField('startDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="event-end">Ends (schedule end)</label>
                <input
                  id="event-end"
                  type="datetime-local"
                  disabled={!isScheduled}
                  value={form.endDate}
                  onChange={(e) => setField('endDate', e.target.value)}
                />
              </div>
            </div>

            {form.scheduleType === 'Weekly' && (
              <div className="form-group">
                <label>Days of week</label>
                <div className="weekday-picker">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`weekday-pill${form.daysOfWeek.includes(day) ? ' selected' : ''}`}
                      onClick={() => toggleWeekday(day)}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="event-form-row">
              <div className="form-group">
                <label htmlFor="event-interval">Every</label>
                <input
                  id="event-interval"
                  type="number"
                  min={1}
                  disabled={!isScheduled}
                  value={form.interval}
                  onChange={(e) => setField('interval', e.target.value)}
                />
                <span className="field-hint">
                  {form.scheduleType === 'Daily' && 'days'}
                  {form.scheduleType === 'Weekly' && 'weeks'}
                  {form.scheduleType === 'Monthly' && 'months'}
                  {form.scheduleType === 'Yearly' && 'years'}
                  {(form.scheduleType === 'Single' || form.scheduleType === 'None') && '—'}
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="event-occurrances">Number of occurrences</label>
                <input
                  id="event-occurrances"
                  type="number"
                  min={1}
                  placeholder="Until the end date"
                  disabled={!isScheduled}
                  value={form.occurrances}
                  onChange={(e) => setField('occurrances', e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {/* ── Session defaults ────────────────────────────────── */}
          <fieldset className="event-form-group">
            <legend>Session defaults</legend>

            <div className="event-form-row">
              <div className="form-group">
                <label htmlFor="event-gap">Seconds between athletes</label>
                <input
                  id="event-gap"
                  type="number"
                  min={0}
                  value={form.secondsBetweenAthletes}
                  onChange={(e) => setField('secondsBetweenAthletes', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="event-recording">Recording length (seconds)</label>
                <input
                  id="event-recording"
                  type="number"
                  min={0}
                  value={form.lengthOfRecordingInSeconds}
                  onChange={(e) => setField('lengthOfRecordingInSeconds', e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {/* ── Roster & tags ───────────────────────────────────── */}
          <fieldset className="event-form-group">
            <legend>Roster &amp; tags</legend>

            <div className="form-group">
              <label>Athletes</label>
              {!form.organizationId ? (
                <p className="field-hint">Pick an organization to choose its members.</p>
              ) : members.length === 0 ? (
                <p className="field-hint">No members found for this organization.</p>
              ) : (
                <div className="member-picker">
                  {members.map((member) => (
                    <label key={member.id} className="member-option">
                      <input
                        type="checkbox"
                        checked={athleteIds.includes(member.id)}
                        onChange={() => setAthleteIds((ids) => toggleId(ids, member.id))}
                      />
                      <span>
                        {[member.firstName, member.lastName].filter(Boolean).join(' ') ||
                          member.email ||
                          member.id}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Organizers</label>
              {members.length === 0 ? (
                <p className="field-hint">
                  {form.organizationId
                    ? 'No members found for this organization.'
                    : 'Pick an organization to choose its members.'}
                </p>
              ) : (
                <div className="member-picker">
                  {members.map((member) => (
                    <label key={member.id} className="member-option">
                      <input
                        type="checkbox"
                        checked={organizerIds.includes(member.id)}
                        onChange={() => setOrganizerIds((ids) => toggleId(ids, member.id))}
                      />
                      <span>
                        {[member.firstName, member.lastName].filter(Boolean).join(' ') ||
                          member.email ||
                          member.id}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Tags</label>
              {tags.length === 0 ? (
                <p className="field-hint">No tags available.</p>
              ) : (
                <div className="member-picker">
                  {tags.map((tag) => (
                    <label key={tag.id} className="member-option">
                      <input
                        type="checkbox"
                        checked={tagIds.includes(tag.id)}
                        onChange={() => setTagIds((ids) => toggleId(ids, tag.id))}
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </fieldset>

          <div className="form-actions">
            <button className="cancel-btn" onClick={() => navigate('/events')} disabled={submitting}>
              Cancel
            </button>
            <button className="submit-btn" disabled={!isValid || submitting} onClick={handleSubmit}>
              {submitting ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faCalendarPlus} style={{ marginRight: 6 }} />
              )}
              Create Event
            </button>
          </div>

          <p className="field-hint">
            <FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />
            Sessions are recorded against the event once it exists — this page only creates the
            event definition and its schedule.
          </p>
        </div>
      </section>
    </div>
  );
}

export default EventFormPage;
