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
 * Check whether a user's roles include admin or super-user privileges.
 * Accepts the schema's `roles` array type directly — no cast needed.
 */
export function isAdminUser(
  user: { roles?: readonly string[] | null } | null | undefined,
): boolean {
  if (!user?.roles) return false;
  return user.roles.some((r) => ADMIN_ROLES.includes(r as Role));
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
