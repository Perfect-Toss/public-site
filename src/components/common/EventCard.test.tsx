import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { EventCard } from './EventCard';
import type { IEventOccurrence } from '../../utils/events';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from './Snackbar';

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

const renderCard = (occurrence: IEventOccurrence) =>
  render(
    <SnackbarProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<EventCard occurrence={occurrence} dayLabel="Today" />} />
          <Route path="/events/:id" element={<p>event page</p>} />
        </Routes>
      </MemoryRouter>
    </SnackbarProvider>,
  );

/** A one-hour occurrence of `event`. */
const occurrenceOf = (event: IEventOccurrence['event']): IEventOccurrence => ({
  id: 'occ-1',
  start: new Date('2026-11-12T18:00:00'),
  end: new Date('2026-11-12T19:00:00'),
  event,
});

describe('EventCard', () => {
  it('shows the day, name and first tag, and opens the event', () => {
    const view = renderCard(
      occurrenceOf({
        id: 'e1',
        name: 'Serve clinic',
        tags: [
          { id: 't1', name: 'Serve' },
          { id: 't2', name: 'Technique' },
        ],
      }),
    );

    expect(view.getByText('Today')).toBeDefined();
    expect(view.getByText('Serve clinic')).toBeDefined();
    expect(view.getByText('Serve')).toBeDefined();
    // Only the first tag is shown.
    expect(view.queryByText('Technique')).toBeNull();

    fireEvent.click(view.getByRole('button', { name: 'Open event Serve clinic' }));
    expect(view.getByText('event page')).toBeTruthy();
  });

  it('lists organizers with the PRO marker and the athlete count', () => {
    const view = renderCard(
      occurrenceOf({
        id: 'e1',
        name: 'Serve clinic',
        athletes: [{ id: 'a1' }, { id: 'a2' }],
        organizers: [{ id: 'o1', firstName: 'Ada', lastName: 'Athlete' }],
      }),
    );

    expect(view.getByText('Ada Athlete')).toBeDefined();
    expect(view.getByText('PRO')).toBeDefined();
    expect(view.getByText('2 athletes')).toBeDefined();
  });

  it('skips the organization block when neither org nor venue is set', () => {
    const view = renderCard(occurrenceOf({ id: 'e1', name: 'Serve clinic' }));

    // No empty reserved row, and no stray icons.
    expect(view.container.querySelector('.event-card-meta')).toBeNull();
  });

  it('shows organization and venue when they exist', () => {
    const view = renderCard(
      occurrenceOf({
        id: 'e1',
        name: 'Serve clinic',
        organization: { id: 'org-1', name: 'Perfect Toss' },
        location: 'Court 3',
      }),
    );

    expect(view.getByText('Perfect Toss')).toBeDefined();
    expect(view.getByText('Court 3')).toBeDefined();
  });
});
