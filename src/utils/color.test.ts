import { describe, expect, it } from 'vitest';
import { inkColor, tintColor } from './color';

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

describe('inkColor', () => {
  it('leaves a colour that already reads on white alone', () => {
    expect(inkColor('#0000ff')).toBe('#0000ff');
    expect(inkColor('#3498db')).toBe('#3498db');
  });

  it('deepens a pale colour while keeping its hue', () => {
    // A pastel pink comes back as the same pink, not a grey.
    expect(inkColor('#ffd1dc')).toBe('#990025');
  });

  it('keeps a pale grey grey', () => {
    expect(inkColor('#f0f0f0')).toBe('#4d4d4d');
  });

  it('falls back to black for a missing colour', () => {
    expect(inkColor(null)).toBe('#000000');
    expect(inkColor('nope')).toBe('#000000');
  });
});
