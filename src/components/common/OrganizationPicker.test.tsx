import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import type { Entity } from '../../api/api.entities';
import { OrganizationPicker } from './OrganizationPicker';

// jsdom has no viewport, so the virtualized list would render no rows at all.
// Render every row instead — virtualizing is not what these tests are about.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 40,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 40 })),
    measureElement: () => undefined,
    scrollToIndex: () => undefined,
  }),
}));

function org(id: string, name: string, parentEntityId?: string, entityType?: string): Entity {
  return { id, name, parentEntityId, entityType };
}

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

/** Two roots, one of them a three-level branch, listed out of order. */
const organizations: Entity[] = [
  org('team-b', 'Team B', 'div-1'),
  org('league', 'League'),
  org('div-1', 'Division', 'league', 'Division'),
  org('team-a', 'Team A', 'div-1'),
  org('club', 'Club'),
];

function renderPicker(props: Partial<Parameters<typeof OrganizationPicker>[0]> = {}) {
  const onChange = vi.fn();
  const view = render(
    <OrganizationPicker organizations={organizations} value="" onChange={onChange} {...props} />,
  );
  /** The trigger's accessible name is the selection, so find it by class. */
  const trigger = () => view.container.querySelector('.vs-trigger') as HTMLElement;
  fireEvent.click(trigger());
  return { ...view, onChange, trigger };
}

/** Visible options as `depth:name`, using one space per indent rail. */
const visibleRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.op-row')).map((row) => {
    const name = row.querySelector('.op-name')?.textContent ?? '';
    return `${'  '.repeat(row.querySelectorAll('.op-indent').length)}${name}`;
  });

const search = (view: ReturnType<typeof renderPicker>, text: string) =>
  fireEvent.change(view.getByRole('combobox'), { target: { value: text } });

/** The rendered option whose text contains `text`. */
const optionWith = (base: HTMLElement, text: string) => {
  const option = Array.from(base.querySelectorAll('.vs-option')).find((el) =>
    el.textContent?.includes(text),
  );
  if (!option) throw new Error(`No option matching "${text}"`);
  return option;
};

describe('OrganizationPicker', () => {
  it('lists organizations alphabetically while keeping parents above their children', () => {
    const view = renderPicker();

    expect(visibleRows(view.baseElement)).toEqual([
      'Club',
      'League',
      '  Division',
      '    Team A',
      '    Team B',
    ]);
  });

  it('shows the ancestor path of the selection in the trigger', () => {
    const view = renderPicker({ value: 'team-a' });

    expect(view.getByRole('button', { name: 'League / Division / Team A' })).toBeDefined();
  });

  it('filters as the user types, keeping the hierarchy of every match', () => {
    const view = renderPicker();

    search(view, 'team');

    expect(visibleRows(view.baseElement)).toEqual([
      'League',
      '  Division',
      '    Team A',
      '    Team B',
    ]);
    // Rows kept only to place a match in the hierarchy are dimmed.
    const contextRows = view.baseElement.querySelectorAll('.op-row-context .op-name');
    expect(Array.from(contextRows).map((el) => el.textContent)).toEqual(['League', 'Division']);
  });

  it('reports when a search matches nothing', () => {
    const view = renderPicker();

    search(view, 'netball');

    expect(view.getByText('No organizations match your search')).toBeDefined();
  });

  it('clears the search again when the panel is reopened', () => {
    const view = renderPicker();
    search(view, 'team');

    fireEvent.click(view.trigger()); // Close.
    fireEvent.click(view.trigger()); // Reopen.

    expect(visibleRows(view.baseElement)).toHaveLength(5);
  });

  it('offers a none row that clears the selection', () => {
    const view = renderPicker({ allowNone: true, value: 'club' });

    fireEvent.click(optionWith(view.baseElement, 'None (root level)'));

    expect(view.onChange).toHaveBeenCalledWith('');
  });

  it('selects the clicked organization', () => {
    const view = renderPicker();

    fireEvent.click(optionWith(view.baseElement, 'Team B'));

    expect(view.onChange).toHaveBeenCalledWith('team-b');
    expect(view.baseElement.querySelector('.vs-panel')).toBeNull();
  });

  it('hides a collapsed branch until its chevron is clicked again', () => {
    const view = renderPicker();
    const [collapseLeague] = view.getAllByRole('button', { name: 'Collapse' });

    fireEvent.click(collapseLeague);

    expect(visibleRows(view.baseElement)).toEqual(['Club', 'League']);

    fireEvent.click(view.getByRole('button', { name: 'Expand' }));

    expect(visibleRows(view.baseElement)).toEqual([
      'Club',
      'League',
      '  Division',
      '    Team A',
      '    Team B',
    ]);
  });

  it('omits an excluded organization together with its descendants', () => {
    const view = renderPicker({ excludeIds: ['div-1'] });

    expect(visibleRows(view.baseElement)).toEqual(['Club', 'League']);
  });
});
