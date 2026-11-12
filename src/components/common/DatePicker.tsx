import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import './DatePicker.css';

export type DatePickerMode = 'date' | 'datetime';

export interface DatePickerProps {
  id?: string;
  /** Controlled value: `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` in datetime mode. */
  value: string;
  /** Called with the new value in the same format as `value`. */
  onChange: (value: string) => void;
  /** `date` (default) drops the time-of-day controls. */
  mode?: DatePickerMode;
  disabled?: boolean;
  /** Spacing of the minute rows, in minutes (default 1). */
  minuteStep?: number;
  /** Earliest selectable day (`YYYY-MM-DD`). */
  min?: string;
  /** Latest selectable day (`YYYY-MM-DD`). */
  max?: string;
  placeholder?: string;
  /** Renders a control that clears the value. */
  clearable?: boolean;
  className?: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Row height of a time wheel, mirrored by `--dp-wheel-item` in the stylesheet. */
const WHEEL_ITEM_HEIGHT = 32;
/** Rows are drawn three times so a wheel can keep scrolling past its ends. */
const WHEEL_COPIES = 3;

const PANEL_WIDTH = 292;
const PANEL_GAP = 6;
const VIEWPORT_MARGIN = 8;

interface IDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const pad = (value: number) => String(value).padStart(2, '0');

const HOUR_LABELS = Array.from({ length: 12 }, (_, index) => String(index + 1));

/** Read `YYYY-MM-DD[THH:mm[:ss]]` — optionally suffixed by a zone — into parts. */
function parseValue(value: string): IDateParts | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return {
    year: Number(match[1]),
    month,
    day,
    hour: match[4] ? Number(match[4]) : 0,
    minute: match[5] ? Number(match[5]) : 0,
  };
}

