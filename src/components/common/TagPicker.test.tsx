import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import type { Tag } from '../../api/api.tags';
import { TagPicker } from './TagPicker';

/** Deliberately out of order, so the badges prove they get sorted. */
const tags: Tag[] = [
  { id: 't2', name: 'Footwork', colorHex: '#ff0000' },
  { id: 't1', name: 'Forehand', colorHex: '#ffffff' },
];

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

function renderPicker(props: Partial<Parameters<typeof TagPicker>[0]> = {}) {
  const onChange = vi.fn();
  const view = render(<TagPicker tags={tags} values={[]} onChange={onChange} {...props} />);
  const badges = () =>
    Array.from(view.container.querySelectorAll<HTMLButtonElement>('.tp-badge'));
  const badge = (name: string) => badges().find((el) => el.textContent?.includes(name))!;

  return { ...view, onChange, badges, badge };
}

describe('TagPicker', () => {
  it('lists every tag as a badge, sorted by name', () => {
    const view = renderPicker();

    expect(view.badges().map((el) => el.textContent)).toEqual(['Footwork', 'Forehand']);
  });

  it('outlines a picked badge in its tag color', () => {
    const view = renderPicker({ values: ['t1', 't2'] });

    expect(view.badge('Footwork').style.borderColor).toBe('rgb(255, 0, 0)');
    expect(view.badge('Forehand').style.borderColor).toBe('rgb(255, 255, 255)');
  });

  it('bolds a picked badge and colors its dot', () => {
    const view = renderPicker({ values: ['t2'] });
    const chip = view.badge('Footwork');

    expect(chip.classList.contains('tp-badge-picked')).toBe(true);
    expect(chip.querySelector<HTMLElement>('.tp-badge-dot')?.style.background).toBe(
      'rgb(255, 0, 0)',
    );
  });

  it('leaves an unpicked badge grey', () => {
    const view = renderPicker();
    const chip = view.badge('Footwork');

    expect(chip.classList.contains('tp-badge-unpicked')).toBe(true);
    expect(chip.style.borderColor).toBe('');
    // The grey dot comes from the stylesheet, so there is no inline color here.
    expect(chip.querySelector<HTMLElement>('.tp-badge-dot')?.style.background).toBe('');
  });

  it('marks the picked tags as pressed', () => {
    const view = renderPicker({ values: ['t2'] });

    expect(view.badge('Footwork').getAttribute('aria-pressed')).toBe('true');
    expect(view.badge('Forehand').getAttribute('aria-pressed')).toBe('false');
  });

  it('adds a tag to the end of the selection when it is clicked', () => {
    const view = renderPicker({ values: ['t1'] });

    fireEvent.click(view.badge('Footwork'));

    expect(view.onChange).toHaveBeenCalledWith(['t1', 't2']);
  });

  it('removes a tag from the selection when it is clicked again', () => {
    const view = renderPicker({ values: ['t1', 't2'] });

    fireEvent.click(view.badge('Forehand'));

    expect(view.onChange).toHaveBeenCalledWith(['t2']);
  });

  it('names the badge group after the field label', () => {
    const view = renderPicker({ label: 'Tags' });

    expect(view.getByRole('group', { name: 'Tags' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Footwork' })).toBeTruthy();
  });

  it('shows the empty message when there are no tags', () => {
    const view = renderPicker({ tags: [], emptyMessage: 'No tags yet.' });

    expect(view.container.querySelectorAll('.tp-badge')).toHaveLength(0);
    expect(view.getByText('No tags yet.')).toBeTruthy();
  });
});
