import { describe, expect, it } from 'vitest';
import { sortTagsByName, tagColor } from './tags';

import type { Tag } from '../api/api.tags';
import { colorFor } from './color';

const tag = (id: string, name: string | null, colorHex?: string | null): Tag => ({
  id,
  name,
  colorHex,
});

describe('tagColor', () => {
  it('uses the tag color when it has one', () => {
    expect(tagColor(tag('t1', 'Footwork', '#ff0000'))).toBe('#ff0000');
  });

  it('derives a stable color for a tag with none', () => {
    const derived = colorFor('Footwork', { forceDark: true });

    expect(tagColor(tag('t1', 'Footwork', null))).toBe(derived);
    expect(tagColor(tag('t1', 'Footwork'))).toBe(derived);
  });

  it('derives a color for a tag with no name', () => {
    expect(tagColor(tag('t1', null))).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('sortTagsByName', () => {
  it('sorts alphabetically and leaves the input alone', () => {
    const tags = [tag('t1', 'Forehand'), tag('t2', 'Backhand'), tag('t3', 'Footwork')];

    expect(sortTagsByName(tags).map((t) => t.name)).toEqual(['Backhand', 'Footwork', 'Forehand']);
    expect(tags.map((t) => t.name)).toEqual(['Forehand', 'Backhand', 'Footwork']);
  });

  it('puts untitled tags last', () => {
    const sorted = sortTagsByName([tag('t1', null), tag('t2', 'Forehand')]);

    expect(sorted.map((t) => t.name)).toEqual(['Forehand', null]);
  });
});
