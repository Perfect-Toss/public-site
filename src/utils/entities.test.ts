import {
  buildOrganizationTree,
  flattenOrganizationTree,
  organizationPath,
} from './entities';
import { describe, expect, it } from 'vitest';

import type { Entity } from '../api/api.entities';

function org(id: string, name: string, parentEntityId?: string, entityType?: string): Entity {
  return { id, name, parentEntityId, entityType };
}

/** A three-level club hierarchy with deliberately unsorted input. */
const clubs: Entity[] = [
  org('team-b', 'Team B', 'div-1'),
  org('league', 'League'),
  org('div-1', 'Division', 'league', 'Division'),
  org('team-a', 'Team A', 'div-1'),
  org('club', 'Club'),
];

const flat = (entities: Entity[], options?: Parameters<typeof flattenOrganizationTree>[1]) =>
  flattenOrganizationTree(buildOrganizationTree(entities), options);

describe('buildOrganizationTree', () => {
  it('nests children under their parent and sorts every level alphabetically', () => {
    const roots = buildOrganizationTree(clubs);

    expect(roots.map((node) => node.org.name)).toEqual(['Club', 'League']);
    expect(roots[1].children.map((node) => node.org.name)).toEqual(['Division']);
    expect(roots[1].children[0].children.map((node) => node.org.name)).toEqual([
      'Team A',
      'Team B',
    ]);
  });

  it('treats entities whose parent is missing as roots', () => {
    const roots = buildOrganizationTree([org('a', 'Orphan', 'does-not-exist')]);
    expect(roots.map((node) => node.org.name)).toEqual(['Orphan']);
  });

  it('drops an excluded organization along with its descendants', () => {
    const roots = buildOrganizationTree(clubs, ['div-1']);

    expect(roots.map((node) => node.org.name)).toEqual(['Club', 'League']);
  });

  it('excludes the children of an excluded id even when that id is not in the list', () => {
    const roots = buildOrganizationTree(
      [org('a', 'A', 'gone'), org('b', 'B')],
      ['gone'],
    );

    expect(roots.map((node) => node.org.name)).toEqual(['B']);
  });

  it('does not loop forever on a cycle in the data', () => {
    const roots = buildOrganizationTree([
      org('a', 'A', 'b'),
      org('b', 'B', 'a'),
      org('c', 'C'),
    ]);

    expect(roots.map((node) => node.org.name)).toEqual(['C']);
  });
});

describe('flattenOrganizationTree', () => {
  it('lists a parent before its children, each child indented under it', () => {
    const rows = flat(clubs);

    expect(rows.map((row) => `${'  '.repeat(row.depth)}${row.org.name}`)).toEqual([
      'Club',
      'League',
      '  Division',
      '    Team A',
      '    Team B',
    ]);
  });

  it('reports the ancestor path of each row', () => {
    const teamA = flat(clubs).find((row) => row.org.id === 'team-a');

    expect(teamA?.depth).toBe(2);
    expect(teamA?.ancestorNames).toEqual(['League', 'Division']);
    expect(teamA && organizationPath(teamA)).toBe('League / Division / Team A');
  });

  it('keeps matching organizations together with their ancestors', () => {
    const rows = flat(clubs, { query: 'team' });

    expect(rows.map((row) => row.org.id)).toEqual(['league', 'div-1', 'team-a', 'team-b']);
    expect(rows.filter((row) => row.isAncestorOfMatch).map((row) => row.org.id)).toEqual([
      'league',
      'div-1',
    ]);
  });

  it('matches on the hierarchy path and on the entity type', () => {
    expect(flat(clubs, { query: 'club' }).map((row) => row.org.id)).toEqual(['club']);
    expect(flat(clubs, { query: 'division' }).map((row) => row.org.id)).toEqual([
      'league',
      'div-1',
      'team-a',
      'team-b',
    ]);
  });

  it('ignores case and surrounding whitespace while searching', () => {
    expect(flat(clubs, { query: '  TEAM b ' }).map((row) => row.org.id)).toEqual([
      'league',
      'div-1',
      'team-b',
    ]);
  });

  it('returns nothing when no organization matches', () => {
    expect(flat(clubs, { query: 'netball' })).toEqual([]);
  });

  it('hides the children of a collapsed organization but keeps its row', () => {
    const rows = flat(clubs, { collapsedIds: new Set(['league']) });

    expect(rows.map((row) => row.org.id)).toEqual(['club', 'league']);
    expect(rows[1].isExpanded).toBe(false);
  });

  it('expands everything while searching so no match is hidden', () => {
    const rows = flat(clubs, { query: 'team', collapsedIds: new Set(['league', 'div-1']) });

    expect(rows.map((row) => row.org.id)).toEqual(['league', 'div-1', 'team-a', 'team-b']);
  });
});
