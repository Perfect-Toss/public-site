import { describe, expect, it } from 'vitest';

import { formatHeight, formatUstaRating } from './profile';

describe('profile formatters', () => {
  it('formats height as feet and inches', () => {
    expect(formatHeight(72)).toBe('6′ 0″');
    expect(formatHeight(74)).toBe('6′ 2″');
    expect(formatHeight(null)).toBe('-');
    expect(formatHeight(undefined)).toBe('-');
  });

  it('formats the USTA rating to one decimal', () => {
    expect(formatUstaRating(4.5)).toBe('4.5');
    expect(formatUstaRating(4)).toBe('4.0');
    expect(formatUstaRating(undefined)).toBe('-');
  });
});
