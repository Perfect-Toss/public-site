/**
 * Tags API functions
 *
 * Types are re-exported directly from the auto-generated schema so that
 * any schema rename/removal produces a compile-time error at every usage site.
 * No intermediate models, mappers, or type casts.
 */

import { api } from './index';
import type { components } from './schema';

export type Tag = components['schemas']['Tag'];
export type CreateTagRequest = components['schemas']['CreateTagRequest'];
export type UpdateTagRequest = components['schemas']['UpdateTagRequest'];

/**
 * Get all global tags and tags created by the current user.
 */
export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await api.GET('/api/v1/tags', {});

  if (error) {
    console.error('Failed to fetch tags:', error);
    throw new Error('Failed to fetch tags');
  }

  return data || [];
}

/**
 * Create a new tag. Only admins can create global tags.
 */
export async function createTag(tagData: CreateTagRequest): Promise<Tag | null> {
  const { data, error } = await api.POST('/api/v1/tags', {
    body: tagData,
  });

  if (error) {
    console.error('Failed to create tag:', error);
    throw new Error('Failed to create tag');
  }

  return data ?? null;
}

/**
 * Update an existing tag. Only admins can update global tags;
 * users can update tags they created.
 */
export async function updateTag(id: string, tagData: UpdateTagRequest): Promise<Tag | null> {
  const { data, error } = await api.PUT('/api/v1/tags/{id}', {
    params: { path: { id } },
    body: tagData,
  });

  if (error) {
    console.error('Failed to update tag:', error);
    throw new Error('Failed to update tag');
  }

  return data ?? null;
}

/**
 * Delete a tag. Only admins can delete global tags;
 * users can delete tags they created.
 */
export async function deleteTag(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/tags/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete tag:', error);
    throw new Error('Failed to delete tag');
  }

  return true;
}
