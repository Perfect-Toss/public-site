import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext, type AuthContextType } from '../../contexts/useAuth';
import UserDetailPage from './UserDetailPage';
import type { User } from '../../api/api.users';
import { useUserStore } from '../../stores/userStore';

const mocks = vi.hoisted(() => ({
  fetchEntitiesForUser: vi.fn(),
}));

vi.mock('../../api/api.entities', () => ({
  fetchEntitiesForUser: mocks.fetchEntitiesForUser,
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ id: 'user-1' }),
  useNavigate: () => vi.fn(),
}));

function makeUser(id: string, fields: Partial<User> = {}): User {
  return { ...fields, id, email: fields.email ?? null };
}

/** The user being viewed — an admin, so the page offers its Edit button. */
const target = makeUser('user-1', {
  firstName: 'Sam',
  lastName: 'Super',
  email: 'sam@example.com',
  roles: ['Admin', 'SuperUser'],
});

/** The acting user's global roles. */
let actorRoles: User['roles'] = ['Admin'];

function authValue(): AuthContextType {
  return {
    currentUser: makeUser('actor-1', { roles: actorRoles }),
    firebaseUser: null,
    initializing: false,
    isAdmin: true,
    canCreateEvents: true,
  };
}

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

beforeEach(() => {
  actorRoles = ['Admin'];
  vi.clearAllMocks();
  mocks.fetchEntitiesForUser.mockResolvedValue([]);
  useUserStore.setState({
    loadUserById: vi.fn(async () => target),
    updateUser: vi.fn(async () => undefined),
  });
});

/** Renders the page; the organization rows are links, so a router is required. */
function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue()}>
        <UserDetailPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

/** Opens the roles dropdown the page shows while editing. */
async function openRolePicker() {
  const view = renderPage();

  await view.findByText('Sam Super');
  fireEvent.click(view.getByText('Edit'));
  fireEvent.click(document.querySelector('.multi-select-trigger') as HTMLElement);

  return view;
}

/** The role names the acting user may pick, locked rows excluded. */
const grantableRoles = () =>
  Array.from(document.querySelectorAll('.multi-select-option:not(.multi-select-option-locked)')).map(
    (el) => el.textContent,
  );

/** The locked rows: roles the acting user may not change. */
const lockedOptions = () =>
  Array.from(document.querySelectorAll('.multi-select-option-locked')).map(
    (el) => (el.querySelector('input') as HTMLInputElement),
  );

describe('UserDetailPage role picker', () => {
  it('offers a super user every role', async () => {
    actorRoles = ['SuperUser'];
    await openRolePicker();

    expect(grantableRoles()).toContain('SuperUser');
    expect(lockedOptions()).toHaveLength(0);
  });

  it('keeps the super user role away from an admin', async () => {
    await openRolePicker();

    expect(grantableRoles()).not.toContain('SuperUser');
    expect(grantableRoles()).toContain('Admin');
    expect(grantableRoles()).toContain('OrganizationAdmin');
  });

  it('shows a held super user role as locked rather than dropping it', async () => {
    const view = await openRolePicker();

    const [superUser] = lockedOptions();
    expect(superUser).toBeDefined();
    expect(superUser.checked).toBe(true);
    expect(superUser.disabled).toBe(true);
    expect(
      view.getByText(/Roles above your own level are locked/),
    ).toBeDefined();
  });

  it('leaves the locked role on the account when the rest is saved', async () => {
    const updateUser = vi.fn(async () => undefined);
    useUserStore.setState({ updateUser });
    const view = await openRolePicker();

    fireEvent.click(view.getByText('Save'));

    await vi.waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ roles: ['Admin', 'SuperUser'] })),
    );
  });
});

describe('UserDetailPage profile', () => {
  it('shows the rating and handedness', async () => {
    const rated: User = { ...target, ustaRating: 4.5, handedness: 'Left' };
    useUserStore.setState({ loadUserById: vi.fn(async () => rated) });

    const view = renderPage();
    await view.findByText('Sam Super');

    expect(view.getByText('4.5')).toBeTruthy();
    expect(view.getByText('Left')).toBeTruthy();
  });

  it('sends the whole profile back, so a save cannot clear it', async () => {
    const updateUser = vi.fn(async () => undefined);
    const rated: User = {
      ...target,
      ustaRating: 4.5,
      handedness: 'Left',
      colorHex: '#E05353',
    };
    useUserStore.setState({ loadUserById: vi.fn(async () => rated), updateUser });

    const view = renderPage();
    await view.findByText('Sam Super');
    fireEvent.click(view.getByText('Edit'));
    fireEvent.click(view.getByText('Save'));

    await vi.waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          ustaRating: 4.5,
          handedness: 'Left',
          colorHex: '#E05353',
        }),
      ),
    );
  });
});

describe('UserDetailPage organizations', () => {
  it('lists the organizations of the user it is showing', async () => {
    mocks.fetchEntitiesForUser.mockResolvedValue([
      { id: 'org-a', name: 'Atlas Club', entityType: 'Club' },
    ]);

    const view = renderPage();
    await view.findByText('Sam Super');

    expect(await view.findByText('Atlas Club')).toBeTruthy();
    // The targeted membership list, not every entity in the tree.
    expect(mocks.fetchEntitiesForUser).toHaveBeenCalledWith('user-1');
    // The shared org tile links to the organization.
    expect(
      view.container.querySelector('.organization-card')?.getAttribute('href'),
    ).toBe('/organizations/org-a');
  });
});
