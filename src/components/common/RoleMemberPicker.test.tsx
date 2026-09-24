import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import { AuthContext, type AuthContextType } from '../../contexts/useAuth';
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
const coachAthlete = makeUser('coach-4', {
  firstName: 'Jo',
  lastName: 'Jumper',
  email: 'jo@example.com',
  roles: ['Coach', 'Athlete'],
});

const loadEntityUsers = vi.fn(async () => undefined);
const addUserToEntity = vi.fn(async () => true);
const updateEntityUserRoles = vi.fn(async () => true);
const removeUserFromEntity = vi.fn(async () => true);

/** The acting user — an admin whose level covers every staff role. */
let actor: User | null = makeUser('actor-1', { roles: ['Admin'] });

function authValue(): AuthContextType {
  return {
    currentUser: actor,
    firebaseUser: null,
    initializing: false,
    isAdmin: true,
    canCreateEvents: true,
  };
}

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  actor = makeUser('actor-1', { roles: ['Admin'] });
  loadEntityUsers.mockClear();
  addUserToEntity.mockClear();
  addUserToEntity.mockResolvedValue(true);
  updateEntityUserRoles.mockClear();
  updateEntityUserRoles.mockResolvedValue(true);
  removeUserFromEntity.mockClear();
  removeUserFromEntity.mockResolvedValue(true);

  useUserStore.setState({
    users: [coach, coachTwo, coachThree, athlete, serviceAccount],
    loadUsers: vi.fn(async () => undefined),
  });
  useEntityStore.setState({
    entityUsers: { 'org-1': [coach] },
    loadEntityUsers,
    addUserToEntity,
    updateEntityUserRoles,
    removeUserFromEntity,
  });
});

function renderCoachPicker(props: Partial<Parameters<typeof RoleMemberPicker>[0]> = {}) {
  const view = render(
    <AuthContext.Provider value={authValue()}>
      <RoleMemberPicker
        id="coaches"
        organizationId="org-1"
        role={Role.Coach}
        label="Coaches"
        placeholder="Add coaches"
        {...props}
      />
    </AuthContext.Provider>,
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

  it('keeps a role above the acting user’s level out of reach', () => {
    actor = makeUser('actor-2', { roles: ['Coach'] });
    const view = renderCoachPicker({
      id: 'admins',
      role: Role.OrganizationAdmin,
      label: 'Admins',
      placeholder: 'Add admins',
    });

    expect(document.getElementById('admins')).toBeNull();
    expect(view.getByText('You cannot grant the OrganizationAdmin role here.')).toBeDefined();
  });

  it('lets an organization admin grant their own level and below', () => {
    actor = makeUser('actor-3', { roles: [Role.OrganizationAdmin] });
    const view = renderCoachPicker({
      id: 'admins',
      role: Role.OrganizationAdmin,
      label: 'Admins',
      placeholder: 'Add admins',
    });

    expect(document.getElementById('admins')).not.toBeNull();
    expect(view.queryByText(/cannot grant/)).toBeNull();
  });

  it('counts a role the acting user holds on this organization', () => {
    actor = makeUser('actor-4', { roles: [Role.Athlete] });
    useEntityStore.setState({
      entityUsers: {
        'org-1': [makeUser('actor-4', { firstName: 'Org', roles: [Role.OrganizationAdmin] })],
      },
    });

    renderCoachPicker({
      id: 'admins',
      role: Role.OrganizationAdmin,
      label: 'Admins',
      placeholder: 'Add admins',
    });

    expect(document.getElementById('admins')).not.toBeNull();
  });

  it('removes the membership when the role was their only one here', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = renderCoachPicker();

    fireEvent.click(view.getByLabelText('Remove Casey Coach from Coaches'));

    await waitFor(() => expect(removeUserFromEntity).toHaveBeenCalledWith('org-1', 'coach-1'));
    expect(addUserToEntity).not.toHaveBeenCalled();
    expect(updateEntityUserRoles).not.toHaveBeenCalled();
  });

  it('replaces the roles they keep when the role is not their last one here', async () => {
    useEntityStore.setState({ entityUsers: { 'org-1': [coachAthlete] } });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = renderCoachPicker();

    fireEvent.click(view.getByLabelText('Remove Jo Jumper from Coaches'));

    expect(confirmSpy).toHaveBeenCalledWith(
      'Remove Jo Jumper as a Coach? They keep their other roles on this organization.',
    );
    await waitFor(() =>
      expect(updateEntityUserRoles).toHaveBeenCalledWith('org-1', 'coach-4', { roles: ['Athlete'] }),
    );
    expect(addUserToEntity).not.toHaveBeenCalled();
    expect(removeUserFromEntity).not.toHaveBeenCalled();
  });

  it('names the person in the confirmation and keeps them when it is rejected', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const view = renderCoachPicker();

    fireEvent.click(view.getByLabelText('Remove Casey Coach from Coaches'));

    expect(confirmSpy).toHaveBeenCalledWith(
      'Remove Casey Coach from this organization? Coach is the only role they hold on it.',
    );
    expect(removeUserFromEntity).not.toHaveBeenCalled();
  });

  it('reports a failed role update', async () => {
    useEntityStore.setState({ entityUsers: { 'org-1': [coachAthlete] } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    updateEntityUserRoles.mockResolvedValue(false);
    const view = renderCoachPicker();

    fireEvent.click(view.getByLabelText('Remove Jo Jumper from Coaches'));

    expect(await view.findByText('Could not remove Jo Jumper. Please try again.')).toBeDefined();
  });

  it('reports a failed removal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    removeUserFromEntity.mockResolvedValue(false);
    const view = renderCoachPicker();

    fireEvent.click(view.getByLabelText('Remove Casey Coach from Coaches'));

    expect(await view.findByText('Could not remove Casey Coach. Please try again.')).toBeDefined();
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
