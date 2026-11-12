import './Tag.css';

import type { Tag as ApiTag } from '../../api/api.tags';
import { inkColor } from '../../utils/color';
import { tagColor } from '../../utils/tags';

export type TagSize = 'sm' | 'md';

export interface TagProps {
  /** Tag name shown in the pill. */
  name: string | null;
  /** The tag's own colour; a colour derived from the name is used when absent. */
  colorHex?: string | null;
  /** `sm` for cards and dense rows, `md` for detail pages. */
  size?: TagSize;
  className?: string;
}

export interface TagListProps {
  /** Tags in display order. */
  tags?: readonly ApiTag[] | null;
  /** Show only the first N, the rest folded into a "+N" pill. */
  max?: number;
  size?: TagSize;
  className?: string;
}

/** A tag with no name still needs a label. */
const UNTITLED = 'Untitled';

/**
 * One tag as a pill: white surface, the tag's true colour in the dot, and a
 * readable version of that colour (same hue, deeper) in the border and label.
 */
export function Tag({ name, colorHex, size = 'md', className }: TagProps) {
  const color = tagColor({ name, colorHex });
  const ink = inkColor(color);
  const label = name || UNTITLED;

  return (
    <span
      className={['tag-chip', `tag-chip--${size}`, className].filter(Boolean).join(' ')}
      style={{ borderColor: ink, color: ink }}
      title={label}
    >
      <span className="tag-chip-dot" style={{ background: color }} aria-hidden="true" />
      <span className="tag-chip-label">{label}</span>
    </span>
  );
}

/** Every tag of an item, or the first `max` of them plus a "+N" counter. */
export function TagList({ tags, max, size = 'md', className }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  const shown = max == null ? tags : tags.slice(0, max);
  const hidden = tags.length - shown.length;

  return (
    <span className={['tag-list', className].filter(Boolean).join(' ')}>
      {shown.map((tag) => (
        <Tag key={tag.id} name={tag.name} colorHex={tag.colorHex} size={size} />
      ))}
      {hidden > 0 && (
        <span className={`tag-chip tag-chip--${size} tag-chip--more`}>
          +{hidden}
        </span>
      )}
    </span>
  );
}
