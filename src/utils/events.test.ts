import { describe, expect, it } from 'vitest';
import {
  describeSchedule,
  expandEventsInRange,
  formatTimeRange,
  formatWeekLabel,
  getWeekDays,
  getWeekRange,
  instanceChangeCount,
  instanceStatus,
  nextOccurrence,
  occurrencesOnDay,
  startOfWeek,
} from './events';
import type { Event, EventInstance, EventSchedule } from '../api/api.events';

/** An event whose schedule is the only thing under test. */
function event(schedule: Partial<EventSchedule>, overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    name: 'Test event',
    schedule: {
      id: 's1',
      eventScheduleType: 'Single',
      startDate: '2026-09-14T18:00:00',
      lengthInMinutes: 60,
      ...schedule,
    },
    ...overrides,
  };
}

/** The local start times a schedule expands to inside the given window. */
function starts(eventDef: Event, from: string, to: string): string[] {
  return expandEventsInRange([eventDef], { start: new Date(from), end: new Date(to) }).map((o) =>
    `${o.start.getFullYear()}-${String(o.start.getMonth() + 1).padStart(2, '0')}-${String(
      o.start.getDate(),
    ).padStart(2, '0')} ${String(o.start.getHours()).padStart(2, '0')}:${String(
      o.start.getMinutes(),
    ).padStart(2, '0')}`,
  );
}

function instance(
  states: { state: EventInstance['stateChanges'] extends (infer C)[] | null | undefined ? (C extends { state?: infer S } ? S : never) : never; occurredAt: string }[],
): EventInstance {
  return {
    id: 'i1',
    eventId: 'e1',
    stateChanges: states.map((s, i) => ({ id: `c${i}`, state: s.state, occurredAt: s.occurredAt })),
  };
}

describe('week helpers', () => {
  it('anchors the week on Sunday', () => {
    expect(startOfWeek(new Date('2026-09-16T13:00:00')).getDay()).toBe(0);
  });

  it('returns seven days and a Sunday-to-Saturday range', () => {
    const days = getWeekDays(new Date('2026-09-16T13:00:00'));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(0);
    expect(days[6].getDay()).toBe(6);
    const range = getWeekRange(new Date('2026-09-16T13:00:00'));
    expect(range.start.getDate()).toBe(13);
    expect(range.end.getDate()).toBe(20);
  });

  it('labels a week, omitting a repeated month', () => {
    expect(formatWeekLabel(new Date('2026-09-13T00:00:00'))).toBe('Sep 13 – 19, 2026');
  });

  it('labels a week that straddles two months', () => {
    expect(formatWeekLabel(new Date('2026-09-30T00:00:00'))).toBe('Sep 27 – Oct 3, 2026');
  });

  it('collapses the meridiem on a same-half time range', () => {
    expect(
      formatTimeRange(new Date('2026-09-14T18:00:00'), new Date('2026-09-14T19:30:00')),
    ).toBe('6:00 – 7:30 PM');
  });
});

describe('candidate expansion', () => {
  it('expands a one-off event to a single occurrence', () => {
    expect(starts(event({ eventScheduleType: 'Single' }), '2026-09-01', '2026-10-01')).toEqual([
      '2026-09-14 18:00',
    ]);
  });

  it('expands nothing for an unscheduled event', () => {
    expect(starts(event({ eventScheduleType: 'None' }), '2026-09-01', '2026-10-01')).toEqual([]);
  });

  it('respects the daily interval', () => {
    expect(
      starts(
        event({ eventScheduleType: 'Daily', interval: 2, endDate: '2026-09-18T23:59:00' }),
        '2026-09-01',
        '2026-10-01',
      ),
    ).toEqual(['2026-09-14 18:00', '2026-09-16 18:00', '2026-09-18 18:00']);
  });

  it('expands a weekly schedule onto the chosen days', () => {
    expect(
      starts(
        event({
          eventScheduleType: 'Weekly',
          daysOfWeek: ['Monday', 'Wednesday'],
          endDate: '2026-09-23T23:59:00',
        }),
        '2026-09-01',
        '2026-10-01',
      ),
    ).toEqual(['2026-09-14 18:00', '2026-09-16 18:00', '2026-09-21 18:00', '2026-09-23 18:00']);
  });

  it('steps a weekly schedule by the interval in weeks', () => {
    expect(
      starts(
        event({
          eventScheduleType: 'Weekly',
          interval: 2,
          daysOfWeek: ['Monday'],
          endDate: '2026-10-05T23:59:00',
        }),
        '2026-09-01',
        '2026-10-31',
      ),
    ).toEqual(['2026-09-14 18:00', '2026-09-28 18:00']);
  });

  it('clamps a monthly schedule to the last day of shorter months', () => {
    expect(
      starts(
        event({
          eventScheduleType: 'Monthly',
          startDate: '2026-01-31T18:00:00',
          endDate: '2026-04-30T23:59:00',
        }),
        '2026-01-01',
        '2026-05-01',
      ),
    ).toEqual([
      '2026-01-31 18:00',
      '2026-02-28 18:00',
      '2026-03-31 18:00',
      '2026-04-30 18:00',
    ]);
  });

  it('stops after the scheduled number of occurrences', () => {
    expect(
      starts(event({ eventScheduleType: 'Daily', occurrances: 3 }), '2026-09-01', '2026-10-01'),
    ).toEqual(['2026-09-14 18:00', '2026-09-15 18:00', '2026-09-16 18:00']);
  });

  it('stops at the schedule end date', () => {
    expect(
      starts(
        event({ eventScheduleType: 'Daily', endDate: '2026-09-16T23:59:00' }),
        '2026-09-01',
        '2026-10-01',
      ),
    ).toEqual(['2026-09-14 18:00', '2026-09-15 18:00', '2026-09-16 18:00']);
  });
});

