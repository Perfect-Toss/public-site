/**
 * Event schedule helpers.
 *
 * The API stores an event's recurrence as an `EventSchedule` (type, start/end
 * date, interval, occurrence count, days of week) and leaves expansion to the
 * client — the calendar expands a schedule into the occurrences that fall in
 * the visible range, and a session that actually happened is recorded as an
 * `EventInstance` (server-minted id, plus the `clientSessionId` the recording
 * device generated so an offline client can push it up later).
 *
 * Everything here is pure and timezone-local: dates are built in the browser's
 * timezone so a 6:00 PM event reads as 6:00 PM to the person looking at it.
 */

import type { Event, EventInstance, EventInstanceState, EventSchedule } from '../api/api.events';

/** One dated occurrence of an event's schedule. */
export interface IEventOccurrence {
  /** Stable key for React keys: the event id plus the occurrence's start time. */
  id: string;
  event: Event;
  start: Date;
  end: Date;
}

/** A half-open-ish window used to bound expansion and to render one week. */
export interface IDateRange {
  /** Inclusive start. */
  start: Date;
  /** Exclusive end. */
  end: Date;
}

/** How a stored event instance reads at a glance. */
export type EventInstanceStatus = 'NotStarted' | 'Running' | 'Completed' | 'Cancelled' | 'Unknown';

/** Occurrences shown for a schedule with no `lengthInMinutes`. */
const DEFAULT_DURATION_MINUTES = 60;

/** Hard stop so a malformed schedule (huge interval maths) can never hang the UI. */
const MAX_CANDIDATES = 5000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Midnight local time on the given date (a new Date, never the input). */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Midnight local time on the Sunday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** `date` shifted by whole days (a new Date, never the input). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** `date` plus whole months, clamping the day-of-month (Jan 31 + 1 month = Feb 28). */
export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** `date` plus whole years, clamping Feb 29 (2024-02-29 + 1 year = 2025-02-28). */
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/** Whole days between two dates, ignoring time of day. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

/** The Sunday-to-Saturday window containing `date`. */
export function getWeekRange(date: Date): IDateRange {
  const start = startOfWeek(date);
  return { start, end: addDays(start, 7) };
}

