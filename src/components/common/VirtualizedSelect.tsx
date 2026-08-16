import { useVirtualizer } from '@tanstack/react-virtual';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import './VirtualizedSelect.css';

/**
 * A single page of a paged response. Mirrors the backend paged response
 * shape used across this codebase ({ pageNumber, pageSize, totalCount, items }).
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/** Parameters passed to a paged loader. */
export interface LoadOptionsParams {
  search: string;
  pageNumber: number;
  pageSize: number;
}

/** Paged loader used to progressively accumulate options in memory as the user scrolls. */
export type LoadOptions<T> = (params: LoadOptionsParams) => Promise<PagedResult<T>>;

export interface VirtualizedSelectProps<T> {
  /** Controlled selection (the option value, or null/'' when nothing is selected). */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Map an option to its stable value (also used for deduping across pages). */
  getOptionValue: (item: T) => string;
  /** Map an option to its display text. */
  getOptionLabel: (item: T) => string;
  /** Optional custom renderer for a list row. Defaults to getOptionLabel. */
  renderOption?: (item: T) => ReactNode;
  /** Mark an option as disabled (not selectable, skipped by keyboard nav). */
  isOptionDisabled?: (item: T) => boolean;

  /**
   * Static options list. When provided the search box filters these
   * in-memory and no paging occurs. Mutually exclusive with `loadOptions`.
   */
  items?: T[];
  /**
   * Paged loader. Results are accumulated in memory page-by-page and the
   * next page loads automatically as the user scrolls the list. Search text
   * (debounced) is forwarded so the loader can apply server-side filtering.
   * Mutually exclusive with `items`.
   */
  loadOptions?: LoadOptions<T>;
  /** Client-side filter used with `items`. Defaults to case-insensitive label substring match. */
  filterItems?: (item: T, search: string) => boolean;
  /** Page size requested from `loadOptions`. Defaults to 25. */
  pageSize?: number;

  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  /** Show the search box. Defaults to true; set false for simple option lists. */
  searchable?: boolean;
  /** Show a clear (×) button when a value is selected. Defaults to false. */
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  /** Max height of the dropdown list in px. Defaults to 280. */
  listHeight?: number;
  className?: string;
}

const DEBOUNCE_MS = 250;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_LIST_HEIGHT = 280;
const DEFAULT_ITEM_HEIGHT = 40;

/**
 * A styled, searchable, virtualized combobox dropdown shared across the app.
 *
 * - **Search box**: filters static `items` client-side, or is forwarded to a
 *   `loadOptions` paged loader (debounced) for server-side filtering.
 * - **Virtualized list**: only renders visible rows via `@tanstack/react-virtual`,
 *   so huge option sets stay responsive.
 * - **Paged loading**: with `loadOptions`, pages are appended to an in-memory
 *   collection (deduped by value) as the user scrolls near the bottom.
 *
 * The dropdown panel renders in a portal so it is never clipped by ancestors
 * with `overflow` (e.g. modals, tables). It supports keyboard navigation
 * (↑/↓ move, Enter selects, Esc closes) and click-outside-to-close.
 */
