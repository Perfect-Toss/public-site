import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Entity } from '../../api/api.entities';
import {
  buildOrganizationTree,
  flattenOrganizationTree,
  organizationPath,
  type IOrganizationTreeRow,
} from '../../utils/entities';
import { VirtualizedSelect } from './VirtualizedSelect';
import './OrganizationPicker.css';

/** The "none / root level" escape hatch. */
interface INoneRow {
  kind: 'none';
}

interface IOrganizationRow extends IOrganizationTreeRow {
  kind: 'org';
}

type PickerRow = INoneRow | IOrganizationRow;

export interface OrganizationPickerProps {
  /** Every organization in the system, in any order — the hierarchy comes from `parentEntityId`. */
  organizations: Entity[];
  /** Selected organization id, or '' for none / not selected. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Shown when nothing is selected. */
  placeholder?: string;
  /** Offer a row that clears the selection, for optional parents. */
  allowNone?: boolean;
  noneLabel?: string;
  /**
   * Organizations to leave out together with their descendants, e.g. the one
   * being edited so it can't end up inside itself.
   */
  excludeIds?: readonly string[];
  /** Show each organization's type next to its name. */
  showType?: boolean;
  searchPlaceholder?: string;
  listHeight?: number;
  className?: string;
}

const rowValue = (row: PickerRow) => (row.kind === 'none' ? '' : row.org.id);

/**
 * Dropdown for picking an organization out of the organization hierarchy.
 *
 * The list is alphabetical within every level and keeps the parent/child
 * structure: children sit indented under their parent behind a chevron that
 * collapses the branch. Typing filters the list down to the matching
 * organizations plus the ancestors that place them in the hierarchy.
 */
export function OrganizationPicker({
  organizations,
  value,
  onChange,
  id,
  name,
  disabled,
  placeholder = 'Select an organization',
  allowNone = false,
  noneLabel = '— None (root level) —',
  excludeIds,
  showType = false,
  searchPlaceholder = 'Search organizations...',
  listHeight,
  className,
}: OrganizationPickerProps) {
  const [search, setSearch] = useState('');
  // Expansion is the default, so only the branches the user collapsed are kept.
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set());

  const rows = useMemo<PickerRow[]>(() => {
    const tree = buildOrganizationTree(organizations, excludeIds ?? []);
    const orgRows: PickerRow[] = flattenOrganizationTree(tree, {
      query: search,
      collapsedIds,
    }).map((row) => ({ kind: 'org', ...row }));
    return allowNone ? [{ kind: 'none' }, ...orgRows] : orgRows;
  }, [organizations, excludeIds, search, collapsedIds, allowNone]);

  const toggleExpanded = useCallback((orgId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  }, []);

  const rowLabel = useCallback(
    (row: PickerRow) => (row.kind === 'none' ? noneLabel : organizationPath(row)),
    [noneLabel],
  );

  const renderRow = (row: PickerRow): ReactNode => {
    if (row.kind === 'none') {
      return <span className="op-none">{noneLabel}</span>;
    }

    return (
      <span className={`op-row${row.isAncestorOfMatch ? ' op-row-context' : ''}`}>
        {Array.from({ length: row.depth }, (_, level) => (
          <span key={`indent-${level}`} className="op-indent" />
        ))}

        {row.hasChildren ? (
          <span
            role="button"
            tabIndex={-1}
            className="op-toggle"
            aria-label={row.isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={row.isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(row.org.id);
            }}
          >
            <FontAwesomeIcon icon={row.isExpanded ? faChevronDown : faChevronRight} size="xs" />
          </span>
        ) : (
          <span className="op-toggle op-toggle-leaf" aria-hidden="true" />
        )}

        <span className="op-name">{row.org.name || 'Untitled'}</span>
        {showType && row.org.entityType ? (
          <span className="op-type">{row.org.entityType}</span>
        ) : null}
      </span>
    );
  };

  return (
    <VirtualizedSelect<PickerRow>
      id={id}
      name={name}
      disabled={disabled}
      className={className}
      items={rows}
      value={value}
      onChange={(next) => onChange(next ?? '')}
      getOptionValue={rowValue}
      getOptionLabel={rowLabel}
      renderOption={renderRow}
      // The rows are already filtered by the hierarchy-aware search, so the
      // built-in label filter must not narrow them a second time.
      filterItems={() => true}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      placeholder={placeholder}
      emptyMessage={search.trim() ? 'No organizations match your search' : 'No organizations found'}
      listHeight={listHeight}
    />
  );
}
