/**
 * Role enum and helpers.
 *
 * The Role enum is a runtime utility — the schema's auto-generated `Roles` type
 * is what flows through API responses. The enum must stay in sync with the schema;
 * the compile-time assertion at the bottom of this file catches drift.
 */

import type { components } from '../api/schema';

/** All possible role values. Must match the API schema's Roles type. */
export enum Role {
  Athlete = 'Athlete',
  Coach = 'Coach',
  EntityAdmin = 'EntityAdmin',
  OrganizationAdmin = 'OrganizationAdmin',
  Admin = 'Admin',
  ServiceAccount = 'ServiceAccount',
  AlphaTester = 'AlphaTester',
  BetaTester = 'BetaTester',
  SuperUser = 'SuperUser',
}

/** Runtime array of all possible Role values. */
export const ROLES: Role[] = Object.values(Role);

/** Role values that confer admin-level privileges. */
export const ADMIN_ROLES: Role[] = [Role.Admin, Role.SuperUser];

/**
 * Role values that may create an event: the global admins (Admin, SuperUser)
 * and an organization's own admin (OrganizationAdmin).
 *
 * The API applies the same rule — `POST /api/v1/events` requires a global admin
 * or the OrganizationAdmin role on the event's organization — so this only
 * mirrors what the server will accept.
 */
export const EVENT_CREATOR_ROLES: Role[] = [Role.Admin, Role.SuperUser, Role.OrganizationAdmin];

/**
 * Roles ordered by the authority they carry, strongest first.
 *
 * Assignment is level-based: a user may hand out their own level and anything
 * below it. So an organization admin can grant organization admins but not
 * global admins, and only a super user can grant the super user role.
 */
export const ROLE_AUTHORITY: Role[] = [
  Role.SuperUser,
  Role.Admin,
  Role.OrganizationAdmin,
  Role.EntityAdmin,
  Role.Coach,
  Role.ServiceAccount,
  Role.AlphaTester,
  Role.BetaTester,
  Role.Athlete,
];

/**
 * Where a role sits in the authority order — higher is stronger, 0 is a role
 * that isn't in the order at all (unknown values carry no authority).
 */
export function roleAuthority(role: string): number {
  const index = ROLE_AUTHORITY.indexOf(role as Role);
  return index === -1 ? 0 : ROLE_AUTHORITY.length - index;
}

/** Authority of the strongest role in a set, 0 when the set is empty. */
export function highestAuthority(roles?: readonly string[] | null): number {
  if (!roles?.length) return 0;
  return roles.reduce((top, role) => Math.max(top, roleAuthority(role)), 0);
}

/** True when `roles` may grant `role` — their own level or anything below it. */
export function canAssignRole(roles: readonly string[] | null | undefined, role: Role): boolean {
  const target = roleAuthority(role);
  return target > 0 && highestAuthority(roles) >= target;
}

/** The roles `roles` may grant, strongest first. */
export function assignableRoles(roles?: readonly string[] | null): Role[] {
  const top = highestAuthority(roles);
  return ROLE_AUTHORITY.filter((role) => roleAuthority(role) <= top);
}

/**
 * Check whether a user's roles include admin or super-user privileges.
 * Accepts the schema's `roles` array type directly — no cast needed.
 */
export function isAdminUser(
  user: { roles?: readonly string[] | null } | null | undefined,
): boolean {
  if (!user?.roles) return false;
  return user.roles.some((r) => ADMIN_ROLES.includes(r as Role));
}

/**
 * Check whether a set of roles may create events. Pass the user's global roles
 * for a system-wide check, or their roles on a specific organization
 * (`GET /api/v1/entities/{entityId}/users/{userId}`) for an org-scoped one.
 */
export function canCreateEvent(roles?: readonly string[] | null): boolean {
  if (!roles) return false;
  return roles.some((r) => EVENT_CREATOR_ROLES.includes(r as Role));
}

// ─── Compile-time assertion ──────────────────────────────────────────
// If TypeScript errors here, the Role enum is out of sync with the API
// schema's `Roles` type. Run `npm run generate:api` then update the enum.

/** Schema-level role union (auto-generated). */
type _SchemaRoles = components['schemas']['Roles'];

/** Enum members expanded to their string literal values (e.g. "Admin" | ...). */
type _RoleStrings = `${Role}`;

/**
 * true  → every schema role is covered by the enum
 * false → the schema has roles the enum doesn't know about
 */
type _SchemaCovered = [Exclude<_SchemaRoles, _RoleStrings>] extends [never] ? true : false;

/**
 * true  → every enum member is present in the schema
 * false → the enum has values the schema no longer defines
 */
type _EnumCovered = [Exclude<_RoleStrings, _SchemaRoles>] extends [never] ? true : false;

/** Fails at compile time if either direction is out of sync. */
type _rolesMatch = _SchemaCovered extends true
  ? (_EnumCovered extends true ? true : false)
  : false;

/**
 * Compile-time guard: TS errors here when the Role enum drifts from the schema.
 * Exported so `noUnusedLocals` doesn't flag it — not meant for external use.
 * @internal
 */
export const _roleCheck: _rolesMatch extends true ? true : never = true;
