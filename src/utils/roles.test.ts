import { describe, expect, it } from 'vitest';
import { Role, canCreateEvent, isAdminUser } from './roles';

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