describe('range and day filtering', () => {
  it('excludes occurrences outside the range', () => {
    expect(starts(event({ eventScheduleType: 'Single' }), '2026-09-20', '2026-09-30')).toEqual([]);
  });

  it('includes an occurrence that is still running as the range opens', () => {
    const occurrences = expandEventsInRange(
      [event({ eventScheduleType: 'Single', startDate: '2026-09-14T18:00:00', lengthInMinutes: 120 })],
      { start: new Date('2026-09-14T18:30:00'), end: new Date('2026-09-14T20:00:00') },
    );
    expect(occurrences).toHaveLength(1);
  });

  it('groups occurrences by the day they start on', () => {
    const day = new Date('2026-09-14T00:00:00');
    const occurrences = expandEventsInRange(
      [event({ eventScheduleType: 'Daily', endDate: '2026-09-15T23:59:00' })],
      { start: new Date('2026-09-13T00:00:00'), end: new Date('2026-09-20T00:00:00') },
    );
    expect(occurrencesOnDay(occurrences, day)).toHaveLength(1);
  });

  it('finds the next occurrence at or after a date', () => {
    const next = nextOccurrence(
      event({ eventScheduleType: 'Weekly', daysOfWeek: ['Monday'] }),
      new Date('2026-09-16T00:00:00'),
    );
    expect(next?.start.getDate()).toBe(21);
  });
});

describe('describeSchedule', () => {
  it('describes a weekly schedule with its days', () => {
    expect(
      describeSchedule(
        event({ eventScheduleType: 'Weekly', daysOfWeek: ['Monday', 'Wednesday'] }),
      ),
    ).toBe('Weekly on Mon, Wed at 6:00 PM');
  });

  it('describes an unscheduled event', () => {
    expect(describeSchedule(event({ eventScheduleType: 'None' }))).toBe('No schedule');
  });
});

describe('instance status', () => {
  it('reports a session that has not started', () => {
    expect(instanceStatus(instance([{ state: 'Initiated', occurredAt: '2026-09-14T18:00:00' }]))).toBe(
      'NotStarted',
    );
  });

  it('reports a running session from its latest state', () => {
    expect(
      instanceStatus(
        instance([
          { state: 'Initiated', occurredAt: '2026-09-14T18:00:00' },
          { state: 'RunStarted', occurredAt: '2026-09-14T18:05:00' },
          { state: 'RunPaused', occurredAt: '2026-09-14T18:10:00' },
        ]),
      ),
    ).toBe('Running');
    expect(instanceChangeCount(instance([{ state: 'RunPaused', occurredAt: '2026-09-14T18:10:00' }]))).toBe(1);
  });

  it('reports a finished session as completed regardless of change order', () => {
    expect(
      instanceStatus(
        instance([
          { state: 'RunStarted', occurredAt: '2026-09-14T18:05:00' },
          { state: 'SessionEnded', occurredAt: '2026-09-14T19:00:00' },
          { state: 'Initiated', occurredAt: '2026-09-14T18:00:00' },
        ]),
      ),
    ).toBe('Completed');
  });

  it('reports a cancelled session', () => {
    expect(
      instanceStatus(
        instance([
          { state: 'RunStarted', occurredAt: '2026-09-14T18:05:00' },
          { state: 'RunCancelled', occurredAt: '2026-09-14T18:20:00' },
        ]),
      ),
    ).toBe('Cancelled');
  });
});
