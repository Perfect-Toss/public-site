import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import { Role, type User } from '../../api/api.users';
import { useEntityStore } from '../../stores/entityStore';
import { useUserStore } from '../../stores/userStore';
import { RoleMemberPicker } from './RoleMemberPicker';

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

function makeUser(id: string, fields: Partial<User> = {}): User {
  return { ...fields, id, email: fields.email ?? null };
}

const coach = makeUser('coach-1', {
  firstName: 'Casey',
  lastName: 'Coach',
  email: 'casey@example.com',
  roles: ['Coach'],
});
const coachTwo = makeUser('coach-2', {
  firstName: 'Kim',
  lastName: 'Klub',
  email: 'kim@example.com',
  roles: ['Coach'],
});
const coachThree = makeUser('coach-3', {
  firstName: 'Sam',
  lastName: 'Scrum',
  email: 'sam@example.com',
  roles: ['Coach'],
});
const athlete = makeUser('athlete-1', {
  firstName: 'Ada',
  lastName: 'Athlete',
  email: 'ada@example.com',
  roles: ['Athlete'],
});
const serviceAccount = makeUser('tablet-1', {
  firstName: 'Court 1',
  email: 'court1@devices.example.com',
  roles: ['ServiceAccount'],
});

const loadEntityUsers = vi.fn(async () => undefined);
const addUserToEntity = vi.fn(async () => true);

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

beforeEach(() => {
  loadEntityUsers.mockClear();
  addUserToEntity.mockClear();
  addUserToEntity.mockResolvedValue(true);

  useUserStore.setState({
    users: [coach, coachTwo, coachThree, athlete, serviceAccount],
    loadUsers: vi.fn(async () => undefined),
  });
  useEntityStore.setState({
    entityUsers: { 'org-1': [coach] },
    loadEntityUsers,
    addUserToEntity,
  });
});

function renderCoachPicker(props: Partial<Parameters<typeof RoleMemberPicker>[0]> = {}) {
  const view = render(
    <RoleMemberPicker
      id="coaches"
      organizationId="org-1"
      role={Role.Coach}
      label="Coaches"
      placeholder="Add coaches"
      {...props}
    />,
  );

  const trigger = () => document.getElementById(props.id ?? 'coaches') as HTMLElement;
  const open = () => {
    fireEvent.mouseDown(trigger());
    fireEvent.click(trigger());
  };
  return { ...view, trigger, open };
}

/** The users listed in the open picker panel. */
const panelNames = () =>
  Array.from(document.querySelectorAll('.vs-option .up-name')).map((el) => el.textContent);

/** The members listed above the picker as already holding the role. */
const memberNames = () =>
  Array.from(document.querySelectorAll('.rmp-member-name')).map((el) => el.textContent);

/** The rendered option row whose text contains `text`. */
const optionWith = (text: string) => {
  const option = Array.from(document.body.querySelectorAll('.vs-option')).find((el) =>
    el.textContent?.includes(text),
  );
  if (!option) throw new Error(`No option matching "${text}"`);
  return option;
};

describe('RoleMemberPicker', () => {
  it('offers the overall holders of the role who are not members yet', () => {
    const view = renderCoachPicker();
    view.open();

    expect(panelNames()).toEqual(['Kim Klub', 'Sam Scrum']);
  });

  it('can offer everyone when the role is not held overall', () => {
    const view = renderCoachPicker({ filterByOverallRole: false });
    view.open();

    expect(panelNames()).toEqual(['Ada Athlete', 'Court 1', 'Kim Klub', 'Sam Scrum']);
  });

  it('adds the picked users with that role', async () => {
    const view = renderCoachPicker();
    view.open();

    fireEvent.click(optionWith('Kim Klub'));
    fireEvent.click(view.getByText('Add Coaches'));

    await waitFor(() => expect(addUserToEntity).toHaveBeenCalledTimes(1));
    expect(addUserToEntity).toHaveBeenCalledWith('org-1', 'coach-2', { roles: [Role.Coach] });
  });

  it('keeps the plain label for one pick and counts several', async () => {
    const view = renderCoachPicker();
    view.open();

    fireEvent.click(optionWith('Kim Klub'));
    expect(view.getByText('Add Coaches')).toBeDefined();

    fireEvent.click(optionWith('Sam Scrum'));
    expect(view.getByText('Add 2 Coaches')).toBeDefined();

    fireEvent.click(view.getByText('Add 2 Coaches'));
    await waitFor(() => expect(addUserToEntity).toHaveBeenCalledTimes(2));
  });

  it('clears the selection and reloads the members once they are added', async () => {
    const view = renderCoachPicker();
    view.open();

    fireEvent.click(optionWith('Kim Klub'));
    fireEvent.click(view.getByText('Add Coaches'));

    await waitFor(() => expect(loadEntityUsers).toHaveBeenCalledWith('org-1'));
    expect((view.trigger().textContent ?? '')).toContain('Add coaches');
  });

  it('reports a failed add instead of pretending it worked', async () => {
    addUserToEntity.mockRejectedValue(new Error('nope'));
    const view = renderCoachPicker();
    view.open();

    fireEvent.click(optionWith('Kim Klub'));
    fireEvent.click(view.getByText('Add Coaches'));

    expect(await view.findByText('Could not add those coaches. Please try again.')).toBeDefined();
  });

  it('leaves the add button disabled until someone is picked', () => {
    const view = renderCoachPicker();

    expect((view.getByText('Add Coaches') as HTMLButtonElement).disabled).toBe(true);
  });

  it('lists the members who already hold the role', () => {
    useEntityStore.setState({ entityUsers: { 'org-1': [athlete, coachTwo, coach] } });
    renderCoachPicker();

    expect(memberNames()).toEqual(['Casey Coach', 'Kim Klub']);
  });

  it('says so when nobody holds the role yet', () => {
    useEntityStore.setState({ entityUsers: { 'org-1': [] } });
    const view = renderCoachPicker();

    expect(view.getByText('No coaches yet.')).toBeDefined();
  });

  it('can leave the roster out', () => {
    renderCoachPicker({ showMembers: false });

    expect(memberNames()).toEqual([]);
    expect(document.querySelector('.rmp-members')).toBeNull();
  });

  it('grants the role it was given, not the one the user already holds', async () => {
    const view = renderCoachPicker({
      id: 'tablets',
      role: Role.ServiceAccount,
      label: 'Service Accounts',
      placeholder: 'Add service accounts',
    });
    view.open();

    fireEvent.click(optionWith('Court 1'));
    fireEvent.click(view.getByText('Add Service Accounts'));

    await waitFor(() => expect(addUserToEntity).toHaveBeenCalledTimes(1));
    expect(addUserToEntity).toHaveBeenCalledWith('org-1', 'tablet-1', {
      roles: [Role.ServiceAccount],
    });
  });
});
