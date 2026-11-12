import { Tag, TagList } from './Tag';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import type { Tag as ApiTag } from '../../api/api.tags';

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

const tags: ApiTag[] = [
  { id: 't1', name: 'Forehand', colorHex: '#0000ff' },
  { id: 't2', name: 'Footwork', colorHex: '#f0f0f0' },
  { id: 't3', name: 'Tactics' },
  { id: 't4', name: 'Fitness', colorHex: '#ff0000' },
];

const chipOf = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('.tag-chip')).find(
    (el) => el.textContent === label,
  )!;

describe('Tag', () => {
  it('draws the pill in the tag colour, dot included', () => {
    const view = render(<Tag name="Forehand" colorHex="#0000ff" />);
    const chip = chipOf(view.container, 'Forehand');

    expect(chip.style.borderColor).toBe('rgb(0, 0, 255)');
    expect(chip.style.color).toBe('rgb(0, 0, 255)');
    expect(chip.querySelector<HTMLElement>('.tag-chip-dot')?.style.background).toBe(
      'rgb(0, 0, 255)',
    );
  });

  it('deepens a pale tag for the border and label but keeps the dot true', () => {
    const view = render(<Tag name="Footwork" colorHex="#f0f0f0" />);
    const chip = chipOf(view.container, 'Footwork');

    expect(chip.style.color).toBe('rgb(77, 77, 77)');
    expect(chip.style.borderColor).toBe('rgb(77, 77, 77)');
    expect(chip.querySelector<HTMLElement>('.tag-chip-dot')?.style.background).toBe(
      'rgb(240, 240, 240)',
    );
  });

  it('derives a colour from the name when the tag has none', () => {
    const view = render(<Tag name="Tactics" />);
    const chip = chipOf(view.container, 'Tactics');
    const dot = chip.querySelector<HTMLElement>('.tag-chip-dot')!;

    expect(dot.style.background).not.toBe('');
    expect(chip.style.color).not.toBe('');
  });

  it('labels an unnamed tag and shows the name on hover', () => {
    const view = render(<Tag name={null} />);
    const chip = chipOf(view.container, 'Untitled');

    expect(chip.getAttribute('title')).toBe('Untitled');
  });

  it('carries the size in a class so the pill can shrink on cards', () => {
    const view = render(<Tag name="Tactics" size="sm" />);

    expect(chipOf(view.container, 'Tactics').classList.contains('tag-chip--sm')).toBe(true);
  });
});

describe('TagList', () => {
  it('renders one pill per tag', () => {
    const view = render(<TagList tags={tags} />);

    expect(view.container.querySelectorAll('.tag-chip')).toHaveLength(4);
    expect(view.getByText('Fitness')).toBeDefined();
  });

  it('folds the tags past `max` into a counter', () => {
    const view = render(<TagList tags={tags} max={3} />);

    expect(view.container.querySelectorAll('.tag-chip')).toHaveLength(4);
    expect(view.getByText('+1')).toBeDefined();
    expect(view.queryByText('Fitness')).toBeNull();
  });

  it('keeps the display order it was given', () => {
    const view = render(<TagList tags={tags} />);
    const labels = Array.from(view.container.querySelectorAll('.tag-chip-label')).map(
      (el) => el.textContent,
    );

    expect(labels).toEqual(['Forehand', 'Footwork', 'Tactics', 'Fitness']);
  });

  it('renders nothing for an empty or missing list', () => {
    expect(render(<TagList tags={[]} />).container.innerHTML).toBe('');
    expect(render(<TagList tags={null} />).container.innerHTML).toBe('');
  });

  it('passes the size down to every pill and the counter', () => {
    const view = render(<TagList tags={tags} max={1} size="sm" />);

    expect(view.container.querySelectorAll('.tag-chip--sm')).toHaveLength(2);
  });
});
