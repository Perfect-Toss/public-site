import {
  ROLES,
  ROLE_AUTHORITY,
  Role,
  assignableRoles,
  canAssignRole,
  canCreateEvent,
  isAdminUser,
  roleAuthority,
} from './roles';
import { describe, expect, it } from 'vitest';

describe('canCreateEvent', () => {
  it('allows super users and admins', () => {
    expect(canCreateEvent([Role.SuperUser])).toBe(true);
    expect(canCreateEvent([Role.Admin])).toBe(true);
  });

  it('allows an organization admin', () => {
    expect(canCreateEvent([Role.OrganizationAdmin])).toBe(true);
  });

  it('allows a role set that contains any permitted role', () => {
    expect(canCreateEvent([Role.Athlete, Role.OrganizationAdmin])).toBe(true);
  });

  it('refuses roles that only read or run events', () => {
    expect(canCreateEvent([Role.Athlete])).toBe(false);
    expect(canCreateEvent([Role.Coach, Role.ServiceAccount, Role.EntityAdmin])).toBe(false);
  });

  it('refuses an empty or missing role set', () => {
    expect(canCreateEvent([])).toBe(false);
    expect(canCreateEvent(null)).toBe(false);
    expect(canCreateEvent(undefined)).toBe(false);
  });
});

describe('isAdminUser', () => {
  it('accepts a user object and reads its roles', () => {
    expect(isAdminUser({ roles: [Role.Admin] })).toBe(true);
    expect(isAdminUser({ roles: [Role.SuperUser] })).toBe(true);
  });

  it('does not treat an organization admin as a global admin', () => {
    expect(isAdminUser({ roles: [Role.OrganizationAdmin] })).toBe(false);
  });

  it('handles a missing user or roles array', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser({ roles: null })).toBe(false);
    expect(isAdminUser({})).toBe(false);
  });
});

describe('roleAuthority', () => {
  it('ranks the admin roles in order', () => {
    expect(roleAuthority(Role.SuperUser)).toBeGreaterThan(roleAuthority(Role.Admin));
    expect(roleAuthority(Role.Admin)).toBeGreaterThan(roleAuthority(Role.OrganizationAdmin));
    expect(roleAuthority(Role.OrganizationAdmin)).toBeGreaterThan(roleAuthority(Role.EntityAdmin));
    expect(roleAuthority(Role.EntityAdmin)).toBeGreaterThan(roleAuthority(Role.Coach));
    expect(roleAuthority(Role.Coach)).toBeGreaterThan(roleAuthority(Role.Athlete));
  });

  it('gives a role it doesn’t know no authority at all', () => {
    expect(roleAuthority('Wizard')).toBe(0);
  });
});

describe('canAssignRole', () => {
  it('lets a super user assign anything', () => {
    for (const role of ROLES) {
      expect(canAssignRole([Role.SuperUser], role)).toBe(true);
    }
  });

  it('lets an admin assign admins and below, but not super users', () => {
    expect(canAssignRole([Role.Admin], Role.Admin)).toBe(true);
    expect(canAssignRole([Role.Admin], Role.OrganizationAdmin)).toBe(true);
    expect(canAssignRole([Role.Admin], Role.Coach)).toBe(true);
    expect(canAssignRole([Role.Admin], Role.SuperUser)).toBe(false);
  });

  it('stops an organization admin at their own level', () => {
    expect(canAssignRole([Role.OrganizationAdmin], Role.OrganizationAdmin)).toBe(true);
    expect(canAssignRole([Role.OrganizationAdmin], Role.EntityAdmin)).toBe(true);
    expect(canAssignRole([Role.OrganizationAdmin], Role.Admin)).toBe(false);
    expect(canAssignRole([Role.OrganizationAdmin], Role.SuperUser)).toBe(false);
  });

  it('stops an entity admin at their own level', () => {
    expect(canAssignRole([Role.EntityAdmin], Role.EntityAdmin)).toBe(true);
    expect(canAssignRole([Role.EntityAdmin], Role.Coach)).toBe(true);
    expect(canAssignRole([Role.EntityAdmin], Role.OrganizationAdmin)).toBe(false);
  });

  it('reads the strongest role in the set', () => {
    expect(canAssignRole([Role.Athlete, Role.OrganizationAdmin], Role.OrganizationAdmin)).toBe(true);
    expect(canAssignRole([Role.Coach, Role.Admin], Role.OrganizationAdmin)).toBe(true);
  });

  it('refuses when the set is empty or unknown', () => {
    expect(canAssignRole([], Role.Athlete)).toBe(false);
    expect(canAssignRole(null, Role.Athlete)).toBe(false);
    expect(canAssignRole(undefined, Role.Athlete)).toBe(false);
    expect(canAssignRole(['Wizard'], Role.Athlete)).toBe(false);
  });
});

describe('assignableRoles', () => {
  it('offers the whole list strongest first to a super user', () => {
    expect(assignableRoles([Role.SuperUser])).toEqual(ROLE_AUTHORITY);
  });

  it('offers a coach the read-only roles below it', () => {
    expect(assignableRoles([Role.Coach])).toEqual([
      Role.Coach,
      Role.ServiceAccount,
      Role.AlphaTester,
      Role.BetaTester,
      Role.Athlete,
    ]);
  });

  it('offers nothing to someone with no roles', () => {
    expect(assignableRoles(null)).toEqual([]);
    expect(assignableRoles(['Wizard'])).toEqual([]);
  });
});
