/**
 * Addresses API functions
 *
 * An entity's address is created and replaced through the entity endpoints
 * (see `CreateEntityRequest.address` / `UpdateEntityRequest.address`). These
 * endpoints address a stored address on its own.
 */

import { api } from './index';
import type { components } from './schema';

export type Address = components['schemas']['Address'];
export type AddressRequest = components['schemas']['AddressRequest'];

/**
 * Get a specific address by its identifier.
 */
export async function fetchAddressById(id: string): Promise<Address | null> {
  const { data, error } = await api.GET('/api/v1/addresses/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to fetch address:', error);
    throw new Error('Failed to fetch address');
  }

  return data ?? null;
}

/**
 * Create an address for an organization or site.
 */
export async function createAddress(address: AddressRequest): Promise<Address | null> {
  const { data, error } = await api.POST('/api/v1/addresses', {
    body: address,
  });

  if (error) {
    console.error('Failed to create address:', error);
    throw new Error('Failed to create address');
  }

  return data ?? null;
}

/**
 * Replace the details of an existing address.
 */
export async function updateAddress(id: string, address: AddressRequest): Promise<Address | null> {
  const { data, error } = await api.PUT('/api/v1/addresses/{id}', {
    params: { path: { id } },
    body: address,
  });

  if (error) {
    console.error('Failed to update address:', error);
    throw new Error('Failed to update address');
  }

  return data ?? null;
}

/**
 * Delete an address that no entity references.
 */
export async function deleteAddress(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/addresses/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete address:', error);
    throw new Error('Failed to delete address');
  }

  return true;
}
