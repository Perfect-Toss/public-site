import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { Role } from '../../api/api.users';
import type { User } from '../../api/api.users';
import { UserPicker } from './UserPicker';

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

const MINUTE_MS = 60 * 1000;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE_MS).toISOString();
const LONG_AGO = '2019-01-01T00:00:00.000Z';

function makeUser(id: string, fields: Partial<User> = {}): User {
  return { ...fields, id, email: fields.email ?? null };
}

/** Alphabetical by name: Ada, Alan, Court 1, Court 9, Grace. */
const users: User[] = [
  makeUser('grace', {
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@example.com',
    roles: ['Athlete'],
    createdAt: minutesAgo(20),
  }),
  makeUser('ada', {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    roles: ['Coach', 'OrganizationAdmin'],
    createdAt: LONG_AGO,
    lastModifiedAt: LONG_AGO,
  }),
  makeUser('court-1', {
    firstName: 'Court 1',
    email: 'court1@devices.example.com',
    roles: ['ServiceAccount'],
    createdAt: minutesAgo(5),
  }),
  makeUser('court-9', {
    firstName: 'Court 9',
    email: 'court9@devices.example.com',
    roles: ['ServiceAccount'],
    createdAt: LONG_AGO,
    lastModifiedAt: LONG_AGO,
  }),
  makeUser('alan', {
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan@example.com',
    createdAt: minutesAgo(45),
  }),
];

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

type PickerProps = Partial<Parameters<typeof UserPicker>[0]>;

function renderPicker(props: PickerProps = {}) {
  const onChange = vi.fn();
  const view = render(
    <UserPicker users={users} values={[]} onChange={onChange} {...props} />,
  );

  /** The trigger's accessible name is the selection, so find it by class. */
  const trigger = () => view.container.querySelector('.vs-trigger') as HTMLElement;
  const open = () => fireEvent.click(trigger());
  return { ...view, onChange, open, trigger };
}

/** Visible rows as `name <email>`. */
const visibleRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.up-row')).map(
    (row) =>
      `${row.querySelector('.up-name')?.textContent ?? ''} <${
        row.querySelector('.up-email')?.textContent ?? ''
      }>`,
  );

/** Trigger pills, with the overflow counter as its own entry. */
const triggerPills = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.up-pill')).map(
    (pill) => pill.querySelector('.up-pill-label')?.textContent ?? pill.textContent ?? '',
  );

const search = (view: ReturnType<typeof renderPicker>, text: string) =>
  fireEvent.change(view.getByRole('combobox'), { target: { value: text } });

/** The rendered option row whose text contains `text`. */
const optionWith = (base: HTMLElement, text: string) => {
  const option = Array.from(base.querySelectorAll('.vs-option')).find((el) =>
    el.textContent?.includes(text),
  );
  if (!option) throw new Error(`No option matching "${text}"`);
  return option;
};

/** The role chips rendered on a user's row. */
const rolesOf = (base: HTMLElement, name: string) => {
  const row = Array.from(base.querySelectorAll('.up-row')).find((el) =>
    el.querySelector('.up-name')?.textContent === name,
  );
  if (!row) throw new Error(`No row for "${name}"`);
  return Array.from(row.querySelectorAll('.up-role')).map((el) => el.textContent);
};

