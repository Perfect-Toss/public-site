import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import { AuthContext, type AuthContextType } from '../../../contexts/useAuth';
import type { Entity, UpdateEntityRequest } from '../../../api/api.entities';
import SettingsView from './SettingsView';
import type { User } from '../../../api/api.users';
import { useEntityStore } from '../../../stores/entityStore';
import { useUserStore } from '../../../stores/userStore';

// Canvas is not implemented in jsdom; the normaliser has its own tests.
const normalizeLogoImage = vi.hoisted(() =>
  vi.fn(async (file: File) => new File([file], 'logo.png', { type: 'image/png' })),
);
// Only the canvas work is stubbed: the accept list and the type check are real.
vi.mock('../../../utils/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/image')>()),
  normalizeLogoImage,
}));

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
const onUpdated = vi.fn();
/** Whether the acting user may manage this organization. */
let mockCanManage = true;
/** The organization the view is a tab of; tests mutate it to add a parent etc. */
let mockOrganization: Entity = { id: 'org-1', name: 'Club' };
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
  useOutletContext: () => ({
    organization: mockOrganization,
    canManage: mockCanManage,
    onUpdated,
  }),
}));

function makeUser(id: string, fields: Partial<User> = {}): User {
  return { ...fields, id, email: fields.email ?? null };
}

/** Whether the acting user is a global admin (Admin / SuperUser). */
let mockIsGlobalAdmin = true;

/**
 * The acting user for these views — a global admin who may grant every role
 * offered, including the right to move the organization to another parent.
 */
function authValue(): AuthContextType {
  const roles: User['roles'] = mockIsGlobalAdmin ? ['Admin'] : ['OrganizationAdmin'];
  return {
    currentUser: makeUser('actor-1', { firstName: 'Ada', lastName: 'Admin', roles }),
    firebaseUser: null,
    initializing: false,
    isAdmin: mockIsGlobalAdmin,
    canCreateEvents: true,
  };
}

const coach = makeUser('coach-1', {
  firstName: 'Casey',
  lastName: 'Coach',
  email: 'casey@example.com',
  roles: ['Coach'],
});
const admin = makeUser('admin-1', {
  firstName: 'Ana',
  lastName: 'Admin',
  email: 'ana@example.com',
  roles: ['OrganizationAdmin'],
});
const tablet = makeUser('tablet-1', {
  firstName: 'Court 1',
  email: 'court1@devices.example.com',
  roles: ['ServiceAccount'],
});
const athlete = makeUser('athlete-1', {
  firstName: 'Ada',
  lastName: 'Athlete',
  email: 'ada@example.com',
  roles: ['Athlete'],
});

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

/** Records the payloads the view PUTs to the entity endpoint. */
const updateEntity = vi.fn(async (_id: string, _data: UpdateEntityRequest) => undefined);
/** Records the logo uploads; tests decide what the refreshed entity is. */
const uploadEntityLogo = vi.fn(async (_id: string, _file: File | Blob) => null as Entity | null);

beforeEach(() => {
  mockCanManage = true;
  mockIsGlobalAdmin = true;
  mockOrganization = { id: 'org-1', name: 'Club' };
  navigate.mockClear();
  onUpdated.mockClear();
  updateEntity.mockClear();
  uploadEntityLogo.mockClear();
  normalizeLogoImage.mockClear();

  useUserStore.setState({
    users: [coach, admin, tablet, athlete],
    loadUsers: vi.fn(async () => undefined),
  });
  useEntityStore.setState({
    entities: [],
    entityUsers: { 'org-1': [] },
    loadEntities: vi.fn(async () => undefined),
    loadEntityUsers: vi.fn(async () => undefined),
    addUserToEntity: vi.fn(async () => true),
    updateEntity,
    deleteEntity: vi.fn(async () => undefined),
    uploadEntityLogo,
    deleteEntityLogo: vi.fn(async () => null),
  });
});

function renderSettings() {
  const view = render(
    <AuthContext.Provider value={authValue()}>
      <SettingsView />
    </AuthContext.Provider>,
  );

  const open = (pickerId: string) => {
    const trigger = document.getElementById(pickerId) as HTMLElement;
    fireEvent.mouseDown(trigger);
    fireEvent.click(trigger);
  };
  return { ...view, open };
}

/** The users listed in the open picker panel. */
const panelNames = () =>
  Array.from(document.querySelectorAll('.vs-option .up-name')).map((el) => el.textContent);

/** The members the staff card lists as already holding the picker's role. */
const rosterNames = (pickerId: string) => {
  const field = document.getElementById(pickerId)?.closest('.rmp-field');
  if (!field) throw new Error(`No staff field for "${pickerId}"`);
  return Array.from(field.querySelectorAll('.rmp-member-name')).map((el) => el.textContent);
};

/** The organizations listed in the open organization picker. */
const orgPanelNames = () =>
  Array.from(document.querySelectorAll('.vs-option .op-name')).map((el) => el.textContent);

/** Enter edit mode on the General card — the only card with an Edit button. */
const startEditing = (view: ReturnType<typeof renderSettings>) =>
  fireEvent.click(view.getByText('Edit'));

