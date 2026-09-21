import { describe, expect, it } from 'vitest';
import {
  buildCreateEventRequest,
  buildCreateEventScheduleRequest,
  buildUpdateEventRequest,
  buildUpdateEventScheduleRequest,
  toEventFormValues,
  type ICreateEventDraft,
} from './eventRequests';
import type { Event } from '../api/api.events';

/** A draft with sensible defaults; override what a test cares about. */
function draft(overrides: Partial<ICreateEventDraft> = {}): ICreateEventDraft {
  return {
    organizationId: 'org-1',
    name: 'Wednesday Practice',
    description: '',
    location: '',
    notes: '',
    secondsBetweenAthletes: '30',
    lengthOfRecordingInSeconds: '10',
    scheduleType: 'Single',
    startDate: '2026-09-16T18:00',
    endDate: '',
    interval: '1',
    occurrances: '',
    daysOfWeek: [],
    lengthInMinutes: '60',
    athleteIds: [],
    organizerIds: [],
    tagIds: [],
    ...overrides,
  };
}

describe('buildCreateEventScheduleRequest', () => {
  it('never sends a schedule id — the server mints it', () => {
    const schedule = buildCreateEventScheduleRequest(draft());
    expect('id' in schedule).toBe(false);
    expect(JSON.stringify(schedule)).not.toContain('"id"');
  });

  it('sends the start as an ISO instant and a blank end as null', () => {
    const schedule = buildCreateEventScheduleRequest(draft({ startDate: '2026-09-16T18:00' }));
    expect(schedule.startDate).toBe(new Date('2026-09-16T18:00').toISOString());
    expect(schedule.endDate).toBeNull();
  });

  it('falls back to now when no start is chosen, since startDate is required', () => {
    const before = Date.now();
    const schedule = buildCreateEventScheduleRequest(draft({ scheduleType: 'None', startDate: '' }));
    const started = new Date(schedule.startDate).getTime();
    expect(started).toBeGreaterThanOrEqual(before);
    expect(schedule.eventScheduleType).toBe('None');
  });

  it('omits interval and occurrence count for a one-off', () => {
    const schedule = buildCreateEventScheduleRequest(draft({ scheduleType: 'Single' }));
    expect(schedule.interval).toBeUndefined();
    expect(schedule.occurrances).toBeUndefined();
  });

  it('sends interval and occurrence count for a recurring schedule', () => {
    const schedule = buildCreateEventScheduleRequest(
      draft({ scheduleType: 'Daily', interval: '2', occurrances: '5' }),
    );
    expect(schedule.interval).toBe(2);
    expect(schedule.occurrances).toBe(5);
  });

  it('sends days of week only for a weekly schedule', () => {
    const weekly = buildCreateEventScheduleRequest(
      draft({ scheduleType: 'Weekly', daysOfWeek: ['Monday', 'Wednesday'] }),
    );
    expect(weekly.daysOfWeek).toEqual(['Monday', 'Wednesday']);

    const daily = buildCreateEventScheduleRequest(
      draft({ scheduleType: 'Daily', daysOfWeek: ['Monday'] }),
    );
    expect(daily.daysOfWeek).toBeUndefined();
  });
});

describe('buildCreateEventRequest', () => {
  it('always includes a schedule', () => {
    const request = buildCreateEventRequest(draft({ scheduleType: 'None' }));
    expect(request.schedule).toBeDefined();
    expect(request.schedule.eventScheduleType).toBe('None');
  });

  it('trims text and omits the blank optionals', () => {
    const request = buildCreateEventRequest(draft({ name: '  Practice  ' }));
    expect(request.name).toBe('Practice');
    expect(request.description).toBeUndefined();
    expect(request.location).toBeUndefined();
    expect(request.notes).toBeUndefined();
  });

  it('sends null rather than an empty list for an unset roster or tags', () => {
    const request = buildCreateEventRequest(draft());
    expect(request.athleteIds).toBeNull();
    expect(request.organizerIds).toBeNull();
    expect(request.tagIds).toBeNull();
  });

  it('passes the chosen roster and tags through', () => {
    const request = buildCreateEventRequest(
      draft({ athleteIds: ['a1'], organizerIds: ['o1'], tagIds: ['t1'] }),
    );
    expect(request.athleteIds).toEqual(['a1']);
    expect(request.organizerIds).toEqual(['o1']);
    expect(request.tagIds).toEqual(['t1']);
  });

  it('drops unparseable numbers instead of sending NaN', () => {
    const request = buildCreateEventRequest(
      draft({ secondsBetweenAthletes: '', lengthOfRecordingInSeconds: 'abc' }),
    );
    expect(request.secondsBetweenAthletes).toBeUndefined();
    expect(request.lengthOfRecordingInSeconds).toBeUndefined();
  });
});

