import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { AuthContext } from '../../contexts/useAuth';
import EventsPage from './EventsPage';
import { MemoryRouter } from 'react-router-dom';
import { clearCache } from '../../utils/pageCache';

// The calendar only needs the paged fetch; everything else it imports is types.
vi.mock('../../api/api.events', () => ({
  fetchEvents: vi.fn(async () => ({ pageNumber: 1, pageSize: 200, totalCount: 0, items: [] })),
}));

// Vitest globals are off, so testing-library's automatic cleanup never registers.
afterEach(cleanup);

beforeEach(() => {
  // Snapshots are module-level and outlive a spec, so each one starts cold.
  clearCache();
  vi.clearAllMocks();
});

function renderEvents() {
  return render(
    <AuthContext.Provider
      value={{
        currentUser: null,
        firebaseUser: null,
        initializing: false,
        isAdmin: false,
        canCreateEvents: false,
      }}
    >
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

/** The spinner only stands in for the calendar while nothing is cached. */
const loadingState = () => screen.queryByText('Loading events...');

describe('EventsPage', () => {
  it('loads the calendar on a cold visit', async () => {
    renderEvents();

    expect(loadingState()).toBeTruthy();
    await waitFor(() => expect(loadingState()).toBeNull());
    expect(screen.getByText('No events yet')).toBeTruthy();
  });

  it('paints the cached calendar straight away on the next visit', async () => {
    const first = renderEvents();
    await waitFor(() => expect(loadingState()).toBeNull());
    first.unmount();

    renderEvents();

    expect(loadingState()).toBeNull();
    expect(screen.getByText('No events yet')).toBeTruthy();
  });
});
