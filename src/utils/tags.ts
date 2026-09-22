/**
 * Tag helpers — the color a tag is shown in and the order tags are listed in.
 */

import type { Tag } from '../api/api.tags';
import { colorFor } from './color';

/** The color a tag is shown in — its own, or one derived from its name. */
export function tagColor(tag: Tag): string {
  // Tags with no stored color fall back to one derived from the name, the same
  // way the tag form derives a color while a new tag is being named.
  return tag.colorHex || colorFor(tag.name ?? '', { forceDark: true });
}

/** Tags in alphabetical order, untitled ones last. */
export function sortTagsByName(tags: readonly Tag[]): Tag[] {
  return [...tags].sort((a, b) => {
    const left = a.name ?? '';
    const right = b.name ?? '';
    if (!left || !right) return left ? -1 : right ? 1 : 0;
    return left.localeCompare(right);
  });
}
