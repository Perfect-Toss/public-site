import './TagPicker.css';

import { sortTagsByName, tagColor } from '../../utils/tags';

import type { Tag } from '../../api/api.tags';
import { useMemo } from 'react';

export interface TagPickerProps {
  /** Every tag that may be picked, in any order — the badges are sorted by name. */
  tags: readonly Tag[];
  /** Selected tag ids. */
  values: readonly string[];
  onChange: (values: string[]) => void;
  /** Accessible name for the badge group, mirroring the visible field label. */
  label?: string;
  disabled?: boolean;
  /** Shown in place of the badges when there is nothing to pick. */
  emptyMessage?: string;
  className?: string;
}

/**
 * Tag picker: every tag is listed as a badge and clicking one toggles it, so
 * the whole set is visible instead of hidden behind a dropdown. A picked badge
 * takes the tag's color in its border and dot and turns bold; an unpicked one
 * stays grey throughout.
 */
export function TagPicker({
  tags,
  values,
  onChange,
  label = 'Tags',
  disabled,
  emptyMessage = 'No tags available.',
  className,
}: TagPickerProps) {
  const badges = useMemo(() => sortTagsByName(tags), [tags]);
  const selectedIds = useMemo(() => new Set(values), [values]);

  if (badges.length === 0) {
    return <p className="tp-empty">{emptyMessage}</p>;
  }

  return (
    <div className={['tp-list', className].filter(Boolean).join(' ')} role="group" aria-label={label}>
      {badges.map((tag) => {
        const selected = selectedIds.has(tag.id);
        const label = tag.name || 'Untitled';
        const color = tagColor(tag);
        return (
          <button
            key={tag.id}
            type="button"
            className={`tp-badge ${selected ? 'tp-badge-picked' : 'tp-badge-unpicked'}`}
            style={selected ? { borderColor: color } : undefined}
            aria-pressed={selected}
            title={tag.name ?? undefined}
            disabled={disabled}
            onClick={() =>
              onChange(
                selected
                  ? values.filter((value) => value !== tag.id)
                  : [...values, tag.id],
              )
            }
          >
            <span
              className="tp-badge-dot"
              style={{ background: selected ? color : undefined }}
              aria-hidden="true"
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
