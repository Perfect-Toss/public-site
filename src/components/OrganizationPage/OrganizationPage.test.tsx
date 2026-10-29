import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

import { AuthContext, type AuthContextType } from '../../contexts/useAuth';
import OrganizationPage from './OrganizationPage';
import type { User } from '../../api/api.users';
import type { Entity } from '../../api/api.entities';
import { useEntityStore } from '../../stores/entityStore';

/** The roles the acting user holds on the organization. */
const fetchEntityUserRoles = vi.fn(async (): Promise<string[]> => []);

// Only the role lookup is stubbed; the rest of the module stays real so the
// stores can import everything they expect.
vi.mock('../../api/api.entities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/api.entities')>()),
  fetchEntityUserRoles: (...args: Parameters<typeof fetchEntityUserRoles>) =>
    fetchEntityUserRoles(...args),
}));

const organization: Entity = { id: 'org-1', name: 'Club' };

function makeUser(id: string, roles: User['roles']): User {
  return { id, email: `${id}@example.com`, roles };
}

function authValue(user: User): AuthContextType {
  const isAdmin = (user.roles ?? []).some((role) => role === 'Admin' || role === 'SuperUser');
  return {
    currentUser: user,
    firebaseUser: null,
    initializing: false,
    isAdmin,
    canCreateEvents: isAdmin,
  };
}

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

beforeEach(() => {
  fetchEntityUserRoles.mockClear();
  fetchEntityUserRoles.mockResolvedValue([]);

  useEntityStore.setState({
    entities: [organization],
    entityMap: { root: [organization] },
    loadEntities: vi.fn(async () => undefined),
    loadEntityById: vi.fn(async () => organization),
  });
});

/** Renders the organization page with its first tab's outlet. */
function renderPage(user: User) {
  return render(
    <AuthContext.Provider value={authValue(user)}>
      <MemoryRouter initialEntries={['/organizations/org-1']}>
        <Routes>
          <Route path="/organizations/:id" element={<OrganizationPage />}>
            <Route index element={<div>Overview tab</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

/**
 * The tab labels on screen. The page holds back every tab until the permission
 * check has settled, so the first tab appearing means the set is final.
 */
async function tabLabels() {
  await waitFor(() =>
    expect(document.querySelectorAll('.org-tab').length).toBeGreaterThan(0),
  );
  return Array.from(document.querySelectorAll('.org-tab')).map((tab) =>
    tab.textContent?.trim(),
  );
}

describe('OrganizationPage tabs', () => {
  it('offers only the read-only tabs to an athlete', async () => {
    renderPage(makeUser('athlete-1', ['Athlete']));

    expect(await tabLabels()).toEqual([
      'Overview',
      'Sub-Organizations',
      'Events',
      'Event Instances',
    ]);
    expect(fetchEntityUserRoles).toHaveBeenCalledWith('org-1', 'athlete-1');
  });

  it('offers every tab to a global admin', async () => {
    renderPage(makeUser('admin-1', ['Admin']));

    const labels = await tabLabels();
    expect(labels).toContain('Members');
    expect(labels).toContain('Settings');
    // A global role needs no organization lookup.
    expect(fetchEntityUserRoles).not.toHaveBeenCalled();
  });

  it('offers every tab to the organization admin', async () => {
    fetchEntityUserRoles.mockResolvedValue(['OrganizationAdmin']);
    renderPage(makeUser('org-admin-1', ['Athlete']));

    const labels = await tabLabels();
    expect(labels).toContain('Members');
    expect(labels).toContain('Settings');
  });

  it('keeps the Members and Settings tabs off the screen for a coach', async () => {
    fetchEntityUserRoles.mockResolvedValue(['Coach']);
    renderPage(makeUser('coach-1', ['Coach']));

    const labels = await tabLabels();
    expect(labels).not.toContain('Members');
    expect(labels).not.toContain('Settings');
  });
});
