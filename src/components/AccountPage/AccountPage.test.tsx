import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import AccountPage from './AccountPage';
import { AuthContext, type AuthContextType } from '../../contexts/useAuth';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../api/api.users';

const mocks = vi.hoisted(() => ({
  fetchCurrentUser: vi.fn(),
  fetchUserById: vi.fn(),
  updateUser: vi.fn(),
  uploadUserThumbnail: vi.fn(),
  deleteUserThumbnail: vi.fn(),
  fetchAllEntities: vi.fn(),
  fetchUserMemberships: vi.fn(),
  fetchMetaInfo: vi.fn(),
  fetchSignInMethods: vi.fn(),
}));

// The module's own role helpers stay real — only the requests are faked.
vi.mock('../../api/api.users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/api.users')>()),
  fetchCurrentUser: mocks.fetchCurrentUser,
  fetchUserById: mocks.fetchUserById,
  updateUser: mocks.updateUser,
  uploadUserThumbnail: mocks.uploadUserThumbnail,
  deleteUserThumbnail: mocks.deleteUserThumbnail,
}));

vi.mock('../../api/api.entities', () => ({
  fetchAllEntities: mocks.fetchAllEntities,
  fetchUserMemberships: mocks.fetchUserMemberships,
}));

vi.mock('../../api/api.meta', () => ({
  fetchMetaInfo: mocks.fetchMetaInfo,
}));

vi.mock('../../api/api.auth', () => ({
  fetchSignInMethods: mocks.fetchSignInMethods,
}));

// Build metadata is injected by Vite, which is not running here.
vi.mock('../../version', () => ({
  APP_VERSION: {
    version: '1.2.3',
    sha: 'abcdef1234',
    environment: 'test',
    buildTime: '2026-01-01T00:00:00.000Z',
  },
  IS_PRODUCTION: false,
  formatVersion: () => 'v1.2.3 · abcdef1 · test',
}));

// Canvas is not implemented in jsdom, so the photo is uploaded as picked; the
// normaliser has its own tests.
vi.mock('../../utils/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/image')>()),
  normalizeAvatarImage: vi.fn(async (file: File) => file),
}));

const athlete: User = {
  id: 'user-1',
  email: 'sam@example.com',
  firstName: 'Sam',
  lastName: 'Sprinter',
  birthdate: '1998-04-02',
  heightInInches: 72,
  ustaRating: 4.5,
  handedness: 'Left',
  colorHex: null,
  thumbnailUrl: null,
  roles: ['Athlete'],
  acceptedTerms: true,
  createdAt: '2025-01-04T10:00:00Z',
};

