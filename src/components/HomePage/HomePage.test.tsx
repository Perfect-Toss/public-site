import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AuthContext } from '../../contexts/useAuth';
import HomePage from './HomePage';

// Build metadata is injected by Vite and sign-out goes through Firebase; neither
// is available (or wanted) here.
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

vi.mock('../../firebase/auth', () => ({
  logout: vi.fn(async () => ({ success: true })),
}));

// Vitest globals are off, so testing-library's automatic cleanup never registers.
afterEach(cleanup);

function renderShell({ initialPath = '/', isAdmin = false } = {}) {
  return render(
    <AuthContext.Provider
      value={{
        currentUser: null,
        firebaseUser: null,
        initializing: false,
        isAdmin,
        canCreateEvents: false,
      }}
    >
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<HomePage />}>
            <Route index element={<div>home outlet</div>} />
            <Route path="videos" element={<div>videos outlet</div>} />
            <Route path="account" element={<div>account outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

/** The sheet is always mounted — "open" is a class flip styled by CSS. */
function sheetOf(view: ReturnType<typeof render>) {
  return view.container.querySelector('.mobile-sheet') as HTMLElement;
}

function openSheet(view: ReturnType<typeof render>) {
  fireEvent.click(screen.getByRole('button', { name: 'More' }));
  return withSheet(sheetOf(view));
}

/** Scopes queries to the sheet, since the sidebar renders the same links. */
function withSheet(sheet: HTMLElement) {
  return within(sheet);
}

describe('mobile shell', () => {
  it('pins the four primary destinations to the tab bar', () => {
    renderShell();

    const tabbar = screen.getByRole('navigation', { name: 'Primary' });
    const tabs = within(tabbar).getAllByRole('link');

    expect(tabs.map((tab) => [tab.textContent, tab.getAttribute('href')])).toEqual([
      ['Home', '/'],
      ['Orgs', '/organizations'],
      ['Events', '/events'],
      ['Videos', '/videos'],
    ]);
    expect(within(tabbar).getByRole('button', { name: 'More' })).toBeTruthy();
  });

  it('keeps the more sheet closed until the more tab is used', () => {
    const view = renderShell();
    const more = screen.getByRole('button', { name: 'More' });

    expect(sheetOf(view).className).not.toContain('open');
    expect(more.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(more);

    expect(sheetOf(view).className).toContain('open');
    expect(more.getAttribute('aria-expanded')).toBe('true');
  });

  it('holds the page still while the sheet is open', () => {
    const view = renderShell();

    expect(document.body.style.overflow).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(sheetOf(view).className).not.toContain('open');
    expect(document.body.style.overflow).toBe('');
  });

  it('closes the sheet when a tab navigates', async () => {
    const view = renderShell();

    openSheet(view);
    fireEvent.click(screen.getByRole('link', { name: 'Videos' }));

    await waitFor(() => expect(sheetOf(view).className).not.toContain('open'));
    expect(screen.getByText('videos outlet')).toBeTruthy();
  });

  it('marks the more tab active for routes outside the tab bar', () => {
    renderShell({ initialPath: '/account' });

    expect(screen.getByRole('button', { name: 'More' }).className).toContain('active');
  });

  it('leaves the more tab inactive on a tab bar route', () => {
    renderShell({ initialPath: '/videos' });

    expect(screen.getByRole('button', { name: 'More' }).className).not.toContain('active');
  });

  it('lists the admin section in the sheet for admins', () => {
    const view = renderShell({ isAdmin: true });
    const sheet = openSheet(view);

    expect(sheet.getByRole('link', { name: 'DASHBOARD' }).getAttribute('href')).toBe(
      '/admin/dashboard',
    );
    expect(sheet.getByRole('link', { name: 'USERS' }).getAttribute('href')).toBe('/admin/users');
    // Everything the sidebar holds is reachable from the sheet.
    expect(sheet.getByRole('link', { name: 'ACCOUNT' }).getAttribute('href')).toBe('/account');
    expect(sheet.getByRole('button', { name: 'LOGOUT' })).toBeTruthy();
    expect(sheet.getByText('v1.2.3 · abcdef1 · test')).toBeTruthy();
  });

  it('omits the admin section in the sheet for non-admins', () => {
    const view = renderShell();
    const sheet = openSheet(view);

    expect(sheet.queryByRole('link', { name: 'DASHBOARD' })).toBeNull();
    expect(sheet.getByRole('link', { name: 'ACCOUNT' })).toBeTruthy();
  });
});
