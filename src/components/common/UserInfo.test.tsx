import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthContext, type AuthContextType } from '../../contexts/useAuth';
import { SnackbarProvider } from './Snackbar';
import { UserInfo } from './UserInfo';

const fetchUserById = vi.hoisted(() => vi.fn());
vi.mock('../../api/api.users', () => ({ fetchUserById }));

beforeEach(() => {
  fetchUserById.mockReset();
  fetchUserById.mockResolvedValue(null);
});

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

const ada = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  thumbnailUrl: null,
};

const renderInfo = (ui: ReactNode) => render(<SnackbarProvider>{ui}</SnackbarProvider>);

const adminAuth: AuthContextType = {
  currentUser: null,
  firebaseUser: null,
  initializing: false,
  isAdmin: true,
  canCreateEvents: true,
};

/** The chip is the pressable element that opens the card. */
const chip = (container: HTMLElement) => container.querySelector('.user-info') as HTMLButtonElement;

describe('UserInfo', () => {
  it('shows the display name, falling back to the email', () => {
    const { container } = renderInfo(<UserInfo user={ada} />);
    expect(container.querySelector('.user-info-name')?.textContent).toBe('Ada Lovelace');

    cleanup();

    const fallback = renderInfo(<UserInfo user={{ email: 'solo@example.com' }} />);
    expect(fallback.container.querySelector('.user-info-name')?.textContent).toBe('solo@example.com');
  });

  it('renders the email next to the name only when asked', () => {
    const plain = renderInfo(<UserInfo user={ada} />);
    expect(plain.container.querySelector('.user-info-email')).toBeNull();

    cleanup();

    const withEmail = renderInfo(<UserInfo user={ada} showEmail />);
    expect(withEmail.container.querySelector('.user-info-email')?.textContent).toBe('ada@example.com');
  });

  it('puts the supertext above the name', () => {
    const { container } = renderInfo(<UserInfo user={ada} supertext="Crew lead" />);

    const text = container.querySelector('.user-info-text') as HTMLElement;
    const order = Array.from(text.children).map((child) => child.className);

    expect(order).toEqual(['user-info-supertext', 'user-info-lines']);
    expect(container.querySelector('.user-info-supertext')?.textContent).toBe('Crew lead');
  });

  it('opens a card with the avatar, name and email on click', () => {
    const { container } = renderInfo(<UserInfo user={ada} />);

    fireEvent.click(chip(container));

    const card = screen.getByRole('tooltip');
    expect(card.querySelector('.user-avatar')).not.toBeNull();
    expect(card.querySelector('.user-info-card-name')?.textContent).toBe('Ada Lovelace');
    expect(card.querySelector('.user-info-card-email')?.textContent).toBe('ada@example.com');
  });

  it('dismisses the card on Escape, on an outside click, and on a second click', () => {
    const { container } = renderInfo(<UserInfo user={ada} />);
    const open = () => fireEvent.click(chip(container));

    open();
    expect(screen.queryByRole('tooltip')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();

    open();
    expect(screen.queryByRole('tooltip')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();

    open();
    expect(screen.queryByRole('tooltip')).toBeTruthy();
    open();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('lets a caller replace the card with its own click handler', () => {
    const onClick = vi.fn();
    const { container } = renderInfo(<UserInfo user={ada} onClick={onClick} />);

    fireEvent.click(chip(container));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps the click off a clickable row underneath', () => {
    const onRowClick = vi.fn();
    const { container } = renderInfo(
      <div onClick={onRowClick}>
        <UserInfo user={ada} />
      </div>,
    );

    fireEvent.click(chip(container));

    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('keeps a click on the card itself off a clickable row underneath', () => {
    const onRowClick = vi.fn();
    const { container } = renderInfo(
      <div onClick={onRowClick}>
        <UserInfo user={ada} />
      </div>,
    );

    fireEvent.click(chip(container));
    // Reading the open card must not run the row's action (it navigates).
    fireEvent.click(screen.getByRole('tooltip'));

    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('opens the card only after resting on the chip', async () => {
    const { container } = renderInfo(<UserInfo user={ada} />);

    fireEvent.mouseEnter(chip(container));
    // A quick pass across a list must not flash the card.
    expect(screen.queryByRole('tooltip')).toBeNull();

    await waitFor(() => expect(screen.getByRole('tooltip')).toBeTruthy());
  });

  it('anchors the card to the name, not to a chip stretched across a row', async () => {
    const { container } = renderInfo(<UserInfo user={ada} />);
    const button = chip(container);
    const text = container.querySelector('.user-info-text') as HTMLElement;

    // The access list makes the chip fill its row (`.access-item > .user-info`),
    // so centring on the button would put the card in the middle of the row.
    button.getBoundingClientRect = () =>
      ({ left: 0, top: 100, width: 800, height: 40, right: 800, bottom: 140 }) as DOMRect;
    text.getBoundingClientRect = () =>
      ({ left: 300, top: 100, width: 120, height: 20, right: 420, bottom: 120 }) as DOMRect;

    fireEvent.mouseEnter(button);

    const card = await screen.findByRole('tooltip');
    // 300 + 60 \u2212 124 = 236, i.e. centred on the name (the button's middle is 400).
    await waitFor(() => expect(card.style.left).toBe('236px'));
    expect(card.style.top).toBe('128px');
  });

  it('still copies "email <name>" on right click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { container } = renderInfo(<UserInfo user={ada} />);
    fireEvent.contextMenu(chip(container));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ada@example.com <Ada Lovelace>'));
    expect(screen.getByRole('status').textContent).toBe(
      'Copied "ada@example.com <Ada Lovelace>" to clipboard',
    );

    // Leave no clipboard stub behind for later tests.
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('is not pressable when there is nothing to show or do', () => {
    const { container } = renderInfo(<UserInfo user={{}} />);

    expect(chip(container).disabled).toBe(true);
    fireEvent.click(chip(container));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('omits the avatar and the email row on request', () => {
    const { container } = renderInfo(<UserInfo user={{ email: 'solo@example.com' }} showAvatar={false} />);

    expect(container.querySelector('.user-avatar')).toBeNull();
    fireEvent.click(chip(container));
    expect(screen.getByRole('tooltip').querySelector('.user-info-card-email')?.textContent).toBe(
      'solo@example.com',
    );
  });

  it('shows the profile facts the user has filled in', () => {
    const { container } = renderInfo(
      <UserInfo user={{ ...ada, ustaRating: 4.5, heightInInches: 74, handedness: 'Left' }} />,
    );

    fireEvent.click(chip(container));

    const facts = Array.from(document.querySelectorAll('.user-info-card-fact')).map(
      (el) => el.textContent,
    );
    expect(facts).toEqual(['USTA rating4.5', 'Height6′ 2″', 'PlaysLeft']);
  });

  it('leaves the facts out when the profile carries none', () => {
    const { container } = renderInfo(<UserInfo user={ada} />);

    fireEvent.click(chip(container));

    expect(document.querySelectorAll('.user-info-card-fact')).toHaveLength(0);
  });

  it('opens the user profile from the card for an admin', () => {
    render(
      <SnackbarProvider>
        <AuthContext.Provider value={adminAuth}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<UserInfo user={{ ...ada, id: 'u1' }} />} />
              <Route path="/admin/users/:id" element={<p>profile page</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </SnackbarProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View Ada Lovelace' }));
    fireEvent.click(screen.getByRole('link'));

    expect(screen.getByText('profile page')).toBeTruthy();
  });

  it('offers no profile link to a viewer who cannot open one', () => {
    const { container } = renderInfo(<UserInfo user={{ ...ada, id: 'u1' }} />);

    fireEvent.click(chip(container));

    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('fills the popup in from the account of a viewer who may read it', async () => {
    fetchUserById.mockResolvedValue({
      id: 'u9',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      ustaRating: 4.5,
      heightInInches: 74,
      handedness: 'Left',
    });

    // A chip fed only a slim user reference — a video owner, say.
    render(
      <SnackbarProvider>
        <AuthContext.Provider value={adminAuth}>
          <MemoryRouter>
            <UserInfo user={{ firstName: 'Ada', lastName: 'Lovelace', id: 'u9' }} />
          </MemoryRouter>
        </AuthContext.Provider>
      </SnackbarProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View Ada Lovelace' }));

    await waitFor(() =>
      expect(document.querySelectorAll('.user-info-card-fact')).toHaveLength(3),
    );
    expect(fetchUserById).toHaveBeenCalledWith('u9');
    expect(screen.getByRole('tooltip').textContent).toContain('USTA rating4.5');
  });

  it('reads no account for a viewer who may not see one', () => {
    const { container } = renderInfo(<UserInfo user={{ ...ada, id: 'u8' }} />);

    fireEvent.click(chip(container));

    expect(fetchUserById).not.toHaveBeenCalled();
  });

  it('reuses the account another chip of the same person already read', async () => {
    fetchUserById.mockResolvedValue({
      id: 'u7',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      ustaRating: 4.5,
      heightInInches: 74,
      handedness: 'Left',
    });

    render(
      <SnackbarProvider>
        <AuthContext.Provider value={adminAuth}>
          <MemoryRouter>
            <UserInfo user={{ firstName: 'Ada', lastName: 'Lovelace', id: 'u7' }} />
            <UserInfo user={{ firstName: 'Ada', lastName: 'Lovelace', id: 'u7' }} />
          </MemoryRouter>
        </AuthContext.Provider>
      </SnackbarProvider>,
    );

    const chips = screen.getAllByRole('button', { name: 'View Ada Lovelace' });

    fireEvent.click(chips[0]);
    await waitFor(() => expect(document.querySelectorAll('.user-info-card-fact')).toHaveLength(3));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();

    // The second chip mounted before that read landed; it must still get it.
    fireEvent.click(chips[1]);
    await waitFor(() => expect(document.querySelectorAll('.user-info-card-fact')).toHaveLength(3));
    expect(fetchUserById).toHaveBeenCalledTimes(1);
  });
});