/** The seven day-starts of the week containing `date`, oldest first. */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "Sep 14 – 20, 2026" — the label above a week view, for any day in that week. */
export function formatWeekLabel(weekStart: Date): string {
  const start = startOfWeek(weekStart);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  const startText = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  // "20, 2026" when the week stays inside one month, otherwise "Oct 4, 2026".
  const endText = sameMonth
    ? `${end.getDate()}, ${end.getFullYear()}`
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${startText} – ${endText}`;
}

/** True when both dates are the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "6:00 PM". */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "6:00 – 7:30 PM" — collapses the meridiem when both times share one. */
export function formatTimeRange(start: Date, end: Date): string {
  const startText = formatTime(start);
  const endText = formatTime(end);
  const startMeridiem = startText.split(' ')[1];
  const endMeridiem = endText.split(' ')[1];
  if (startMeridiem && startMeridiem === endMeridiem) {
    return `${startText.replace(` ${startMeridiem}`, '')} – ${endText}`;
  }
  return `${startText} – ${endText}`;
}

/** Duration of a schedule's occurrences, in milliseconds. */
function durationMs(schedule: EventSchedule): number {
  const minutes = schedule.lengthInMinutes ?? DEFAULT_DURATION_MINUTES;
  return Math.max(0, minutes) * 60 * 1000;
}

/**
 * Every start time a schedule produces, oldest first, bounded by the schedule's
 * own end date / occurrence count and by `MAX_CANDIDATES`.
 */
function candidateStartDates(schedule: EventSchedule): Date[] {
  const type = schedule.eventScheduleType ?? 'None';
  const startIso = schedule.startDate;
  if (type === 'None' || !startIso) return [];

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return [];

  const end = schedule.endDate ? new Date(schedule.endDate) : null;
  const interval = Math.max(1, Math.floor(schedule.interval ?? 1));
  const maxCount =
    schedule.occurrances && schedule.occurrances > 0
      ? Math.min(schedule.occurrances, MAX_CANDIDATES)
      : MAX_CANDIDATES;

  const dates: Date[] = [];

  /** Append a candidate, returning false once the schedule is exhausted. */
  const push = (date: Date): boolean => {
    if (end && startOfDay(date) > end) return false;
    dates.push(date);
    return dates.length < maxCount;
  };

  switch (type) {
    case 'Single': {
      push(start);
      break;
    }

    case 'Daily': {
      let cursor = new Date(start);
      while (push(cursor)) cursor = addDays(cursor, interval);
      break;
    }

    case 'Weekly': {
      const named = (schedule.daysOfWeek ?? [])
        .map((day) => WEEKDAY_INDEX[day])
        .filter((index) => index !== undefined);
      const weekdays = [...new Set(named)].sort((a, b) => a - b);
      if (weekdays.length === 0) weekdays.push(start.getDay());

      let weekStart = startOfWeek(start);
      let running = true;
      while (running) {
        for (const weekday of weekdays) {
          const date = addDays(weekStart, weekday);
          date.setHours(start.getHours(), start.getMinutes(), 0, 0);
          if (date < start) continue;
          if (!push(date)) {
            running = false;
            break;
          }
        }
        if (!running) break;
        weekStart = addDays(weekStart, interval * 7);
        // Every day of this week starts after the schedule ended.
        if (end && weekStart > end) break;
      }
      break;
    }

    case 'Monthly':
    case 'Yearly': {
      const stepMonths = type === 'Yearly' ? interval * 12 : interval;
      let index = 0;
      while (index < maxCount) {
        const date = addMonths(start, index * stepMonths);
        if (end && date > end) break;
        if (!push(date)) break;
        index += 1;
      }
      break;
    }

    default:
      break;
  }

  return dates;
}

/**
 * The occurrences of a single event that overlap `range`.
 * An occurrence is included when it starts inside the range, or when it starts
 * before the range and is still running when the range opens.
 */
export function eventOccurrencesInRange(event: Event, range: IDateRange): IEventOccurrence[] {
  const schedule = event.schedule;
  if (!schedule) return [];

  const length = durationMs(schedule);
  const occurrences: IEventOccurrence[] = [];

  for (const start of candidateStartDates(schedule)) {
    const end = new Date(start.getTime() + length);
    // Skip occurrences that finish before the range opens or start after it closes.
    if (end <= range.start || start >= range.end) continue;
    occurrences.push({
      id: `${event.id ?? 'event'}:${start.toISOString()}`,
      event,
      start,
      end,
    });
  }

  return occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Every occurrence of every event that falls in `range`, oldest first. */
export function expandEventsInRange(events: Event[], range: IDateRange): IEventOccurrence[] {
  return events
    .flatMap((event) => eventOccurrencesInRange(event, range))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** The occurrences that start on the given day. */
export function occurrencesOnDay(occurrences: IEventOccurrence[], day: Date): IEventOccurrence[] {
  return occurrences.filter((occurrence) => isSameDay(occurrence.start, day));
}

/** The next occurrence at or after `from` (searching up to two years ahead), or null. */
export function nextOccurrence(event: Event, from: Date): IEventOccurrence | null {
  const upcoming = eventOccurrencesInRange(event, {
    start: from,
    end: addYears(from, 2),
  });
  return upcoming[0] ?? null;
}

/** True when the event's schedule has no occurrence at or after `from`. */
export function hasEnded(event: Event, from: Date): boolean {
  if (!event.schedule) return true;
  return nextOccurrence(event, from) === null;
}

/** "Weekly on Mon, Wed at 6:00 PM", "One-off on Sep 14, 2026", "No schedule". */
export function describeSchedule(event: Event): string {
  const schedule = event.schedule;
  if (!schedule || !schedule.startDate || (schedule.eventScheduleType ?? 'None') === 'None') {
    return 'No schedule';
  }

  const start = new Date(schedule.startDate);
  if (Number.isNaN(start.getTime())) return 'No schedule';

  const at = ` at ${formatTime(start)}`;
  const stepped = schedule.interval !== undefined && schedule.interval > 1;

  switch (schedule.eventScheduleType) {
    case 'Single':
      return `One-off on ${start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}${at}`;
    case 'Daily':
      return `Daily${stepped ? ` (every ${schedule.interval} days)` : ''}${at}`;
    case 'Weekly': {
      const days = (schedule.daysOfWeek ?? []).map((d) => d.slice(0, 3)).join(', ');
      return `Weekly${days ? ` on ${days}` : ''}${stepped ? ` (every ${schedule.interval} weeks)` : ''}${at}`;
    }
    case 'Monthly':
      return `Monthly${stepped ? ` (every ${schedule.interval} months)` : ''}${at}`;
    case 'Yearly':
      return `Yearly${stepped ? ` (every ${schedule.interval} years)` : ''}${at}`;
    default:
      return 'No schedule';
  }
}

/** States that mean a session is still open (started, and not ended or cancelled). */
const RUNNING_STATES: EventInstanceState[] = ['RunStarted', 'RunPaused', 'RunUnPaused', 'AthleteSkipped'];

/** States that mean the session is finished. */
const COMPLETED_STATES: EventInstanceState[] = ['RunEnded', 'SessionEnded'];

/** The instant a state change is attributed to, in ms (0 when unparseable). */
function stateChangeTime(change: { occurredAt?: string; createdAt?: string }): number {
  const value = change.occurredAt ?? change.createdAt;
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

/** The most recent state change of an instance, by occurredAt then createdAt. */
function latestChange(instance: EventInstance) {
  const changes = instance.stateChanges ?? [];
  if (changes.length === 0) return null;
  return [...changes].sort((a, b) => stateChangeTime(a) - stateChangeTime(b))[changes.length - 1];
}

/** How the instance reads now, from its most recent state change. */
export function instanceStatus(instance: EventInstance): EventInstanceStatus {
  const state = latestChange(instance)?.state;
  if (!state) return 'NotStarted';
  if (state === 'Initiated') return 'NotStarted';
  if (state === 'RunCancelled') return 'Cancelled';
  if (COMPLETED_STATES.includes(state)) return 'Completed';
  if (RUNNING_STATES.includes(state)) return 'Running';
  return 'Unknown';
}

/** When the instance was opened (its `Initiated` change), or null. */
export function instanceStartedAt(instance: EventInstance): Date | null {
  const changes = instance.stateChanges ?? [];
  const initiated = changes.find((c) => c.state === 'Initiated');
  const value = initiated?.occurredAt ?? initiated?.createdAt ?? instance.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** When the instance finished, if it has. */
export function instanceEndedAt(instance: EventInstance): Date | null {
  const state = latestChange(instance)?.state;
  if (!state || !COMPLETED_STATES.includes(state)) return null;
  const time = stateChangeTime(latestChange(instance)!);
  return time ? new Date(time) : null;
}

/** Number of state changes recorded against an instance. */
export function instanceChangeCount(instance: EventInstance): number {
  return (instance.stateChanges ?? []).length;
}
