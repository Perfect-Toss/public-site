import type { ReactNode } from 'react';
import { Role } from './roles';
import type { User } from '../api/api.users';

/* ─── Display Helpers ──────────────────────────────────────────── */

export function getInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const f = first.charAt(0);
  const l = last.charAt(0);
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  return (user.email?.charAt(0) ?? '?').toUpperCase();
}

export function getDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || user.email || '-';
}

export function renderRoleBadges(roles?: string[] | null): ReactNode {
  if (!roles || roles.length === 0)
    return <span style={{ color: '#999', fontSize: 12 }}>—</span>;
  return roles.map((r) => (
    <span key={r} className={`role-badge ${r.toLowerCase()}`}>
      {r}
    </span>
  ));
}

/* ─── User Picker Helpers ──────────────────────────────────────── */

/** Roles accepted as a plain string list, so callers don't need the enum. */
type RolesLike = readonly string[] | null | undefined;

/** True when the user holds `role`. */
export function hasRole(roles: RolesLike, role: Role): boolean {
  return Boolean(roles?.some((r) => r === role));
}

/** Case-insensitive match against a user's name or email. */
export function matchesUserQuery(
  user: { firstName?: string | null; lastName?: string | null; email?: string | null },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [getDisplayName(user), user.email ?? '', user.firstName ?? '', user.lastName ?? ''].some(
    (text) => text.toLowerCase().includes(q),
  );
}

/** Copy of the list ordered by display name, falling back to email. */
export function sortUsersByName<T extends { firstName?: string | null; lastName?: string | null; email?: string | null }>(
  users: readonly T[],
): T[] {
  return [...users].sort(
    (a, b) => getDisplayName(a).localeCompare(getDisplayName(b)) || (a.email ?? '').localeCompare(b.email ?? ''),
  );
}

export interface IFilterUsersOptions {
  /** Search text matched against name and email. */
  query?: string;
  /** Keep only users holding at least one of these roles. */
  roles?: readonly Role[];
  /** Users to leave out, e.g. the current user. */
  excludeIds?: readonly string[];
}

/** The user list a picker shows: filters applied, ordered alphabetically. */
export function filterUsers(users: readonly User[], options: IFilterUsersOptions = {}): User[] {
  const { query = '', roles = [], excludeIds = [] } = options;

  const excluded = new Set(excludeIds);

  return sortUsersByName(
    users.filter((user) => {
      if (excluded.has(user.id)) return false;
      if (!matchesUserQuery(user, query)) return false;
      if (roles.length > 0 && !roles.some((role) => hasRole(user.roles, role))) return false;
      return true;
    }),
  );
}