function renderPage(user: User = athlete) {
  const value: AuthContextType = {
    currentUser: user,
    firebaseUser: null,
    initializing: false,
    isAdmin: false,
    canCreateEvents: false,
  };

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <AccountPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

/** The value of a labelled input. */
const inputValue = (view: ReturnType<typeof renderPage>, label: string) =>
  (view.getByLabelText(label) as HTMLInputElement).value;

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

beforeEach(() => {
  // Vitest globals are off, so mock call history is not reset automatically.
  vi.clearAllMocks();
  // The actor's store carries the roles an admin may grant.
  useAuthStore.setState({ user: null });
  mocks.fetchCurrentUser.mockResolvedValue(athlete);
  mocks.fetchUserById.mockResolvedValue(athlete);
  mocks.updateUser.mockResolvedValue(athlete);
  mocks.uploadUserThumbnail.mockResolvedValue(undefined);
  mocks.deleteUserThumbnail.mockResolvedValue(undefined);
  mocks.fetchAllEntities.mockResolvedValue([]);
  mocks.fetchUserMemberships.mockResolvedValue([]);
  mocks.fetchSignInMethods.mockResolvedValue({
    providers: ['password', 'google.com'],
    signInProvider: 'google.com',
  });
  mocks.fetchMetaInfo.mockResolvedValue({
    version: '2.4.1',
    lastUpdated: '2026-11-01T09:00:00Z',
  });
});

describe('AccountPage', () => {
  it('lists the linked sign-in methods and marks the current one', async () => {
    const view = renderPage();

    await waitFor(() => expect(view.getByText('Google')).toBeTruthy());
    const rows = [...view.container.querySelectorAll('.account-provider')];
    expect(rows.map((row) => row.querySelector('.account-provider-name')?.textContent)).toEqual([
      'Email',
      'Google',
    ]);
    expect(rows[1].querySelector('.account-provider-current')?.textContent).toBe('Current session');
    expect(rows[0].querySelector('.account-provider-current')).toBeNull();
  });

  it('reports when the sign-in methods cannot be loaded', async () => {
    mocks.fetchSignInMethods.mockRejectedValue(new Error('offline'));
    const view = renderPage();

    await waitFor(() => expect(view.getByText('Could not load sign-in methods.')).toBeTruthy());
  });

  it('shows the profile fields a user can change', () => {
    const view = renderPage();

    expect(view.getByText('Sam Sprinter')).toBeTruthy();
    expect(view.getByText('sam@example.com')).toBeTruthy();
    expect(inputValue(view, 'First name')).toBe('Sam');
    expect(inputValue(view, 'Last name')).toBe('Sprinter');
    // The date field shows the picked day rather than a raw input value.
    expect(view.getByLabelText('Date of birth').textContent).toBe('Apr 2, 1998');
    // The height picker shows feet/inches, with the metric conversion beside it.
    expect(view.getByLabelText('Height').textContent).toBe('6′ 0″');
    expect(view.container.querySelector('.account-field small')?.textContent).toBe('183 cm');
    expect(view.getByLabelText('USTA rating').textContent).toBe('4.5');
    expect(view.getByLabelText('Handedness').textContent).toBe('Left');
  });

  it('leaves the rating unset when the profile has none', () => {
    const view = renderPage({ ...athlete, ustaRating: null, handedness: undefined });

    expect(view.getByLabelText('USTA rating').textContent).toBe('Not set');
    expect(view.getByLabelText('Handedness').textContent).toBe('Not set');
  });

  it('leaves handedness out of the payload when it is not set', async () => {
    const view = renderPage({ ...athlete, handedness: undefined });

    fireEvent.change(view.getByLabelText('First name'), { target: { value: 'Samantha' } });
    fireEvent.click(view.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledTimes(1));
    // The API takes no null for the enum, so the field is omitted instead.
    expect(mocks.updateUser.mock.calls[0][0]).not.toHaveProperty('handedness');
  });

  it('saves only the editable fields and never sends roles', async () => {
    const view = renderPage();
    const save = view.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement;

    // Nothing to save until something changes.
    expect(save.disabled).toBe(true);

    fireEvent.change(view.getByLabelText('First name'), { target: { value: 'Samantha' } });
    // The identity header previews the edit before it is saved.
    expect(view.getByText('Samantha Sprinter')).toBeTruthy();
    expect(save.disabled).toBe(false);

    fireEvent.click(save);

    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledTimes(1));
    expect(mocks.updateUser).toHaveBeenCalledWith({
      id: 'user-1',
      firstName: 'Samantha',
      lastName: 'Sprinter',
      birthdate: '1998-04-02',
      heightInInches: 72,
      ustaRating: 4.5,
      handedness: 'Left',
      colorHex: null,
    });
    expect(await view.findByText('Profile updated.')).toBeTruthy();
  });

  it('sends a custom avatar color', async () => {
    const view = renderPage();

    fireEvent.change(view.getByLabelText('Custom avatar color'), {
      target: { value: '#123456' },
    });
    fireEvent.click(view.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ colorHex: '#123456' }),
      ),
    );
  });

  it('clears the avatar color', async () => {
    const colored: User = { ...athlete, colorHex: '#E05353' };
    const view = renderPage(colored);

    fireEvent.click(view.getByRole('button', { name: 'Clear color' }));
    fireEvent.click(view.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ colorHex: null }),
      ),
    );
  });

  it('keeps the photo full size and only adds the colour ring', () => {
    const photo = (view: ReturnType<typeof renderPage>) =>
      view.container.querySelector('.user-avatar-img') as HTMLElement;
    const avatar = (view: ReturnType<typeof renderPage>) =>
      view.container.querySelector('.user-avatar') as HTMLElement;

    const plain = renderPage({ ...athlete, thumbnailUrl: 'https://img/me.png' });
    expect(photo(plain).style.width).toBe('88px');
    // Without a chosen colour the ring still carries the name-derived colour.
    expect(avatar(plain).style.boxShadow).toContain('0 0 0 4px');
    cleanup();

    // A colour draws a ring AROUND the photo — the photo itself is unchanged.
    const ringed = renderPage({
      ...athlete,
      colorHex: '#E05353',
      thumbnailUrl: 'https://img/me.png',
    });
    expect(photo(ringed).style.width).toBe('88px');
    expect(avatar(ringed).style.width).toBe('88px');
    expect(avatar(ringed).style.boxShadow).toContain('#E05353');
  });

  it('clears the avatar color when a photo is uploaded', async () => {
    const view = renderPage({ ...athlete, colorHex: '#E05353' });
    const input = view.container.querySelector('.account-file-input') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(['frame'], 'me.png', { type: 'image/png' })] },
    });

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith(
        // The rest of the profile rides along unchanged.
        {
          id: 'user-1',
          firstName: 'Sam',
          lastName: 'Sprinter',
          birthdate: '1998-04-02',
          heightInInches: 72,
          ustaRating: 4.5,
          handedness: 'Left',
          colorHex: null,
        },
      ),
    );
  });

  it('uploads a chosen photo', async () => {
    const view = renderPage();
    const input = view.container.querySelector('.account-file-input') as HTMLInputElement;
    const file = new File(['frame'], 'me.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mocks.uploadUserThumbnail).toHaveBeenCalledWith('user-1', file));
    expect(await view.findByText('Profile photo updated.')).toBeTruthy();
  });

  it('summarises the organizations and roles the user holds', async () => {
    mocks.fetchAllEntities.mockResolvedValue([
      { id: 'org-b', name: 'Zephyr Club', entityType: 'Club', users: [{ user: { id: 'user-1' }, roles: [] }] },
      { id: 'org-a', name: 'Atlas Club', entityType: 'Club', users: [{ user: { id: 'user-1' }, roles: ['Coach'] }] },
      // The user is not a member here, so it is not part of their access.
      { id: 'org-c', name: 'Other Club', entityType: 'Club', users: [{ user: { id: 'user-9' }, roles: ['Athlete'] }] },
    ]);

    const view = renderPage();

    expect(await view.findByText('Atlas Club')).toBeTruthy();
    // Alphabetical, memberships only.
    expect(
      Array.from(view.container.querySelectorAll('.account-access-name')).map(
        (name) => name.textContent,
      ),
    ).toEqual(['Atlas Club', 'Zephyr Club']);
    expect(view.getByText('Coach')).toBeTruthy();
    expect(view.getByText('No role')).toBeTruthy();
    expect(view.getByText('2 organizations')).toBeTruthy();
    expect(mocks.fetchAllEntities).toHaveBeenCalledWith(true);
  });

  it('says so when the user belongs to no organization', async () => {
    const view = renderPage();

    expect(await view.findByText('You are not a member of any organization yet.')).toBeTruthy();
  });

  it('reports the site and API versions', async () => {
    const view = renderPage();

    // Site version comes from the build; the API reports its own.
    expect(view.getByText('v1.2.3 · abcdef1 · test')).toBeTruthy();
    expect(await view.findByText('2.4.1')).toBeTruthy();
  });

  it('shows whether the terms have been accepted', () => {
    const view = renderPage();

    const fact = (label: string) =>
      Array.from(view.container.querySelectorAll('.account-fact')).find(
        (row) => row.querySelector('dt')?.textContent === label,
      )?.querySelector('dd')?.textContent;

    expect(fact('Terms accepted')).toBe('Yes');

    cleanup();
    const declined = renderPage({ ...athlete, acceptedTerms: false });
    expect(declined.getByText('Terms accepted')).toBeTruthy();
    expect(
      Array.from(declined.container.querySelectorAll('.account-fact dd')).map((dd) => dd.textContent),
    ).toContain('No');
  });

  it('rejects a photo over the size limit', async () => {
    const view = renderPage();
    const input = view.container.querySelector('.account-file-input') as HTMLInputElement;
    const file = new File(['frame'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await view.findByText('That image is larger than 20 MB.')).toBeTruthy();
    expect(mocks.uploadUserThumbnail).not.toHaveBeenCalled();
  });

  it('offers Remove photo only once a photo exists', async () => {
    const withoutPhoto = renderPage();
    expect(withoutPhoto.queryByRole('button', { name: 'Remove photo' })).toBeNull();
    expect(withoutPhoto.getByRole('button', { name: 'Upload photo' })).toBeTruthy();
    withoutPhoto.unmount();

    const withPhoto = renderPage({ ...athlete, thumbnailUrl: 'https://img/me.png' });
    expect(withPhoto.getByRole('button', { name: 'Replace photo' })).toBeTruthy();

    fireEvent.click(withPhoto.getByRole('button', { name: 'Remove photo' }));

    await waitFor(() => expect(mocks.deleteUserThumbnail).toHaveBeenCalledWith('user-1'));
  });
});