/** An event as the API returns it, with its schedule and rosters. */
function storedEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    organizationId: 'org-1',
    name: 'Wednesday Practice',
    description: 'Weekly session',
    location: 'Main Hall',
    notes: 'Bring water',
    secondsBetweenAthletes: 30,
    lengthOfRecordingInSeconds: 10,
    schedule: {
      id: 'schedule-1',
      eventScheduleType: 'Weekly',
      // No timezone designator, so these parse as local time and the
      // datetime-local round trip is the same in any timezone.
      startDate: '2026-09-16T18:00:00',
      endDate: '2026-12-16T18:00:00',
      interval: 2,
      occurrances: 8,
      daysOfWeek: ['Monday', 'Wednesday'],
      lengthInMinutes: 90,
    },
    athletes: [{ id: 'a1' }, { id: undefined }],
    organizers: [{ id: 'o1' }],
    tags: [{ id: 't1', name: 'Practice' }],
    ...overrides,
  };
}

describe('toEventFormValues', () => {
  it('fills the form from the stored event', () => {
    const values = toEventFormValues(storedEvent());
    expect(values.name).toBe('Wednesday Practice');
    expect(values.organizationId).toBe('org-1');
    expect(values.secondsBetweenAthletes).toBe('30');
    expect(values.scheduleType).toBe('Weekly');
    expect(values.interval).toBe('2');
    expect(values.occurrances).toBe('8');
    expect(values.daysOfWeek).toEqual(['Monday', 'Wednesday']);
    expect(values.lengthInMinutes).toBe('90');
  });

  it('renders instants as local datetime-local values', () => {
    const values = toEventFormValues(storedEvent());
    expect(values.startDate).toBe('2026-09-16T18:00');
    expect(values.endDate).toBe('2026-12-16T18:00');
  });

  it('collects the roster and tags, dropping ids the API left out', () => {
    const values = toEventFormValues(storedEvent());
    expect(values.athleteIds).toEqual(['a1']);
    expect(values.organizerIds).toEqual(['o1']);
    expect(values.tagIds).toEqual(['t1']);
  });

  it('copes with an event that has no schedule', () => {
    const values = toEventFormValues(storedEvent({ schedule: undefined }));
    expect(values.scheduleType).toBe('Single');
    expect(values.startDate).toBe('');
    expect(values.endDate).toBe('');
  });
});

describe('buildUpdateEventRequest', () => {
  it('names the existing schedule row', () => {
    const request = buildUpdateEventRequest(draft(), 'schedule-1');
    expect(request.schedule.id).toBe('schedule-1');
  });

  it('never sends the organization — it is immutable', () => {
    const request = buildUpdateEventRequest(draft(), 'schedule-1');
    expect('organizationId' in request).toBe(false);
  });

  it('carries the editable fields and roster', () => {
    const request = buildUpdateEventRequest(
      draft({ name: ' Renamed ', location: 'Hall', athleteIds: ['a1'], tagIds: ['t1'] }),
      'schedule-1',
    );
    expect(request.name).toBe('Renamed');
    expect(request.location).toBe('Hall');
    expect(request.athleteIds).toEqual(['a1']);
    expect(request.organizerIds).toBeNull();
    expect(request.tagIds).toEqual(['t1']);
  });

  it('builds the schedule the same way a create does', () => {
    const values = draft({ scheduleType: 'Daily', interval: '3', occurrances: '4' });
    const createSchedule = buildCreateEventScheduleRequest(values);
    const updateSchedule = buildUpdateEventScheduleRequest(values, 'schedule-1');
    expect(updateSchedule).toEqual({ ...createSchedule, id: 'schedule-1' });
  });
});
