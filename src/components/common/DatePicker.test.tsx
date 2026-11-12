import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { DatePicker } from './DatePicker';
import { useState } from 'react';

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

const triggerOf = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('.dp-trigger')!;

const panelEl = () => document.querySelector<HTMLElement>('.dp-panel')!;

const openPicker = (container: HTMLElement) => fireEvent.click(triggerOf(container));

/** Controlled host so the emitted values can be read back after each pick. */
function Controlled({
  initial = '',
  mode,
  minuteStep,
}: {
  initial?: string;
  mode?: 'date' | 'datetime';
  minuteStep?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <DatePicker
        value={value}
        onChange={setValue}
        mode={mode}
        minuteStep={minuteStep}
        clearable
      />
      <output data-testid="value">{value}</output>
    </div>
  );
}

const valueOf = () => screen.getByTestId('value').textContent;

describe('DatePicker', () => {
  it('shows a placeholder until a date is picked', () => {
    const { container } = render(<DatePicker value="" onChange={() => {}} />);

    expect(container.querySelector('.dp-trigger-label')?.textContent).toBe('Select date');
    expect(container.querySelector('.dp-trigger--empty')).not.toBeNull();
  });

  it('renders the picked value in the field', () => {
    const { container } = render(<DatePicker value="2026-10-09" onChange={() => {}} />);

    expect(container.querySelector('.dp-trigger-label')?.textContent).toBe('Oct 9, 2026');
  });

  it('opens on the month of the value and marks the selected day', () => {
    const { container } = render(<DatePicker value="2026-10-09" onChange={() => {}} />);

    openPicker(container);

    const panel = panelEl();
    expect(within(panel).getByRole('button', { name: 'Choose month' }).textContent).toBe(
      'October 2026',
    );
    const selected = within(panel).getByRole('button', { name: '9' });
    expect(selected.className).toContain('dp-day--selected');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
  });

  it('drills from days to months to years through the header', () => {
    const { container } = render(<DatePicker value="2026-10-09" onChange={() => {}} />);

    openPicker(container);

    // Days → months.
    fireEvent.click(within(panelEl()).getByRole('button', { name: 'Choose month' }));
    expect(within(panelEl()).queryByRole('button', { name: '9' })).toBeNull();
    expect(within(panelEl()).getByRole('button', { name: 'Mar' })).toBeTruthy();

    // Months → years.
    fireEvent.click(within(panelEl()).getByRole('button', { name: 'Choose year' }));
    expect(within(panelEl()).getByRole('button', { name: '2016' })).toBeTruthy();
    expect(within(panelEl()).getByRole('button', { name: '2027' })).toBeTruthy();

    // Picking a year lands on its months, and picking a month returns to the days.
    fireEvent.click(within(panelEl()).getByRole('button', { name: '2021' }));
    expect(within(panelEl()).getByRole('button', { name: 'Choose year' }).textContent).toBe('2021');
    fireEvent.click(within(panelEl()).getByRole('button', { name: 'Mar' }));
    expect(within(panelEl()).getByRole('button', { name: 'Choose month' }).textContent).toBe(
      'March 2021',
    );
  });

  it('pages the year picker by twelve years', () => {
    const { container } = render(<DatePicker value="2026-10-09" onChange={() => {}} />);

    openPicker(container);
    fireEvent.click(within(panelEl()).getByRole('button', { name: 'Choose month' }));
    fireEvent.click(within(panelEl()).getByRole('button', { name: 'Choose year' }));
    fireEvent.click(within(panelEl()).getByRole('button', { name: 'Next years' }));

    expect(within(panelEl()).getByRole('button', { name: '2028' })).toBeTruthy();
    expect(within(panelEl()).queryByRole('button', { name: '2016' })).toBeNull();
  });

  it('emits the picked day as YYYY-MM-DD and closes', () => {
    const onChange = vi.fn();
    const { container } = render(<DatePicker value="2026-10-09" onChange={onChange} />);

    openPicker(container);
    fireEvent.click(within(panelEl()).getByRole('button', { name: '15' }));

    expect(onChange).toHaveBeenCalledWith('2026-10-15');
    expect(document.querySelector('.dp-panel')).toBeNull();
  });

  it('disables days outside min/max', () => {
    const { container } = render(
      <DatePicker value="2026-10-10" onChange={() => {}} min="2026-10-05" max="2026-10-20" />,
    );

    openPicker(container);

    const panel = panelEl();
    expect((within(panel).getByRole('button', { name: '4' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((within(panel).getByRole('button', { name: '5' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((within(panel).getByRole('button', { name: '21' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('keeps the panel open in datetime mode and picks the time from the wheels', () => {
    const { container } = render(<Controlled initial="2026-10-09T14:30" mode="datetime" />);

    openPicker(container);
    fireEvent.click(within(panelEl()).getByRole('button', { name: '12' }));

    expect(valueOf()).toBe('2026-10-12T14:30');
    expect(document.querySelector('.dp-panel')).not.toBeNull();

    // The wheel is a 12-hour clock, so 14:30 reads as 2 PM.
    const hourWheel = within(panelEl()).getByRole('listbox', { name: 'Hour' });
    expect(within(hourWheel).getByRole('option', { name: '2' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(panelEl().querySelector('.dp-meridiem')?.textContent).toBe('PM');

    fireEvent.click(within(hourWheel).getByRole('option', { name: '3' }));
    expect(valueOf()).toBe('2026-10-12T15:30');

    const minuteWheel = within(panelEl()).getByRole('listbox', { name: 'Minute' });
    fireEvent.click(within(minuteWheel).getByRole('option', { name: '45' }));
    expect(valueOf()).toBe('2026-10-12T15:45');
  });

  it('spaces the minute wheel by the configured step', () => {
    const { container } = render(
      <Controlled initial="2026-10-09T14:30" mode="datetime" minuteStep={15} />,
    );

    openPicker(container);
    const minuteWheel = within(panelEl()).getByRole('listbox', { name: 'Minute' });
    expect(within(minuteWheel).getAllByRole('option').map((option) => option.textContent)).toEqual([
      '00',
      '15',
      '30',
      '45',
    ]);

    fireEvent.click(within(minuteWheel).getByRole('option', { name: '45' }));
    expect(valueOf()).toBe('2026-10-09T14:45');
  });

  it('keeps a stored off-grid minute visible and selectable', () => {
    const { container } = render(
      <Controlled initial="2026-10-09T14:37" mode="datetime" minuteStep={15} />,
    );

    openPicker(container);
    const minuteWheel = within(panelEl()).getByRole('listbox', { name: 'Minute' });
    expect(
      within(minuteWheel).getByRole('option', { name: '37' }).getAttribute('aria-selected'),
    ).toBe('true');

    fireEvent.click(within(minuteWheel).getByRole('option', { name: '45' }));
    expect(valueOf()).toBe('2026-10-09T14:45');
  });

  it('flips AM and PM as the hour wheel rolls through 12', () => {
    const { container } = render(<Controlled initial="2026-10-09T14:30" mode="datetime" />);

    openPicker(container);
    const hourWheel = within(panelEl()).getByRole('listbox', { name: 'Hour' });

    // Three rows back from 2 PM is 11 AM — across the meridiem.
    fireEvent.click(within(hourWheel).getByRole('option', { name: '11' }));
    expect(valueOf()).toBe('2026-10-09T11:30');
    expect(panelEl().querySelector('.dp-meridiem')?.textContent).toBe('AM');

    // And one row on from 11 AM is noon.
    fireEvent.click(within(hourWheel).getByRole('option', { name: '12' }));
    expect(valueOf()).toBe('2026-10-09T12:30');
    expect(panelEl().querySelector('.dp-meridiem')?.textContent).toBe('PM');
  });

  it('keeps scrolling past its ends and flips the meridiem on the way', async () => {
    const { container } = render(<Controlled initial="2026-10-09T14:30" mode="datetime" />);

    openPicker(container);
    const hourWheel = within(panelEl()).getByRole('listbox', { name: 'Hour' });

    // Parked on 2 PM (row 13, scrolled to (13 - 1) rows); ten rows on is midnight.
    hourWheel.scrollTop = (13 + 10 - 1) * 32;
    fireEvent.scroll(hourWheel);

    await waitFor(() => expect(valueOf()).toBe('2026-10-09T00:30'));
    expect(panelEl().querySelector('.dp-meridiem')?.textContent).toBe('AM');
  });

  it('clears the value from the footer action', () => {
    const { container } = render(<Controlled initial="2026-10-09" />);

    openPicker(container);
    fireEvent.click(within(panelEl()).getByRole('button', { name: 'Clear' }));

    expect(valueOf()).toBe('');
    expect(document.querySelector('.dp-panel')).toBeNull();
  });

  it('clears the value from the field control', () => {
    const { container } = render(<Controlled initial="2026-10-09" />);

    fireEvent.click(container.querySelector('.dp-clear')!);

    expect(valueOf()).toBe('');
  });

  it('opens from the keyboard and closes on Escape', () => {
    const { container } = render(<DatePicker value="2026-10-09" onChange={() => {}} />);

    fireEvent.keyDown(triggerOf(container), { key: 'ArrowDown' });
    expect(within(panelEl()).getByRole('button', { name: 'Choose month' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('.dp-panel')).toBeNull();
  });
});
