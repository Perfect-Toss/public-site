import { addressDraft, formatAddress, hasStreetAddress, toAddressRequest } from './address';
import { describe, expect, it } from 'vitest';

import type { Address } from '../api/api.addresses';

const stored: Address = {
  id: 'addr-1',
  line1: '123 Main St',
  line2: 'Unit 4',
  city: 'Boston',
  region: 'MA',
  postalCode: '02110',
  countryCode: 'US',
  latitude: 42.36,
  longitude: -71.06,
  timeZoneId: 'America/New_York',
};

describe('formatAddress', () => {
  it('joins the street, unit and city line', () => {
    expect(formatAddress(stored)).toBe('123 Main St, Unit 4, Boston, MA 02110');
  });

  it('drops the parts that are missing', () => {
    expect(
      formatAddress({ id: 'addr-2', line1: '1 Elm St', city: 'Salem', region: 'MA' }),
    ).toBe('1 Elm St, Salem, MA');
    expect(formatAddress({ id: 'addr-3', line1: '1 Elm St' })).toBe('1 Elm St');
  });

  it('is empty without an address', () => {
    expect(formatAddress(null)).toBe('');
    expect(formatAddress(undefined)).toBe('');
  });
});

describe('addressDraft', () => {
  it('copies what the server stored, coordinates included', () => {
    expect(addressDraft(stored)).toEqual({
      line1: '123 Main St',
      line2: 'Unit 4',
      city: 'Boston',
      region: 'MA',
      postalCode: '02110',
      countryCode: 'US',
      latitude: 42.36,
      longitude: -71.06,
      timeZoneId: 'America/New_York',
    });
  });

  it('is blank, in the default country, when there is none', () => {
    expect(addressDraft()).toEqual({
      line1: '',
      line2: '',
      city: '',
      region: '',
      postalCode: '',
      countryCode: 'US',
      latitude: null,
      longitude: null,
      timeZoneId: null,
    });
  });
});

describe('hasStreetAddress', () => {
  it('needs a street line', () => {
    expect(hasStreetAddress({ line1: '' })).toBe(false);
    expect(hasStreetAddress({ line1: '   ' })).toBe(false);
    expect(hasStreetAddress({ line1: null })).toBe(false);
    expect(hasStreetAddress({ line1: '1 Elm St' })).toBe(true);
  });
});

describe('toAddressRequest', () => {
  it('trims every field and blanks the empty ones', () => {
    expect(
      toAddressRequest({
        line1: '  1 Elm St  ',
        line2: '  ',
        city: ' Salem ',
        region: 'MA',
        postalCode: '',
        countryCode: null,
        latitude: 42.5,
        longitude: null,
        timeZoneId: '  ',
      }),
    ).toEqual({
      line1: '1 Elm St',
      line2: null,
      city: 'Salem',
      region: 'MA',
      postalCode: null,
      countryCode: 'US',
      latitude: 42.5,
      longitude: null,
      timeZoneId: null,
    });
  });
});
