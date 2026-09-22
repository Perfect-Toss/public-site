import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import SettingsView from './SettingsView';
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
    onUpdated: vi.fn(),
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

beforeEach(() => {
  mockIsAdmin = true;
  navigate.mockClear();

  useUserStore.setState({
    users: [coach, admin, tablet, athlete],
    loadUsers: vi.fn(async () => undefined),
  });
  useEntityStore.setState({
    entityUsers: { 'org-1': [] },
    loadEntityUsers: vi.fn(async () => undefined),
    addUserToEntity: vi.fn(async () => true),
    updateEntity: vi.fn(async () => undefined),
    deleteEntity: vi.fn(async () => undefined),
  });
});

function renderSettings() {
  const view = render(<SettingsView />);

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
    mockIsAdmin = false;
    const view = renderSettings();

    expect(view.getByText('You do not have permission to view this page.')).toBeDefined();
    expect(document.getElementById('org-coaches')).toBeNull();
  });
});
