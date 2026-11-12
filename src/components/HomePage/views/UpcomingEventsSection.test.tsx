import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '../../../contexts/useAuth';
import type { Event } from '../../../api/api.events';
import { MemoryRouter } from 'react-router-dom';
import UpcomingEventsSection from './UpcomingEventsSection';
import type { User } from '../../../api/api.users';
import { clearCache } from '../../../utils/pageCache';

const { fetchAllEvents } = vi.hoisted(() => ({ fetchAllEvents: vi.fn() }));

vi.mock('../../../api/api.events', () => ({ fetchAllEvents }));

// Vitest globals are off, so testing-library's automatic cleanup never registers.
afterEach(cleanup);

beforeEach(() => {
  // Snapshots are module-level and outlive a spec, so each one starts cold.
  clearCache();
  fetchAllEvents.mockReset();
  fetchAllEvents.mockResolvedValue([]);
});

const athlete: User = {
  id: 'a1',
  email: 'athlete@example.com',
  firstName: 'Ada',
  lastName: 'Athlete',
};

/** A one-off event `days` from now, lasting an hour. */
function singleEvent(id: string, name: string, days: number, roster = [{ id: 'a1' }]): Event {
  const start = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return {
    id,
    name,
    athletes: roster,
    schedule: {
      id: `${id}-schedule`,
      eventScheduleType: 'Single',
      startDate: start.toISOString(),
      lengthInMinutes: 60,
    },
  };
}

function renderSection() {
  return render(
    <AuthContext.Provider
      value={{
        currentUser: athlete,
        firebaseUser: null,
        initializing: false,
        isAdmin: false,
        canCreateEvents: false,
      }}
    >
      <MemoryRouter>
        <UpcomingEventsSection />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

/** Wait for the fetch to land and its state update to flush. */
async function settle() {
  await waitFor(() => expect(fetchAllEvents).toHaveBeenCalled());
  await act(async () => {});
}

describe('UpcomingEventsSection', () => {
  it('lists an event the user is on the roster for, linked to its detail page', async () => {
    fetchAllEvents.mockResolvedValue([singleEvent('e1', 'Tuesday clinic', 2)]);
    renderSection();

    const link = await screen.findByRole('link', { name: /Tuesday clinic/ });
    expect(link.getAttribute('href')).toBe('/events/e1');
    expect(screen.getByText('Upcoming Events')).toBeTruthy();
  });

  it('shows an organizer’s event too', async () => {
    fetchAllEvents.mockResolvedValue([
      { ...singleEvent('e2', 'Organizer clinic', 3, []), organizers: [{ id: 'a1' }] },
    ]);
    renderSection();

    expect(await screen.findByText('Organizer clinic')).toBeTruthy();
  });

  it('stays hidden when the user is on no roster', async () => {
    fetchAllEvents.mockResolvedValue([singleEvent('e3', 'Someone else’s clinic', 2, [{ id: 'other' }])]);
    renderSection();
    await settle();

    expect(screen.queryByText('Upcoming Events')).toBeNull();
    expect(screen.queryByText('Someone else’s clinic')).toBeNull();
  });

  it('stops at the two-week window', async () => {
    fetchAllEvents.mockResolvedValue([singleEvent('e4', 'Far off clinic', 20)]);
    renderSection();
    await settle();

    expect(screen.queryByText('Upcoming Events')).toBeNull();
    expect(screen.queryByText('Far off clinic')).toBeNull();
  });
});