describe('SettingsView staff pickers', () => {
  it('gives each staff role its own picker', () => {
    const view = renderSettings();

    expect(view.getByText('Coaches')).toBeDefined();
    expect(view.getByText('Admins')).toBeDefined();
    expect(view.getByText('Service Accounts')).toBeDefined();
    expect(document.getElementById('org-coaches')).not.toBeNull();
    expect(document.getElementById('org-admins')).not.toBeNull();
    expect(document.getElementById('org-service-accounts')).not.toBeNull();
  });

  it('lists the users already given each staff role', () => {
    useEntityStore.setState({ entityUsers: { 'org-1': [coach, admin, tablet, athlete] } });
    renderSettings();

    expect(rosterNames('org-coaches')).toEqual(['Casey Coach']);
    expect(rosterNames('org-admins')).toEqual(['Ana Admin']);
    expect(rosterNames('org-service-accounts')).toEqual(['Court 1']);
    // The athlete is a member but no staff role, so no picker claims them.
    expect(document.querySelectorAll('.rmp-member')).toHaveLength(3);
  });

  it('offers each picker only the users holding its role', () => {
    const view = renderSettings();

    view.open('org-coaches');
    expect(panelNames()).toEqual(['Casey Coach']);

    view.open('org-admins');
    expect(panelNames()).toEqual(['Ana Admin']);

    view.open('org-service-accounts');
    expect(panelNames()).toEqual(['Court 1']);
  });

  it('is admin-only, pickers included', () => {
    mockCanManage = false;
    const view = renderSettings();

    expect(view.getByText('You do not have permission to view this page.')).toBeDefined();
    expect(document.getElementById('org-coaches')).toBeNull();
  });
});

describe('SettingsView parent organization', () => {
  const club: Entity = { id: 'org-1', name: 'Club' };
  const league: Entity = { id: 'org-2', name: 'League' };

  beforeEach(() => {
    useEntityStore.setState({ entities: [club, league] });
  });

  it('lets a global admin re-parent the organization, never onto itself', () => {
    const view = renderSettings();
    startEditing(view);

    expect(document.getElementById('org-parent')).not.toBeNull();

    view.open('org-parent');
    // The organization itself is left out, so it can't be its own parent.
    expect(orgPanelNames()).toEqual(['League']);
  });

  it('names the current parent once editing is closed', () => {
    mockOrganization = { ...club, parentEntityId: league.id };
    const view = renderSettings();

    expect(view.getByText('League')).toBeDefined();
  });

  it('hides the parent field from everyone but a global admin', () => {
    mockIsGlobalAdmin = false;
    mockOrganization = { ...club, parentEntityId: league.id };
    const view = renderSettings();

    expect(view.queryByText('Parent Organization')).toBeNull();
    startEditing(view);
    expect(document.getElementById('org-parent')).toBeNull();
  });

  it('keeps the existing parent when a non-admin saves', async () => {
    mockIsGlobalAdmin = false;
    mockOrganization = { ...club, parentEntityId: league.id };
    const view = renderSettings();
    startEditing(view);

    fireEvent.click(view.getByText('Save Changes'));

    await waitFor(() => expect(updateEntity).toHaveBeenCalledTimes(1));
    expect(updateEntity.mock.calls[0][1]).toMatchObject({ parentEntityId: league.id });
  });

  it('saves the picked parent for a global admin', async () => {
    const view = renderSettings();
    startEditing(view);

    view.open('org-parent');
    const leagueRow = Array.from(document.querySelectorAll('.vs-option')).find((row) =>
      row.textContent?.includes('League'),
    ) as HTMLElement;
    fireEvent.click(leagueRow);

    fireEvent.click(view.getByText('Save Changes'));

    await waitFor(() => expect(updateEntity).toHaveBeenCalledTimes(1));
    expect(updateEntity.mock.calls[0]).toEqual(['org-1', expect.objectContaining({ parentEntityId: league.id })]);
  });
});

describe('SettingsView logo', () => {
  const pickLogo = (view: ReturnType<typeof renderSettings>) => {
    const input = view.container.querySelector('.logo-picker-input') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['binary'], 'logo.png', { type: 'image/png' })] },
    });
  };

  it('uploads a picked logo and hands the refreshed entity to the page', async () => {
    const refreshed: Entity = { id: 'org-1', name: 'Club', logoUrl: '/logos/club.png' };
    uploadEntityLogo.mockResolvedValueOnce(refreshed);
    const view = renderSettings();

    pickLogo(view);

    await waitFor(() => expect(uploadEntityLogo).toHaveBeenCalledTimes(1));
    expect(normalizeLogoImage).toHaveBeenCalledTimes(1);
    expect(uploadEntityLogo.mock.calls[0][0]).toBe('org-1');
    // The squared copy is what gets uploaded, not the original file.
    expect((uploadEntityLogo.mock.calls[0][1] as File).name).toBe('logo.png');
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(refreshed));
  });

  it('reports an image it cannot read', async () => {
    normalizeLogoImage.mockRejectedValueOnce(new Error('bad image'));
    const view = renderSettings();

    pickLogo(view);

    await waitFor(() =>
      expect(view.getByText('Could not read that image. Please try another.')).toBeDefined(),
    );
    expect(uploadEntityLogo).not.toHaveBeenCalled();
  });

  it('refuses a file that is not an image', async () => {
    const view = renderSettings();
    const input = view.container.querySelector('.logo-picker-input') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    });

    expect(uploadEntityLogo).not.toHaveBeenCalled();
    expect(view.getByText('Please choose an image file.')).toBeDefined();
  });

  it('offers a replacement once the entity has a logo', () => {
    mockOrganization = { id: 'org-1', name: 'Club', logoUrl: '/logos/club.png' };
    const view = renderSettings();

    expect(view.getByText('Replace logo')).toBeDefined();
    expect(view.getByText('Remove logo')).toBeDefined();
  });
});