/* ─── Admin route: /admin/users/:id ────────────────────────────────────────── */

/** The account an admin opened. */
const managed: User = {
  id: 'user-1',
  email: 'sam@example.com',
  firstName: 'Sam',
  lastName: 'Super',
  roles: ['Admin', 'SuperUser'],
  isEmailVerified: true,
};

/** The signed-in admin doing the editing. */
const actor: User = { id: 'actor-1', email: 'actor@example.com', roles: ['Admin'] };

/** Renders the admin route; the URL (not the auth context) names the account. */
function renderManagedPage(grantor: User = actor, target: User | null = managed) {
  const id = target?.id ?? managed.id;
  mocks.fetchUserById.mockResolvedValue(target);
  mocks.updateUser.mockResolvedValue(target);
  // The role rules read the acting user's own roles from the auth store.
  useAuthStore.setState({ user: grantor });

  const value: AuthContextType = {
    currentUser: grantor,
    firebaseUser: null,
    initializing: false,
    isAdmin: true,
    canCreateEvents: true,
  };

  return render(
    <MemoryRouter initialEntries={[`/admin/users/${id}`]}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/admin/users/:id" element={<AccountPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

/** Opens the roles dropdown the admin route shows. */
async function openRolePicker(grantor: User = actor, target: User = managed) {
  const view = renderManagedPage(grantor, target);

  await view.findByText('Sam Super');
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
    (el) => el.querySelector('input') as HTMLInputElement,
  );

describe('AccountPage — admin route', () => {
  it('shows the account the route names', async () => {
    const view = renderManagedPage();

    expect(await view.findByText('Sam Super')).toBeTruthy();
    expect(view.getByText('sam@example.com')).toBeTruthy();
    expect(mocks.fetchUserById).toHaveBeenCalledWith('user-1');
    expect(view.getByRole('button', { name: 'Back to users' })).toBeTruthy();
  });

  it('reports a missing account', async () => {
    const view = renderManagedPage(actor, null);

    expect(await view.findByText('This account could not be found.')).toBeTruthy();
  });

  it('hides sign-in methods, which only describe the caller', async () => {
    const view = renderManagedPage();

    expect(await view.findByText('Sam Super')).toBeTruthy();
    expect(view.queryByText('Sign-in methods')).toBeNull();
    expect(mocks.fetchSignInMethods).not.toHaveBeenCalled();
  });

  it('reads the account memberships for its organization access', async () => {
    mocks.fetchUserMemberships.mockResolvedValue([
      { entityId: 'org-2', entityName: 'Zephyr Club', entityType: 'Club', roles: null },
      { entityId: 'org-1', entityName: 'Atlas Club', entityType: 'Club', roles: ['Coach'] },
    ]);

    const view = renderManagedPage();

    expect(await view.findByText('Atlas Club')).toBeTruthy();
    expect(
      Array.from(view.container.querySelectorAll('.account-access-name')).map(
        (name) => name.textContent,
      ),
    ).toEqual(['Atlas Club', 'Zephyr Club']);
    // The roles are the ones the account holds on the organization.
    expect(view.getByText('Coach')).toBeTruthy();
    expect(view.getByText('No role')).toBeTruthy();
    expect(view.getByText('2 organizations')).toBeTruthy();
    expect(mocks.fetchUserMemberships).toHaveBeenCalledWith('user-1');
    expect(mocks.fetchAllEntities).not.toHaveBeenCalled();
  });

  it('offers a super user every role', async () => {
    await openRolePicker({ ...actor, roles: ['SuperUser'] });

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
    expect(view.getByText(/Roles above your own level are locked/)).toBeDefined();
  });

  it('saves the roles alongside the rest of the profile', async () => {
    const view = await openRolePicker();

    const adminOption = Array.from(document.querySelectorAll('.multi-select-option')).find(
      (el) => el.textContent === 'Admin',
    ) as HTMLElement;
    fireEvent.click(adminOption);

    fireEvent.click(view.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith(
        // The locked role rides along; only the removable one is dropped.
        expect.objectContaining({ id: 'user-1', roles: ['SuperUser'] }),
      ),
    );
  });

  it('never offers the role picker on your own account', async () => {
    renderPage();

    expect(document.querySelector('.multi-select-trigger')).toBeNull();
  });
});
