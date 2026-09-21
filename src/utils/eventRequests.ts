/**
 * Event request builders.
 *
 * The write model differs from the read model, and from itself between create
 * and update: a new event carries a `CreateEventScheduleRequest` (no id — the
 * server mints the schedule row), while an update carries an
 * `UpdateEventScheduleRequest` naming the existing schedule's id. Both are
 * required, so a payload built here always has a schedule.
 *
 * Building the payload in a pure function keeps that detail out of the form and
 * lets the exact shape be pinned by a test.
 */

import type {
  CreateEventRequest,
  CreateEventScheduleRequest,
  DayOfWeek,
  Event,
  EventScheduleType,
  UpdateEventRequest,
  UpdateEventScheduleRequest,
} from '../api/api.events';

/** The schedule fields of an event draft (every text input arrives as a string). */
export interface IEventScheduleDraft {
  scheduleType: EventScheduleType;
  /** A `datetime-local` value; empty means "not chosen". */
  startDate: string;
  endDate: string;
  interval: string;
  occurrances: string;
  daysOfWeek: DayOfWeek[];
  lengthInMinutes: string;
}

/** The fields of a new event, as the form holds them. */
export interface ICreateEventDraft extends IEventScheduleDraft {
  organizationId: string;
  name: string;
  description: string;
  location: string;
  notes: string;
  secondsBetweenAthletes: string;
  lengthOfRecordingInSeconds: string;
  athleteIds: string[];
  organizerIds: string[];
  tagIds: string[];
}

/** The values an edit form starts from: the event's fields plus its roster and tags. */
export type IEventFormValues = ICreateEventDraft;

/** Schedule types that repeat, and so carry an interval and an occurrence count. */
const RECURRING_TYPES: EventScheduleType[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

/** A text field as a number, or undefined when blank or unparseable. */
function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** A `datetime-local` value as the instant the API expects, or undefined. */
function toIso(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * The schedule of a new event. No id is sent — the server mints the schedule row.
 * `startDate` is required even for an event with no recurrence, so a blank start
 * falls back to now rather than producing a request the API will reject.
 */
export function buildCreateEventScheduleRequest(
  draft: IEventScheduleDraft,
): CreateEventScheduleRequest {
  const request: CreateEventScheduleRequest = {
    eventScheduleType: draft.scheduleType,
    startDate: toIso(draft.startDate) ?? new Date().toISOString(),
    endDate: toIso(draft.endDate) ?? null,
    lengthInMinutes: toNumber(draft.lengthInMinutes) ?? 60,
  };

  if (RECURRING_TYPES.includes(draft.scheduleType)) {
    request.interval = toNumber(draft.interval) ?? 1;
    request.occurrances = toNumber(draft.occurrances) ?? null;
  }

  if (draft.scheduleType === 'Weekly') {
    request.daysOfWeek = draft.daysOfWeek;
  }

  return request;
}

/** The request that creates an event from a filled-in form. */
export function buildCreateEventRequest(draft: ICreateEventDraft): CreateEventRequest {
  return {
    organizationId: draft.organizationId,
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    location: draft.location.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    secondsBetweenAthletes: toNumber(draft.secondsBetweenAthletes),
    lengthOfRecordingInSeconds: toNumber(draft.lengthOfRecordingInSeconds),
    schedule: buildCreateEventScheduleRequest(draft),
    athleteIds: draft.athleteIds.length ? draft.athleteIds : null,
    organizerIds: draft.organizerIds.length ? draft.organizerIds : null,
    tagIds: draft.tagIds.length ? draft.tagIds : null,
  };
}

// ============================================================================
// Editing an existing event
// ============================================================================

/** A `datetime-local` value for an instant from the API, in local time. */
function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** The values an edit form starts from, read off an existing event. */
export function toEventFormValues(event: Event): IEventFormValues {
  const schedule = event.schedule;

  return {
    organizationId: event.organizationId ?? '',
    name: event.name ?? '',
    description: event.description ?? '',
    location: event.location ?? '',
    notes: event.notes ?? '',
    secondsBetweenAthletes: event.secondsBetweenAthletes?.toString() ?? '',
    lengthOfRecordingInSeconds: event.lengthOfRecordingInSeconds?.toString() ?? '',
    scheduleType: schedule?.eventScheduleType ?? 'Single',
    startDate: toDateTimeLocal(schedule?.startDate),
    endDate: toDateTimeLocal(schedule?.endDate),
    interval: (schedule?.interval ?? 1).toString(),
    occurrances: schedule?.occurrances?.toString() ?? '',
    daysOfWeek: schedule?.daysOfWeek ?? [],
    lengthInMinutes: (schedule?.lengthInMinutes ?? 60).toString(),
    athleteIds: (event.athletes ?? [])
      .map((athlete) => athlete.id)
      .filter((id): id is string => Boolean(id)),
    organizerIds: (event.organizers ?? [])
      .map((organizer) => organizer.id)
      .filter((id): id is string => Boolean(id)),
    tagIds: (event.tags ?? []).map((tag) => tag.id),
  };
}

/**
 * The schedule an event should have after an update. Unlike a create, this names
 * the existing schedule row — `scheduleId` is the event's current
 * `schedule.id`, and the API will not accept an update without it.
 */
export function buildUpdateEventScheduleRequest(
  draft: IEventScheduleDraft,
  scheduleId: string,
): UpdateEventScheduleRequest {
  return { id: scheduleId, ...buildCreateEventScheduleRequest(draft) };
}

/**
 * The request that saves edits to an existing event. The organization is
 * immutable, so it is not part of the payload.
 */
export function buildUpdateEventRequest(
  draft: ICreateEventDraft,
  scheduleId: string,
): UpdateEventRequest {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    location: draft.location.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    secondsBetweenAthletes: toNumber(draft.secondsBetweenAthletes),
    lengthOfRecordingInSeconds: toNumber(draft.lengthOfRecordingInSeconds),
    schedule: buildUpdateEventScheduleRequest(draft, scheduleId),
    athleteIds: draft.athleteIds.length ? draft.athleteIds : null,
    organizerIds: draft.organizerIds.length ? draft.organizerIds : null,
    tagIds: draft.tagIds.length ? draft.tagIds : null,
  };
}