function toDayValue(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function toFieldValue(parts: IDateParts, mode: DatePickerMode): string {
  const day = toDayValue(parts.year, parts.month, parts.day);
  return mode === 'datetime' ? `${day}T${pad(parts.hour)}:${pad(parts.minute)}` : day;
}

function formatDisplay(parts: IDateParts, mode: DatePickerMode): string {
  const day = `${MONTHS_SHORT[parts.month - 1]} ${parts.day}, ${parts.year}`;
  if (mode === 'date') return day;
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  return `${day} · ${hour12}:${pad(parts.minute)} ${parts.hour < 12 ? 'AM' : 'PM'}`;
}

function nowParts(): IDateParts {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

/** 24-hour → 1–12. */
function toHour12(hour: number): number {
  return hour % 12 === 0 ? 12 : hour % 12;
}

function mod(value: number, count: number): number {
  return ((value % count) + count) % count;
}

/** Scroll offset that parks `row` in the middle of a three-row wheel. */
function wheelScrollTop(row: number): number {
  return (row - 1) * WHEEL_ITEM_HEIGHT;
}

/** The row sitting in the middle of a three-row wheel at a scroll offset. */
function wheelRow(scrollTop: number): number {
  return Math.round(scrollTop / WHEEL_ITEM_HEIGHT) + 1;
}

/** Rows to travel from one item to another, taking the shorter way round. */
function shortestSteps(fromIndex: number, toIndex: number, count: number): number {
  let steps = toIndex - fromIndex;
  if (steps > count / 2) steps -= count;
  if (steps < -count / 2) steps += count;
  return steps;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Day cells for a month, Sunday-first, padded to whole weeks with `null`s. */
function monthCells(year: number, month: number): (number | null)[] {
  const offset = new Date(year, month - 1, 1).getDay();
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= total; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * One wheel of the time picker. It renders its rows three times and recentres
 * into the middle copy after every stop, so scrolling never hits an end. It
 * reports the signed number of rows the user moved — the owner decides what
 * that means, which is how the hour wheel can run past 12 and flip AM/PM.
 */
function TimeWheel({
  label,
  labels,
  index,
  onStep,
}: {
  label: string;
  labels: readonly string[];
  index: number;
  onStep: (steps: number) => void;
}) {
  const count = labels.length;
  const columnRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  /** Virtual row the wheel is parked on, always inside the middle copy. */
  const position = useRef<number | null>(null);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // Follow the owner's value: park in the middle copy on mount, then travel the
  // shortest way round.
  useEffect(() => {
    const column = columnRef.current;
    if (!column) return;
    const row =
      position.current === null
        ? count + index
        : position.current + shortestSteps(mod(position.current, count), index, count);
    position.current = row;
    const top = wheelScrollTop(row);
    if (Math.abs(column.scrollTop - top) > 1) column.scrollTop = top;
  }, [index, count]);

  const settle = () => {
    const column = columnRef.current;
    if (!column || position.current === null) return;
    const row = wheelRow(column.scrollTop);
    const steps = row - position.current;
    // Recentre on the same row inside the middle copy: the rows on screen do
    // not move, so the wheel appears to keep going.
    const centered = count + mod(row, count);
    position.current = centered;
    const top = wheelScrollTop(centered);
    if (Math.abs(column.scrollTop - top) > 1) column.scrollTop = top;
    if (steps !== 0) onStep(steps);
  };

  const handleScroll = () => {
    window.clearTimeout(settleTimer.current);
    // Commit once the wheel stops, so a flick reports one distance.
    settleTimer.current = window.setTimeout(settle, 90);
  };

  const pick = (itemIndex: number) => {
    if (position.current === null) return;
    const steps = shortestSteps(mod(position.current, count), itemIndex, count);
    position.current = count + itemIndex;
    const column = columnRef.current;
    const top = wheelScrollTop(position.current);
    if (column && Math.abs(column.scrollTop - top) > 1) column.scrollTop = top;
    if (steps !== 0) onStep(steps);
  };

  return (
    <div
      ref={columnRef}
      className="dp-wheel-col"
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        onStep(event.key === 'ArrowUp' ? -1 : 1);
      }}
    >
      {Array.from({ length: WHEEL_COPIES }, (_, copy) => (
        <div key={copy} className="dp-wheel-copy" aria-hidden={copy === 1 ? undefined : true}>
          {labels.map((text, itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              role="option"
              aria-selected={itemIndex === index}
              tabIndex={-1}
              className={`dp-wheel-item${itemIndex === index ? ' dp-wheel-item--selected' : ''}`}
              onClick={() => pick(itemIndex)}
            >
              {text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Material-style date / date-and-time field: an outlined trigger that opens a
 * calendar popup. The value is kept in the same wire format as the native
 * date inputs it replaces (`YYYY-MM-DD` / `YYYY-MM-DDTHH:mm`), so owners keep
 * owning their own state and payloads.
 */
export function DatePicker({
  id,
  value,
  onChange,
  mode = 'date',
  disabled,
  minuteStep = 1,
  min,
  max,
  placeholder,
  clearable,
  className,
}: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const keyboardNav = useRef(false);

  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const [view, setView] = useState(() => {
    const base = parseValue(value) ?? nowParts();
    return { year: base.year, month: base.month };
  });
  const [picking, setPicking] = useState<'days' | 'months' | 'years'>('days');
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  const selected = useMemo(() => parseValue(value), [value]);
  const minDay = min?.slice(0, 10) ?? '';
  const maxDay = max?.slice(0, 10) ?? '';
  const step = Math.min(60, Math.max(1, Math.round(minuteStep)));

  /** Minute rows; a stored minute off the step grid is kept so it stays visible. */
  const minuteOptions: number[] = [];
  for (let minute = 0; minute < 60; minute += step) minuteOptions.push(minute);
  if (selected && !minuteOptions.includes(selected.minute)) {
    minuteOptions.push(selected.minute);
    minuteOptions.sort((a, b) => a - b);
  }
  const minuteLabels = minuteOptions.map(pad);

  const now = nowParts();
  // Without a value the time starts on the step grid, never on a stray minute.
  const timeSource = selected
    ? { hour: selected.hour, minute: selected.minute }
    : { hour: now.hour, minute: now.minute - (now.minute % step) };
  const minuteIndex = Math.max(0, minuteOptions.indexOf(timeSource.minute));

  const isSelectable = useCallback(
    (year: number, month: number, day: number) => {
      const dayValue = toDayValue(year, month, day);
      if (minDay && dayValue < minDay) return false;
      if (maxDay && dayValue > maxDay) return false;
      return true;
    },
    [minDay, maxDay],
  );

  const openPanel = useCallback(() => {
    if (disabled) return;
    const base = selected ?? nowParts();
    setView({ year: base.year, month: base.month });
    setPicking('days');
    setFocusedDay(base.day);
    keyboardNav.current = false;
    setOpen(true);
  }, [disabled, selected]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setPanelPos(null);
  }, []);

  /* ── Selection ──────────────────────────────────────────────────── */

  const commitDay = (day: number) => {
    onChange(
      toFieldValue(
        { year: view.year, month: view.month, day, hour: timeSource.hour, minute: timeSource.minute },
        mode,
      ),
    );
    setFocusedDay(day);
    if (mode === 'date') closePanel();
  };

  const commitTime = (hour: number, minute: number) => {
    const base = selected ?? now;
    setView({ year: base.year, month: base.month });
    onChange(toFieldValue({ ...base, hour, minute }, mode));
  };

  const commitToday = () => {
    setView({ year: now.year, month: now.month });
    setPicking('days');
    setFocusedDay(now.day);
    onChange(
      toFieldValue(
        {
          year: now.year,
          month: now.month,
          day: now.day,
          hour: timeSource.hour,
          minute: timeSource.minute,
        },
        mode,
      ),
    );
    if (mode === 'date') closePanel();
  };

  const clearValue = () => {
    onChange('');
    closePanel();
  };

  /* ── Panel positioning ──────────────────────────────────────────── */

  const positionPanel = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, Math.max(200, window.innerWidth - VIEWPORT_MARGIN * 2));
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    setPanelPos({ left, width, top: rect.bottom + PANEL_GAP });
  }, []);

  // Flip above the trigger when the measured panel wouldn't fit below it.
  useLayoutEffect(() => {
    if (!open || !panelPos || !triggerRef.current || !panelRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = panelRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
    const top =
      spaceBelow < height
        ? Math.max(VIEWPORT_MARGIN, rect.top - height - PANEL_GAP)
        : rect.bottom + PANEL_GAP;
    if (top !== panelPos.top) setPanelPos({ ...panelPos, top });
  }, [open, panelPos]);

  useEffect(() => {
    if (!open) return;
    positionPanel();
    window.addEventListener('scroll', positionPanel, true);
    window.addEventListener('resize', positionPanel);
    return () => {
      window.removeEventListener('scroll', positionPanel, true);
      window.removeEventListener('resize', positionPanel);
    };
  }, [open, positionPanel]);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closePanel();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Escape belongs to the picker while it is open - an enclosing dialog
      // must not close as well.
      event.stopPropagation();
      closePanel();
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, closePanel]);

  // Arrow-key browsing: focus follows the day the user stepped onto.
  useEffect(() => {
    if (!open || !keyboardNav.current || focusedDay === null) return;
    const button = panelRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusedDay}"]`);
    button?.focus();
  }, [open, focusedDay, view]);

  /* ── Navigation ─────────────────────────────────────────────────── */

  const shift = (direction: number) => {
    if (picking === 'years') {
      setView((prev) => ({ ...prev, year: prev.year + direction * 12 }));
      return;
    }
    if (picking === 'months') {
      setView((prev) => ({ ...prev, year: prev.year + direction }));
      return;
    }
    setView((prev) => {
      const month = prev.month - 1 + direction;
      return {
        year: prev.year + Math.floor(month / 12),
        month: ((month % 12) + 12) % 12 + 1,
      };
    });
  };

  const stepFocus = (delta: number) => {
    const cursor = new Date(view.year, view.month - 1, focusedDay ?? 1);
    for (let attempt = 0; attempt < 45; attempt += 1) {
      cursor.setDate(cursor.getDate() + delta);
      if (isSelectable(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate())) break;
    }
    setView({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    setFocusedDay(cursor.getDate());
  };

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    keyboardNav.current = true;
    stepFocus(delta);
  };

  /* ── Render ─────────────────────────────────────────────────────── */

  const display = selected ? formatDisplay(selected, mode) : null;
  const today = now;
  const cells = monthCells(view.year, view.month);
  const yearPage = Math.floor(view.year / 12) * 12;
  const years = Array.from({ length: 12 }, (_, index) => yearPage + index);
  const navLabels =
    picking === 'days'
      ? { previous: 'Previous month', next: 'Next month' }
      : picking === 'months'
        ? { previous: 'Previous year', next: 'Next year' }
        : { previous: 'Previous years', next: 'Next years' };

  const panel = (
    <div
      ref={panelRef}
      className="dp-panel"
      role="dialog"
      aria-label={mode === 'datetime' ? 'Choose date and time' : 'Choose date'}
      style={{ top: panelPos?.top, left: panelPos?.left, width: panelPos?.width }}
    >
      <div className="dp-header">
        <button
          type="button"
          className="dp-nav"
          aria-label={navLabels.previous}
          onClick={() => shift(-1)}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        {/* Each click of the header drills one level deeper: days → months → years. */}
        <button
          type="button"
          className="dp-title"
          aria-label={
            picking === 'days' ? 'Choose month' : picking === 'months' ? 'Choose year' : 'Back to calendar'
          }
          onClick={() =>
            setPicking(picking === 'days' ? 'months' : picking === 'months' ? 'years' : 'days')
          }
        >
          {picking === 'days' && `${MONTHS[view.month - 1]} ${view.year}`}
          {picking === 'months' && view.year}
          {picking === 'years' && `${yearPage} – ${yearPage + 11}`}
        </button>
        <button
          type="button"
          className="dp-nav"
          aria-label={navLabels.next}
          onClick={() => shift(1)}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {picking === 'months' ? (
        <div className="dp-month-grid">
          {MONTHS_SHORT.map((label, index) => {
            const month = index + 1;
            const isSelected = selected?.year === view.year && selected?.month === month;
            return (
              <button
                key={label}
                type="button"
                className={`dp-month${isSelected ? ' dp-month--selected' : ''}`}
                onClick={() => {
                  setView((prev) => ({ ...prev, month }));
                  setPicking('days');
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : picking === 'years' ? (
        <div className="dp-year-grid">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={`dp-year${selected?.year === year ? ' dp-year--selected' : ''}`}
              onClick={() => {
                setView((prev) => ({ ...prev, year }));
                setPicking('months');
              }}
            >
              {year}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="dp-weekdays">
            {WEEKDAYS.map((label) => (
              <span key={label} className="dp-weekday">
                {label}
              </span>
            ))}
          </div>
          <div className="dp-grid" onKeyDown={handleGridKeyDown}>
            {cells.map((day, index) => {
              if (day === null) {
                return <span key={`blank-${index}`} className="dp-day dp-day--blank" />;
              }
              const isSelected =
                selected?.year === view.year &&
                selected?.month === view.month &&
                selected?.day === day;
              const isToday =
                today.year === view.year && today.month === view.month && today.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  data-day={day}
                  className={`dp-day${isSelected ? ' dp-day--selected' : ''}${
                    isToday ? ' dp-day--today' : ''
                  }`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  disabled={!isSelectable(view.year, view.month, day)}
                  tabIndex={focusedDay === day ? 0 : -1}
                  onClick={() => {
                    keyboardNav.current = false;
                    commitDay(day);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === 'datetime' && (
        <div className="dp-time">
          <span className="dp-time-label">Time</span>
          <div className="dp-wheels">
            <span className="dp-wheel-band" aria-hidden="true" />
            <TimeWheel
              label="Hour"
              labels={HOUR_LABELS}
              index={toHour12(timeSource.hour) - 1}
              onStep={(steps) => commitTime(mod(timeSource.hour + steps, 24), timeSource.minute)}
            />
            <span className="dp-time-colon">:</span>
            <TimeWheel
              label="Minute"
              labels={minuteLabels}
              index={minuteIndex}
              onStep={(steps) =>
                commitTime(
                  timeSource.hour,
                  minuteOptions[mod(minuteIndex + steps, minuteOptions.length)],
                )
              }
            />
            <span className="dp-meridiem">{timeSource.hour < 12 ? 'AM' : 'PM'}</span>
          </div>
        </div>
      )}

      <div className="dp-footer">
        <button type="button" className="dp-action" onClick={commitToday}>
          Today
        </button>
        {clearable && (
          <button type="button" className="dp-action" onClick={clearValue}>
            Clear
          </button>
        )}
        <button type="button" className="dp-action dp-action--primary" onClick={closePanel}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className={`date-picker${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`dp-trigger${open ? ' dp-trigger--open' : ''}${
          display ? '' : ' dp-trigger--empty'
        }`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            openPanel();
          }
        }}
      >
        <FontAwesomeIcon icon={faCalendarDays} className="dp-trigger-icon" />
        <span className="dp-trigger-label">
          {display ?? placeholder ?? (mode === 'datetime' ? 'Select date & time' : 'Select date')}
        </span>
        {clearable && display && (
          <span
            role="button"
            tabIndex={-1}
            className="dp-clear"
            aria-label="Clear date"
            title="Clear date"
            onClick={(event) => {
              event.stopPropagation();
              clearValue();
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </span>
        )}
        <FontAwesomeIcon icon={faChevronDown} className="dp-trigger-chevron" />
      </button>

      {open && panelPos ? createPortal(panel, document.body) : null}
    </div>
  );
}
