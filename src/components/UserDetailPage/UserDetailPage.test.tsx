import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { AuthContext, type AuthContextType } from '../../contexts/useAuth';
import UserDetailPage from './UserDetailPage';
import type { User } from '../../api/api.users';
import { useEntityStore } from '../../stores/entityStore';
import { useUserStore } from '../../stores/userStore';

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
  useUserStore.setState({
    loadUserById: vi.fn(async () => target),
    updateUser: vi.fn(async () => undefined),
  });
  useEntityStore.setState({ loadEntitiesForUser: vi.fn(async () => []) });
});

/** Opens the roles dropdown the page shows while editing. */
async function openRolePicker() {
  const view = render(
    <AuthContext.Provider value={authValue()}>
      <UserDetailPage />
    </AuthContext.Provider>,
  );

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
