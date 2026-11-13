/**
 * Street-address helpers.
 */

import type { Address, AddressRequest } from '../api/api.addresses';

/** Country an address is created in when the caller does not say otherwise. */
const DEFAULT_COUNTRY_CODE = 'US';

/**
 * Single-line form of an address, e.g. `123 Main St, Unit 4, Boston, MA 02110`.
 *
 * Missing parts are dropped, so a street-only address reads `123 Main St`.
 */
export function formatAddress(address?: Address | null): string {
  if (!address) return '';
  const cityLine = [address.city, [address.region, address.postalCode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [address.line1, address.line2, cityLine].filter(Boolean).join(', ');
}

/** Editable draft of an address, blank when there is none yet. */
export function addressDraft(address?: Address | null): AddressRequest {
  return {
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    region: address?.region ?? '',
    postalCode: address?.postalCode ?? '',
    countryCode: address?.countryCode ?? DEFAULT_COUNTRY_CODE,
    latitude: address?.latitude ?? null,
    longitude: address?.longitude ?? null,
    timeZoneId: address?.timeZoneId ?? null,
  };
}

/** True when the draft has a street line — the one field the API requires. */
export function hasStreetAddress(draft: AddressRequest): boolean {
  return (draft.line1 ?? '').trim().length > 0;
}

/** Trim the draft and turn the blank optional fields into null. */
export function toAddressRequest(draft: AddressRequest): AddressRequest {
  const text = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  };

  return {
    line1: text(draft.line1) ?? '',
    line2: text(draft.line2),
    city: text(draft.city),
    region: text(draft.region),
    postalCode: text(draft.postalCode),
    countryCode: text(draft.countryCode) ?? DEFAULT_COUNTRY_CODE,
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
    timeZoneId: text(draft.timeZoneId),
  };
}
