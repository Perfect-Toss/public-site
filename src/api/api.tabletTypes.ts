/**
 * Tablet Types API functions
 */

import { api } from './index';
import type { components } from './schema';

export type TabletType = components['schemas']['TabletType'];
export type CreateTabletTypeRequest = components['schemas']['CreateTabletTypeRequest'];
export type UpdateTabletTypeRequest = components['schemas']['UpdateTabletTypeRequest'];

/**
 * Fetch all tablet types (requires admin authorization)
 */
export async function fetchAllTabletTypes(): Promise<TabletType[]> {
  const { data, error } = await api.GET('/api/v1/tablets/types', {});

  if (error) {
    console.error('Failed to fetch tablet types:', error);
    throw new Error('Failed to fetch tablet types');
  }

  return data || [];
}

/**
 * Fetch a specific tablet type by ID (requires admin authorization)
 */
export async function fetchTabletTypeById(id: string): Promise<TabletType | null> {
  const { data, error } = await api.GET('/api/v1/tablets/types/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to fetch tablet type:', error);
    throw new Error('Failed to fetch tablet type');
  }

  return data ?? null;
}

/**
 * Create a new tablet type (requires admin authorization)
 */
export async function createTabletType(typeData: CreateTabletTypeRequest): Promise<TabletType | null> {
  const { data, error } = await api.POST('/api/v1/tablets/types', {
    body: typeData,
  });

  if (error) {
    console.error('Failed to create tablet type:', error);
    throw new Error('Failed to create tablet type');
  }

  return data ?? null;
}

/**
 * Update an existing tablet type (requires admin authorization)
 */
export async function updateTabletType(id: string, typeData: UpdateTabletTypeRequest): Promise<TabletType | null> {
  const { data, error } = await api.PUT('/api/v1/tablets/types/{id}', {
    params: { path: { id } },
    body: typeData,
  });

  if (error) {
    console.error('Failed to update tablet type:', error);
    throw new Error('Failed to update tablet type');
  }

  return data ?? null;
}

/**
 * Delete a tablet type (requires admin authorization)
 */
export async function deleteTabletType(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/tablets/types/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete tablet type:', error);
    throw new Error('Failed to delete tablet type');
  }

  return true;
}
