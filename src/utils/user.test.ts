import { describe, expect, it } from 'vitest';
import {
  filterUsers,
  hasRole,
  matchesUserQuery,
  sortUsersByName,
} from './user';

import { Role } from './roles';
import type { User } from '../api/api.users';

function makeUser(id: string, fields: Partial<User> = {}): User {
  return { ...fields, id, email: fields.email ?? null };
}

const ada = makeUser('ada', { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' });
const grace = makeUser('grace', {
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@example.com',
  roles: ['Athlete'],
});
const courtOne = makeUser('court-1', {
  firstName: 'Court 1',
  email: 'court1@devices.example.com',
  roles: ['ServiceAccount'],
});
const courtNine = makeUser('court-9', {
  firstName: 'Court 9',
  email: 'court9@devices.example.com',
  roles: ['ServiceAccount', 'Coach'],
});

describe('hasRole', () => {
  it('detects a held role regardless of position', () => {
    expect(hasRole(['Coach', 'ServiceAccount'], Role.ServiceAccount)).toBe(true);
    expect(hasRole(['Coach'], Role.ServiceAccount)).toBe(false);
  });

  it('treats a missing role list as no roles', () => {
    expect(hasRole(undefined, Role.Admin)).toBe(false);
    expect(hasRole(null, Role.Admin)).toBe(false);
  });
});

describe('matchesUserQuery', () => {
  it('matches on first name, last name, full name and email', () => {
    expect(matchesUserQuery(ada, 'ada')).toBe(true);
    expect(matchesUserQuery(ada, 'love')).toBe(true);
    expect(matchesUserQuery(ada, 'ada lovelace')).toBe(true);
    expect(matchesUserQuery(ada, 'ada@example')).toBe(true);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(matchesUserQuery(ada, '  LOVELACE ')).toBe(true);
  });

  it('matches everything for an empty query', () => {
    expect(matchesUserQuery(ada, '   ')).toBe(true);
  });

  it('rejects a non-match', () => {
    expect(matchesUserQuery(ada, 'hopper')).toBe(false);
  });
});

describe('sortUsersByName', () => {
  it('orders by display name and leaves the input alone', () => {
    const input = [grace, ada, courtNine, courtOne];

    expect(sortUsersByName(input).map((u) => u.id)).toEqual([
      'ada',
      'court-1',
      'court-9',
      'grace',
    ]);
    expect(input.map((u) => u.id)).toEqual(['grace', 'ada', 'court-9', 'court-1']);
  });

  it('falls back to the email for a user with no name', () => {
    const nameless = makeUser('nameless', { email: 'zoe@example.com' });

    expect(sortUsersByName([nameless, ada]).map((u) => u.id)).toEqual(['ada', 'nameless']);
  });
});

describe('filterUsers', () => {
  const all = [grace, ada, courtNine, courtOne];

  it('is alphabetical by default', () => {
    expect(filterUsers(all).map((u) => u.id)).toEqual([
      'ada',
      'court-1',
      'court-9',
      'grace',
    ]);
  });

  it('applies the search text', () => {
    expect(filterUsers(all, { query: 'court9@' }).map((u) => u.id)).toEqual(['court-9']);
  });

  it('drops excluded users', () => {
    expect(filterUsers(all, { excludeIds: ['court-1', 'ada'] }).map((u) => u.id)).toEqual([
      'court-9',
      'grace',
    ]);
  });

  it('keeps only users holding one of the given roles', () => {
    expect(filterUsers(all, { roles: [Role.Coach] }).map((u) => u.id)).toEqual(['court-9']);
  });

  it('treats several roles as "any of them"', () => {
    expect(
      filterUsers(all, { roles: [Role.Coach, Role.ServiceAccount] }).map((u) => u.id),
    ).toEqual(['court-1', 'court-9']);
  });

  it('drops everyone when nobody holds the role', () => {
    expect(filterUsers(all, { roles: [Role.SuperUser] })).toEqual([]);
  });

  it('combines the filters', () => {
    expect(
      filterUsers(all, { query: 'court', roles: [Role.ServiceAccount] }).map((u) => u.id),
    ).toEqual(['court-1', 'court-9']);
  });
});
