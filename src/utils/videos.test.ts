import { describe, expect, it } from 'vitest';
import { highestAccessLevel, isVideoOrganizationStaff } from './videos';

describe('isVideoOrganizationStaff', () => {
  it('accepts a coach', () => {
    expect(isVideoOrganizationStaff(['Coach'])).toBe(true);
  });

  it('accepts an entity admin', () => {
    expect(isVideoOrganizationStaff(['EntityAdmin'])).toBe(true);
  });

  it('accepts an organization admin', () => {
    expect(isVideoOrganizationStaff(['OrganizationAdmin'])).toBe(true);
  });

  it('accepts staff roles held alongside other roles', () => {
    expect(isVideoOrganizationStaff(['Athlete', 'Coach'])).toBe(true);
  });

  it('rejects an athlete membership', () => {
    expect(isVideoOrganizationStaff(['Athlete'])).toBe(false);
  });

  it('rejects an empty role list', () => {
    expect(isVideoOrganizationStaff([])).toBe(false);
  });

  it('rejects an unknown organization', () => {
    expect(isVideoOrganizationStaff(undefined)).toBe(false);
  });
});

describe('highestAccessLevel', () => {
  it('returns an edit grant over a review grant', () => {
    expect(highestAccessLevel(['Review', 'Edit'])).toBe('Edit');
  });

  it('returns a review grant over a read-only grant', () => {
    expect(highestAccessLevel(['ReadOnly', 'Review'])).toBe('Review');
  });

  it('is order independent', () => {
    expect(highestAccessLevel(['Edit', 'ReadOnly'])).toBe('Edit');
  });

  it('returns the only grant it was given', () => {
    expect(highestAccessLevel(['ReadOnly'])).toBe('ReadOnly');
  });

  it('falls back to read only when nothing is granted', () => {
    expect(highestAccessLevel([])).toBe('ReadOnly');
  });
});
