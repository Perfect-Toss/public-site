import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import MembersView from './MembersView';
import type { User } from '../../../api/api.users';
import { useEntityStore } from '../../../stores/entityStore';
import { useUserStore } from '../../../stores/userStore';

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

const navigate = vi.fn();
let mockIsAdmin = true;
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
  useOutletContext: () => ({
    organization: { id: 'org-1', name: 'Club' },
    isAdmin: mockIsAdmin,
  }),
}));

function makeUser(id: string, fields: Partial<User> = {}): User {
  return { ...fields, id, email: fields.email ?? null };
}

const member = makeUser('member', {
  firstName: 'Mira',
  lastName: 'Member',
  email: 'mira@example.com',
  roles: ['Athlete'],
});
const coach = makeUser('coach', {
  firstName: 'Casey',
  lastName: 'Coach',
  email: 'casey@example.com',
  roles: ['Coach'],
});
const athlete = makeUser('athlete-1', {
  firstName: 'Ada',
  lastName: 'Athlete',
  email: 'ada@example.com',
  roles: ['Athlete'],
});
const athleteTwo = makeUser('athlete-2', {
  firstName: 'Bea',
  lastName: 'Bolt',
  email: 'bea@example.com',
  roles: ['Athlete'],
});

const loadEntityUsers = vi.fn(async () => undefined);
const addUserToEntity = vi.fn(async () => true);

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

beforeEach(() => {
  mockIsAdmin = true;
  navigate.mockClear();
  loadEntityUsers.mockClear();
  addUserToEntity.mockClear();

  useUserStore.setState({
    users: [member, coach, athlete, athleteTwo],
    loadUsers: vi.fn(async () => undefined),
  });
  useEntityStore.setState({
    entityUsers: { 'org-1': [member] },
    loadEntityUsers,
    addUserToEntity,
  });
});

/** Renders the tab and waits for the roster to settle. */
async function renderMembers() {
  const view = render(<MembersView />);

  await waitFor(() =>
    expect(view.container.querySelector('.members-table-wrap')).not.toBeNull(),
  );
  return view;
}

/** The add picker is on screen from the start — it just needs opening. */
function openPicker() {
  const trigger = document.getElementById('add-member-picker') as HTMLElement;
  fireEvent.mouseDown(trigger);
  fireEvent.click(trigger);
}

/** The users listed in the open picker panel. */
const panelNames = () =>
  Array.from(document.querySelectorAll('.vs-option .up-name')).map((el) => el.textContent);

/** The rendered option row whose text contains `text`. */
const optionWith = (text: string) => {
  const option = Array.from(document.body.querySelectorAll('.vs-option')).find((el) =>
    el.textContent?.includes(text),
  );
  if (!option) throw new Error(`No option matching "${text}"`);
  return option;
};

describe('MembersView', () => {
  it('shows the add component above the members list without any interaction', async () => {
    const view = await renderMembers();

    const addComponent = view.container.querySelector('.info-card') as HTMLElement;
    const roster = view.container.querySelector('.members-table-wrap') as HTMLElement;

    expect(document.getElementById('add-member-picker')).not.toBeNull();
    expect(addComponent.compareDocumentPosition(roster)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('offers everyone who is not a member yet', async () => {
    await renderMembers();
    openPicker();

    expect(panelNames()).toEqual(['Ada Athlete', 'Bea Bolt', 'Casey Coach']);
  });

  it('adds the picked athletes to the organization with the athlete role', async () => {
    const view = await renderMembers();
    openPicker();

    fireEvent.click(optionWith('Ada Athlete'));
    fireEvent.click(optionWith('Bea Bolt'));
    fireEvent.click(view.getByText('Add 2 Athletes'));

    await waitFor(() => expect(addUserToEntity).toHaveBeenCalledTimes(2));
    expect(addUserToEntity).toHaveBeenCalledWith('org-1', 'athlete-1', { roles: ['Athlete'] });
    expect(addUserToEntity).toHaveBeenCalledWith('org-1', 'athlete-2', { roles: ['Athlete'] });
  });

  it('clears the selection once the athletes are added', async () => {
    const view = await renderMembers();
    openPicker();

    fireEvent.click(optionWith('Ada Athlete'));
    fireEvent.click(view.getByText('Add Athletes'));

    await waitFor(() => expect(addUserToEntity).toHaveBeenCalledTimes(1));
    const trigger = document.getElementById('add-member-picker') as HTMLElement;
    await waitFor(() => expect(trigger.textContent).toContain('Add athletes'));
  });

  it('leaves the add component out for a non-admin', async () => {
    mockIsAdmin = false;
    const view = await renderMembers();

    expect(document.getElementById('add-member-picker')).toBeNull();
    expect(view.container.querySelector('.members-table-wrap')).not.toBeNull();
  });
});
