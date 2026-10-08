import { describe, expect, it } from 'vitest';

import { formatClock } from './format';

describe('formatClock', () => {
  it('formats under an hour as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(7)).toBe('0:07');
    expect(formatClock(67)).toBe('1:07');
    expect(formatClock(599.6)).toBe('10:00');
  });

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('falls back to zero for missing or negative values', () => {
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});
