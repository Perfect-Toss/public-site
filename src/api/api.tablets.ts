/**
 * Tablets API functions
 */
import { api } from './index';
import type { components } from './schema';

export type Tablet = components['schemas']['Tablet'];
export type CreateTabletRequest = components['schemas']['CreateTabletRequest'];
export type UpdateTabletRequest = components['schemas']['UpdateTabletRequest'];

/**
 * Fetch all tablets (requires admin authorization)
 */
export async function fetchAllTablets(): Promise<Tablet[]> {
  const { data, error } = await api.GET('/api/v1/tablets', {});

  if (error) {
    console.error('Failed to fetch tablets:', error);
    throw new Error('Failed to fetch tablets');
  }

  return data?.data || [];
}

/**
 * Fetch a specific tablet by ID (requires admin authorization)
 */
export async function fetchTabletById(id: string): Promise<Tablet | null> {
  const { data, error } = await api.GET('/api/v1/tablets/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to fetch tablet:', error);
    throw new Error('Failed to fetch tablet');
  }

  return data?.data || null;
}

/**
 * Create a new tablet (requires admin authorization)
 */
export async function createTablet(tabletData: CreateTabletRequest): Promise<Tablet | null> {
  const { data, error } = await api.POST('/api/v1/tablets', {
    body: tabletData,
  });

  if (error) {
    console.error('Failed to create tablet:', error);
    throw new Error('Failed to create tablet');
  }

  return data?.data || null;
}

/**
 * Update an existing tablet (requires admin authorization)
 */
export async function updateTablet(id: string, tabletData: UpdateTabletRequest): Promise<Tablet | null> {
  const { data, error } = await api.PUT('/api/v1/tablets/{id}', {
    params: { path: { id } },
    body: tabletData,
  });

  if (error) {
    console.error('Failed to update tablet:', error);
    throw new Error('Failed to update tablet');
  }

  return data?.data || null;
}

/**
 * Delete a tablet (requires admin authorization)
 */
export async function deleteTablet(id: string): Promise<boolean> {
  const { data, error } = await api.DELETE('/api/v1/tablets/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete tablet:', error);
    throw new Error('Failed to delete tablet');
  }

  return data?.succeeded || false;
}