describe('UserPicker', () => {
  it('lists users alphabetically with their avatar, name and email', () => {
    const view = renderPicker();
    view.open();

    expect(visibleRows(view.baseElement)).toEqual([
      'Ada Lovelace <ada@example.com>',
      'Alan Turing <alan@example.com>',
      'Court 1 <court1@devices.example.com>',
      'Court 9 <court9@devices.example.com>',
      'Grace Hopper <grace@example.com>',
    ]);
    expect(optionWith(view.baseElement, 'Ada Lovelace').querySelector('.user-avatar')?.textContent).toBe(
      'AL',
    );
  });

  it('shows each user’s roles on their row', () => {
    const view = renderPicker();
    view.open();

    expect(rolesOf(view.baseElement, 'Ada Lovelace')).toEqual(['Coach', 'OrganizationAdmin']);
    expect(rolesOf(view.baseElement, 'Court 1')).toEqual(['ServiceAccount']);
  });

  it('leaves the roles off a user who has none', () => {
    const view = renderPicker();
    view.open();

    expect(rolesOf(view.baseElement, 'Alan Turing')).toEqual([]);
  });

  it('summarises a role list that is longer than the row shows', () => {
    const loaded = makeUser('several', {
      firstName: 'Several',
      lastName: 'Roles',
      email: 'several@example.com',
      roles: ['Athlete', 'Coach', 'Admin', 'SuperUser', 'AlphaTester'],
    });

    const view = renderPicker({ users: [loaded] });
    view.open();

    expect(rolesOf(view.baseElement, 'Several Roles')).toEqual([
      'Athlete',
      'Coach',
      'Admin',
      '+2',
    ]);
  });

  it('collects users without closing the panel', () => {
    const view = renderPicker();
    view.open();

    fireEvent.click(optionWith(view.baseElement, 'Grace Hopper'));

    expect(view.onChange).toHaveBeenCalledWith(['grace']);
    expect(view.baseElement.querySelector('.vs-panel')).not.toBeNull();
  });

  it('reports the rest of the selection when a user is added', () => {
    const view = renderPicker({ values: ['ada'] });
    view.open();

    fireEvent.click(optionWith(view.baseElement, 'Grace Hopper'));

    expect(view.onChange).toHaveBeenCalledWith(['ada', 'grace']);
  });

  it('takes a user back out when the same row is clicked again', () => {
    const view = renderPicker({ values: ['ada', 'grace'] });
    view.open();

    fireEvent.click(optionWith(view.baseElement, 'Grace Hopper'));

    expect(view.onChange).toHaveBeenCalledWith(['ada']);
  });

  it('shows the selection as pills in the trigger', () => {
    const view = renderPicker({ values: ['ada', 'grace'] });

    expect(triggerPills(view.container)).toEqual(['Ada Lovelace', 'Grace Hopper']);
  });

  it('shows the placeholder while nothing is selected', () => {
    const view = renderPicker({ placeholder: 'Add people' });

    expect(view.trigger().textContent).toContain('Add people');
  });

  it('removes a user when a pill is dismissed', () => {
    const view = renderPicker({ values: ['ada', 'grace'] });

    fireEvent.click(view.container.querySelector('[aria-label="Remove Ada Lovelace"]') as HTMLElement);

    expect(view.onChange).toHaveBeenCalledWith(['grace']);
    // Dismissing a pill must not double as opening the panel.
    expect(view.baseElement.querySelector('.vs-panel')).toBeNull();
  });

  it('collapses the pills that no longer fit into a counter', () => {
    const view = renderPicker({ values: ['ada', 'grace', 'alan', 'court-1'] });

    expect(triggerPills(view.container)).toEqual(['Ada Lovelace', 'Grace Hopper', '+2 more']);
  });

  it('filters on the email as well as the name', () => {
    const view = renderPicker();
    view.open();

    search(view, 'grace@');

    expect(visibleRows(view.baseElement)).toEqual(['Grace Hopper <grace@example.com>']);
  });

  it('reports when the search matches nothing', () => {
    const view = renderPicker();
    view.open();

    search(view, 'netball');

    expect(view.getByText('No users match your search')).toBeDefined();
  });

  it('lists only the users holding a restricted role', () => {
    const view = renderPicker({ onlyRoles: [Role.Coach] });
    view.open();

    expect(visibleRows(view.baseElement)).toEqual(['Ada Lovelace <ada@example.com>']);
  });

  it('says so when nobody holds a restricted role', () => {
    const view = renderPicker({
      onlyRoles: [Role.Coach],
      users: [users[4]],
      emptyMessage: 'No coaches found for this organization.',
    });
    view.open();

    expect(view.getByText('No coaches found for this organization.')).toBeDefined();
  });
});
