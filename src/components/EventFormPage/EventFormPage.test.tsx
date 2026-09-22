import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import { AuthContext } from '../../contexts/useAuth';
import EventFormPage from './EventFormPage';
import type { User } from '../../api/api.users';

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

const members: User[] = [
  {
    id: 'grace',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@example.com',
    roles: ['Athlete'],
  },
  { id: 'ada', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', roles: ['Coach'] },
];

// Only the calls the page makes are stubbed; the rest of each module stays real
// so the stores can import everything they expect.
vi.mock('../../api/api.entities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/api.entities')>()),
  fetchAllEntities: vi.fn(async () => [{ id: 'org-1', name: 'Club' }]),
  fetchEntityUsers: vi.fn(async () => members),
}));

const createEvent = vi.fn(async (_request: Record<string, unknown>) => ({}));
vi.mock('../../api/api.events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/api.events')>()),
  createEvent: (...args: Parameters<typeof createEvent>) => createEvent(...args),
}));

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(() => {
  cleanup();
  createEvent.mockClear();
});

/** The page only renders once the organization's members have loaded. */
async function renderCreateForm() {
  const view = render(
    <AuthContext.Provider
      value={{
        currentUser: null,
        firebaseUser: null,
        initializing: false,
        isAdmin: true,
        canCreateEvents: true,
      }}
    >
      <MemoryRouter initialEntries={['/events/new?organizationId=org-1']}>
        <Routes>
          <Route path="/events/new" element={<EventFormPage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  await waitFor(() => expect(document.getElementById('event-athletes')).not.toBeNull());
  return view;
}

/** The rendered option row whose text contains `text`, wherever the panel portals to. */
const optionWith = (text: string) => {
  const option = Array.from(document.body.querySelectorAll('.vs-option')).find((el) =>
    el.textContent?.includes(text),
  );
  if (!option) throw new Error(`No option matching "${text}"`);
  return option;
};

/**
 * Open a picker and choose someone. The mousedown is part of a real click and is
 * what closes a picker that is still open, so the option is found in this panel.
 */
const pick = (pickerId: string, name: string) => {
  const trigger = document.getElementById(pickerId) as HTMLElement;
  fireEvent.mouseDown(trigger);
  fireEvent.click(trigger);
  fireEvent.click(optionWith(name));
};

/** The users listed in the open picker panel. */
const openPanelNames = () =>
  Array.from(document.querySelectorAll('.vs-option .up-name')).map((el) => el.textContent);

/** Open a picker's panel without choosing anything. */
const open = (pickerId: string) => {
  const trigger = document.getElementById(pickerId) as HTMLElement;
  fireEvent.mouseDown(trigger);
  fireEvent.click(trigger);
};

describe('EventFormPage roster', () => {
  it('labels the athlete and organizer pickers', async () => {
    const view = await renderCreateForm();

    expect(view.getByLabelText('Athletes')).toBe(document.getElementById('event-athletes'));
    expect(view.getByLabelText('Organizers')).toBe(document.getElementById('event-organizers'));
  });

  it('offers only athletes as athletes', async () => {
    await renderCreateForm();

    open('event-athletes');

    expect(openPanelNames()).toEqual(['Grace Hopper']);
  });

  it('offers only coaches as organizers', async () => {
    await renderCreateForm();

    open('event-organizers');

    expect(openPanelNames()).toEqual(['Ada Lovelace']);
  });

  it('collects athletes into the picker without touching the organizers', async () => {
    await renderCreateForm();

    pick('event-athletes', 'Grace Hopper');

    const athletes = document.getElementById('event-athletes') as HTMLElement;
    const organizers = document.getElementById('event-organizers') as HTMLElement;
    expect(
      Array.from(athletes.querySelectorAll('.up-pill-label')).map((el) => el.textContent),
    ).toEqual(['Grace Hopper']);
    expect(organizers.querySelector('.vs-trigger-label')?.textContent).toBe('Add organizers');
  });

  it('sends the picked athletes and organizers with the new event', async () => {
    await renderCreateForm();

    fireEvent.change(document.getElementById('event-name') as HTMLElement, {
      target: { value: 'Autumn Cup' },
    });
    pick('event-athletes', 'Grace Hopper');
    pick('event-organizers', 'Ada Lovelace');
    fireEvent.click(document.querySelector('.submit-btn') as HTMLElement);

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0][0]).toMatchObject({
      organizationId: 'org-1',
      name: 'Autumn Cup',
      athleteIds: ['grace'],
      organizerIds: ['ada'],
    });
  });
});