export function VirtualizedSelect<T>({
  value,
  onChange,
  getOptionValue,
  getOptionLabel,
  renderOption,
  isOptionDisabled,
  items,
  loadOptions,
  filterItems,
  pageSize = DEFAULT_PAGE_SIZE,
  placeholder = 'Select...',
  emptyMessage = 'No options found',
  searchPlaceholder = 'Search...',
  searchable = true,
  clearable = false,
  disabled = false,
  id,
  name,
  listHeight = DEFAULT_LIST_HEIGHT,
  className,
}: VirtualizedSelectProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Token to invalidate stale async loads when search/open state changes quickly.
  const requestRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Accumulated options (paged mode). Kept in memory as pages are appended.
  const [options, setOptions] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  const closePanel = useCallback(() => {
    requestRef.current++; // Cancel any in-flight paged load.
    setOpen(false);
    setPanelPos(null);
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearch('');
    setHighlightedIndex(0);
    if (loadOptions) {
      setOptions([]);
      setTotalCount(0);
      setPageNumber(0);
      void loadPage(1, '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, loadOptions]);

  /* ── Paged loading ─────────────────────────────────────────────── */

  const loadPage = useCallback(
    async (page: number, searchText: string, append: boolean) => {
      if (!loadOptions) return;
      const token = ++requestRef.current;
      setLoading(true);
      if (page === 1) setInitialLoading(true);
      try {
        const result = await loadOptions({
          search: searchText,
          pageNumber: page,
          pageSize,
        });
        if (token !== requestRef.current) return; // Stale — ignore.
        setTotalCount(result.totalCount);
        setPageNumber(result.pageNumber);
        setOptions((prev) => {
          if (!append) return result.items ?? [];
          const seen = new Set(prev.map(getOptionValue));
          const merged = [...prev];
          for (const item of result.items ?? []) {
            const v = getOptionValue(item);
            if (!seen.has(v)) {
              seen.add(v);
              merged.push(item);
            }
          }
          return merged;
        });
      } catch (err) {
        if (token !== requestRef.current) return;
        console.error('Failed to load dropdown options:', err);
      } finally {
        if (token === requestRef.current) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    },
    [loadOptions, pageSize, getOptionValue],
  );

  // Debounced reload from page 1 whenever the search text changes (paged mode).
  useEffect(() => {
    if (!open || !loadOptions || !searchable) return;
    const t = setTimeout(() => {
      setOptions([]);
      setPageNumber(0);
      setTotalCount(0);
      setHighlightedIndex(0);
      void loadPage(1, search, false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [open, loadOptions, search, loadPage, searchable]);

  /* ── Static filtering ──────────────────────────────────────────── */

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!searchable) return items;
    const trimmed = search.trim();
    if (!trimmed) return items;
    const filter =
      filterItems ??
      ((item: T, s: string) => getOptionLabel(item).toLowerCase().includes(s.toLowerCase()));
    return items.filter((item) => filter(item, trimmed));
  }, [items, search, filterItems, getOptionLabel, searchable]);

  const displayOptions = loadOptions ? options : filteredItems;

  /* ── Virtualized list ──────────────────────────────────────────── */

  const virtualizer = useVirtualizer({
    count: displayOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => DEFAULT_ITEM_HEIGHT,
    overscan: 8,
  });

  // Keep the highlighted row visible when navigating with the keyboard.
  useEffect(() => {
    if (!open) return;
    virtualizer.scrollToIndex(highlightedIndex, { align: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedIndex, open]);

  const hasMore = Boolean(loadOptions) && options.length < totalCount;

  // Load the next page when the user scrolls near the bottom (paged mode).
  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !loadOptions) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      if (loading || !hasMore) return;
      void loadPage(pageNumber + 1, search, true);
    }
  }, [loadOptions, loading, hasMore, pageNumber, search, loadPage]);

  /* ── Selection / keyboard ──────────────────────────────────────── */

  const selectOption = useCallback(
    (item: T) => {
      if (isOptionDisabled?.(item)) return;
      onChange(getOptionValue(item));
      setSearch('');
      closePanel();
    },
    [onChange, getOptionValue, closePanel, isOptionDisabled],
  );

  const moveHighlight = useCallback(
    (step: number) => {
      setHighlightedIndex((current) => {
        const len = displayOptions.length;
        if (len === 0) return 0;
        let i = (current + step + len) % len;
        // Skip disabled options so the user can't land on them.
        if (isOptionDisabled) {
          while (len > 1 && isOptionDisabled(displayOptions[i]) && i !== current) {
            i = (i + step + len) % len;
          }
        }
        return i;
      });
    },
    [displayOptions, isOptionDisabled],
  );

  const handleTriggerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if ((e.key === 'Enter' || e.key === ' ') && !open) {
        e.preventDefault();
        openPanel();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) {
          openPanel();
          return;
        }
        moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        closePanel();
      }
    },
    [disabled, open, openPanel, moveHighlight, closePanel],
  );

  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = displayOptions[highlightedIndex];
        if (item) selectOption(item);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    },
    [moveHighlight, displayOptions, highlightedIndex, selectOption, closePanel],
  );

  /* ── Panel positioning / outside click ─────────────────────────── */

  const positionPanel = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Tentatively open below the trigger. The measure effect flips the panel to
    // open upward only when it truly wouldn't fit in the viewport space below —
    // so compact panels open downward instead of floating up unnecessarily.
    setPanelPos({
      left: rect.left,
      width: rect.width,
      openUp: false,
      top: rect.bottom + 6,
    });
  }, []);

  // Anchor the panel to the trigger using its measured height so compact panels
  // hug the trigger. Flipping is decided from the panel's real height and the
  // viewport space below the trigger (not the max height).
  useLayoutEffect(() => {
    if (!open || !panelPos || !triggerRef.current || !panelRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = panelRef.current.offsetHeight;

    const spaceBelow = window.innerHeight - rect.bottom - 6 - 8; // gap + bottom margin
    const openUp = spaceBelow < height;
    const top = openUp
      ? Math.max(8, rect.top - height - 6)
      : Math.max(8, rect.bottom + 6);

    if (openUp !== panelPos.openUp || top !== panelPos.top) {
      setPanelPos({ ...panelPos, openUp, top });
    }
  }, [open, panelPos, displayOptions.length]);

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
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      closePanel();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, closePanel]);

  /* ── Selected label ────────────────────────────────────────────── */

  const selected = useMemo(() => {
    const source = items ? items : options;
    return source.find((it) => getOptionValue(it) === value) ?? null;
  }, [items, options, value, getOptionValue]);

  const triggerLabel = selected ? getOptionLabel(selected) : value || '';

  const panel = open && panelPos ? (
    createPortal(
      <div
        ref={panelRef}
        id={id ? `${id}-listbox` : undefined}
        role="listbox"
        className="vs-panel"
        style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
      >
        {searchable && (
          <div className="vs-search">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              role="combobox"
              aria-expanded
              aria-controls={id ? `${id}-listbox` : undefined}
            />
          </div>
        )}
        <div
          ref={listRef}
          className="vs-list"
          style={{ maxHeight: listHeight }}
          onScroll={handleListScroll}
        >
          {initialLoading && displayOptions.length === 0 ? (
            <div className="vs-empty">Loading...</div>
          ) : displayOptions.length === 0 ? (
            <div className="vs-empty">{emptyMessage}</div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((row) => {
                const item = displayOptions[row.index];
                const itemValue = getOptionValue(item);
                const isActive = row.index === highlightedIndex;
                const isSelected = itemValue === value;
                const isDisabled = Boolean(isOptionDisabled?.(item));
                return (
                  <div
                    key={itemValue}
                    ref={virtualizer.measureElement}
                    data-index={row.index}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled || undefined}
                    className={`vs-option${isActive ? ' vs-active' : ''}${
                      isSelected ? ' vs-selected' : ''
                    }${isDisabled ? ' vs-disabled' : ''}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${row.start}px)`,
                    }}
                    onMouseMove={() => {
                      if (!isDisabled) setHighlightedIndex(row.index);
                    }}
                    onClick={() => {
                      if (!isDisabled) selectOption(item);
                    }}
                  >
                    {renderOption ? renderOption(item) : getOptionLabel(item)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {loading && displayOptions.length > 0 && (
          <div className="vs-loading-more">Loading more...</div>
        )}
      </div>,
      document.body,
    )
  ) : null;

  return (
    <div className={`virtualized-select${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        className={`vs-trigger${open ? ' vs-open' : ''}`}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open && id ? `${id}-listbox` : undefined}
      >
        <span className={`vs-trigger-label${triggerLabel ? '' : ' vs-placeholder'}`}>
          {triggerLabel || placeholder}
        </span>
        {clearable && value && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear selection"
            className="vs-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            ×
          </span>
        )}
        <FontAwesomeIcon icon={faChevronDown} className="vs-chevron" size="xs" />
      </button>
      {panel}
    </div>
  );
}

export default VirtualizedSelect;
