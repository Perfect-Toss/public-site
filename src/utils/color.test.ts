import { describe, expect, it } from 'vitest';

import { tintColor } from './color';

describe('tintColor', () => {
  it('returns an opaque pale version of the colour', () => {
    expect(tintColor('#000000', 0.1)).toBe('#e6e6e6');
    expect(tintColor('#E05353', 0.12)).toBe('#fbeaea');
  });

  it('returns the colour itself at full strength', () => {
    expect(tintColor('#E05353', 1)).toBe('#e05353');
  });

  it('falls back to white for a missing colour', () => {
    expect(tintColor(null, 0.12)).toBe('#ffffff');
    expect(tintColor('nope', 0.12)).toBe('#ffffff');
  });
});
