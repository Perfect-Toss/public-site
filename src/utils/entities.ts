/**
 * Organization (entity) hierarchy helpers.
 */

import type { Entity } from '../api/api.entities';

/** A node in the organization hierarchy. Children are sorted by name. */
export interface IOrganizationTree {
  org: Entity;
  children: IOrganizationTree[];
}

/** One row of a flattened organization tree, ready to render in a picker list. */
export interface IOrganizationTreeRow {
  org: Entity;
  /** 0 for root-level organizations. */
  depth: number;
  /** Ancestor names, root-first (the organization itself is not included). */
  ancestorNames: string[];
  hasChildren: boolean;
  /** False when this organization's children are collapsed. */
  isExpanded: boolean;
  /** True when the row is listed only because a descendant matched the search. */
  isAncestorOfMatch: boolean;
}

export interface IFlattenOrganizationTreeOptions {
  /** Search text. When set, only matching rows and their ancestors are kept. */
  query?: string;
  /**
   * Organizations whose children are hidden. Expansion is the default, so this
   * holds the ones the user explicitly collapsed. Ignored while searching.
   */
  collapsedIds?: ReadonlySet<string>;
}

/** Sort entities by display name. */
function byName(a: Entity, b: Entity): number {
  return (a.name ?? '').localeCompare(b.name ?? '');
}

/**
 * Build the organization hierarchy from the flat entity list.
 *
 * Roots and siblings are ordered alphabetically, so the tree doubles as an
 * alphabetical list. Each id in `excludeIds` is dropped together with its whole
 * subtree — an organization can never be led out of a branch that was left out.
 * Organizations whose parent is missing from the list become roots.
 */
export function buildOrganizationTree(
  organizations: Entity[],
  excludeIds: readonly string[] = [],
): IOrganizationTree[] {
  const childrenOf = new Map<string, Entity[]>();
  for (const org of organizations) {
    const parentId = org.parentEntityId;
    if (!parentId) continue;
    const siblings = childrenOf.get(parentId);
    if (siblings) siblings.push(org);
    else childrenOf.set(parentId, [org]);
  }

  /** The excluded organizations plus everything beneath them. */
  const excluded = new Set<string>();
  const pending = [...excludeIds];
  while (pending.length > 0) {
    const id = pending.pop() as string;
    if (excluded.has(id)) continue;
    excluded.add(id);
    for (const child of childrenOf.get(id) ?? []) pending.push(child.id);
  }

  const nodes = new Map<string, IOrganizationTree>();
  for (const org of organizations) {
    if (!excluded.has(org.id)) nodes.set(org.id, { org, children: [] });
  }

  const roots: IOrganizationTree[] = [];
  for (const node of nodes.values()) {
    const parentId = node.org.parentEntityId ?? null;
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (list: IOrganizationTree[]) => {
    list.sort((a, b) => byName(a.org, b.org));
    for (const node of list) sortNodes(node.children);
  };
  sortNodes(roots);

  return roots;
}

/**
 * Flatten the hierarchy depth-first into render-ready rows.
 *
 * The order is alphabetical within every level and children always follow
 * their parent, so the list reads as an alphabetical tree. While a search text
 * is present, only organizations in a matching subtree are kept and every
 * ancestor of a match stays visible (flagged `isAncestorOfMatch`) so a result
 * never loses its place in the hierarchy.
 */
export function flattenOrganizationTree(
  roots: IOrganizationTree[],
  { query = '', collapsedIds }: IFlattenOrganizationTreeOptions = {},
): IOrganizationTreeRow[] {
  const search = query.trim().toLowerCase();
  const searching = search.length > 0;

  interface ISubtree {
    rows: IOrganizationTreeRow[];
    /** True when this subtree contributes at least one row. */
    hasMatch: boolean;
  }

  const matches = (org: Entity, ancestorNames: string[]) =>
    [org.name, org.entityType, ...ancestorNames]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);

  const walk = (
    node: IOrganizationTree,
    depth: number,
    ancestorNames: string[],
  ): ISubtree => {
    const selfMatch = !searching || matches(node.org, ancestorNames);
    const childNames = [...ancestorNames, node.org.name ?? ''];
    const children = node.children.map((child) => walk(child, depth + 1, childNames));

    // A parent that neither matches nor leads to a match is left out entirely.
    if (!selfMatch && !children.some((child) => child.hasMatch)) {
      return { rows: [], hasMatch: false };
    }

    const isExpanded = searching || !collapsedIds?.has(node.org.id);
    const rows: IOrganizationTreeRow[] = [
      {
        org: node.org,
        depth,
        ancestorNames,
        hasChildren: node.children.length > 0,
        isExpanded,
        isAncestorOfMatch: searching && !selfMatch,
      },
    ];
    if (isExpanded) {
      for (const child of children) rows.push(...child.rows);
    }

    return { rows, hasMatch: true };
  };

  return roots.flatMap((root) => walk(root, 0, []).rows);
}

/** Full hierarchy path of an organization, e.g. `League A / Division B / Team C`. */
export function organizationPath(row: IOrganizationTreeRow, separator = ' / '): string {
  return [...row.ancestorNames, row.org.name ?? 'Untitled'].join(separator);
}
