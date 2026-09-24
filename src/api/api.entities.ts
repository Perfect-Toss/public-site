/**
 * Entities API functions
 */

import { api } from './index';
import type { components } from './schema';

export type Entity = components['schemas']['Entity'];
export type EntityMembership = components['schemas']['EntityMembership'];
export type EntityMember = components['schemas']['EntityMember'];
export type UserInfo = components['schemas']['UserInfo'];
export type CreateEntityRequest = components['schemas']['CreateEntityRequest'];
export type UpdateEntityRequest = components['schemas']['UpdateEntityRequest'];
export type AddUserToEntityRequest = components['schemas']['AddUserToEntityRequest'];
export type UpdateUserRolesForEntityRequest = components['schemas']['UpdateUserRolesForEntityRequest'];
export type EntityUserRole = components['schemas']['Roles'];

/**
 * Fetch all root-level entities (organizations without a parent)
 */
export async function fetchEntities(): Promise<Entity[]> {
  const { data, error } = await api.GET('/api/v1/entities', {});
  
  if (error) {
    console.error('Failed to fetch entities:', error);
    throw new Error('Failed to fetch entities');
  }
  
  return (data || []) as Entity[];
}

/**
 * Fetch the entities the current user has access to (every entity for admins).
 * Pass `includeUsers` to have each entity carry its members and their roles.
 */
export async function fetchAllEntities(includeUsers = false): Promise<EntityMembership[]> {
  const { data, error } = await api.GET('/api/v1/entities/all', {
    params: { query: { includeUsers } },
  });

  if (error) {
    console.error('Failed to fetch all entities:', error);
    throw new Error('Failed to fetch all entities');
  }

  return data || [];
}

/**
 * Fetch a specific entity by ID
 */
export async function fetchEntityById(id: string): Promise<Entity | null> {
  const { data, error } = await api.GET('/api/v1/entities/id/{id}', {
    params: { path: { id } },
  });
  
  if (error) {
    console.error('Failed to fetch entity:', error);
    throw new Error('Failed to fetch entity');
  }
  
  return (data ?? null) as Entity | null;
}

/**
 * Fetch all entities of a specific type
 */
export async function fetchEntitiesByType(entityType: string): Promise<Entity[]> {
  const { data, error } = await api.GET('/api/v1/entities/type/{entityType}', {
    params: { path: { entityType } },
  });
  
  if (error) {
    console.error('Failed to fetch entities by type:', error);
    throw new Error('Failed to fetch entities by type');
  }
  
  return (data || []) as Entity[];
}

/**
 * Fetch all child entities of a specific parent entity
 */
export async function fetchChildEntities(parentEntityId: string): Promise<Entity[]> {
  const { data, error } = await api.GET('/api/v1/entities/parent/{parentEntityId}', {
    params: { path: { parentEntityId } },
  });
  
  if (error) {
    console.error('Failed to fetch child entities:', error);
    throw new Error('Failed to fetch child entities');
  }
  
  return (data || []) as Entity[];
}

/**
 * Create a new entity
 */
export async function createEntity(entityData: CreateEntityRequest): Promise<Entity | null> {
  const { data, error } = await api.POST('/api/v1/entities', {
    body: entityData,
  });
  
  if (error) {
    console.error('Failed to create entity:', error);
    throw new Error('Failed to create entity');
  }
  
  return (data ?? null) as Entity | null;
}

/**
 * Update an existing entity
 */
export async function updateEntity(id: string, entityData: UpdateEntityRequest): Promise<Entity | null> {
  const { data, error } = await api.PUT('/api/v1/entities/{id}', {
    params: { path: { id } },
    body: entityData,
  });
  
  if (error) {
    console.error('Failed to update entity:', error);
    throw new Error('Failed to update entity');
  }
  
  return (data ?? null) as Entity | null;
}

/**
 * Delete an entity
 */
export async function deleteEntity(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/entities/{id}', {
    params: { path: { id } },
  });
  
  if (error) {
    console.error('Failed to delete entity:', error);
    throw new Error('Failed to delete entity');
  }
  
  return true;
}

/**
 * Fetch users for a specific entity
 */
export async function fetchEntityUsers(entityId: string): Promise<components['schemas']['User'][]> {
  const { data, error } = await api.GET('/api/v1/entities/{entityId}/users', {
    params: { path: { entityId } },
  });

  if (error) {
    console.error('Failed to fetch entity users:', error);
    throw new Error('Failed to fetch entity users');
  }

  return data || [];
}

/**
 * Fetch the roles a user holds on a specific entity.
 * A user with no roles on the entity (or an entity they cannot see) yields [].
 */
export async function fetchEntityUserRoles(
  entityId: string,
  userId: string,
): Promise<EntityUserRole[]> {
  const { data, error } = await api.GET('/api/v1/entities/{entityId}/users/{userId}', {
    params: { path: { entityId, userId } },
  });

  if (error) {
    console.error('Failed to fetch entity user roles:', error);
    return [];
  }

  return data || [];
}

/**
 * Add a user to an entity with specific roles
 */
export async function addUserToEntity(
  entityId: string, 
  userId: string, 
  roles: AddUserToEntityRequest
): Promise<boolean> {
  const { error } = await api.POST('/api/v1/entities/{entityId}/users/{userId}', {
    params: { path: { entityId, userId } },
    body: roles,
  });
  
  if (error) {
    console.error('Failed to add user to entity:', error);
    throw new Error('Failed to add user to entity');
  }
  
  return true;
}

/**
 * Replace the roles a user holds on an entity. Send the full set they should
 * end up with, not just the additions or removals.
 */
export async function updateEntityUserRoles(
  entityId: string,
  userId: string,
  roles: UpdateUserRolesForEntityRequest,
): Promise<boolean> {
  const { error } = await api.PUT('/api/v1/entities/{entityId}/users/{userId}/roles', {
    params: { path: { entityId, userId } },
    body: roles,
  });

  if (error) {
    console.error('Failed to update entity user roles:', error);
    throw new Error('Failed to update entity user roles');
  }

  return true;
}

/**
 * Remove a user from an entity
 */
export async function removeUserFromEntity(entityId: string, userId: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/entities/{entityId}/users/{userId}', {
    params: { path: { entityId, userId } },
  });
  
  if (error) {
    console.error('Failed to remove user from entity:', error);
    throw new Error('Failed to remove user from entity');
  }
  
  return true;
}

/**
 * Fetch all entities associated with a specific user.
 */
export async function fetchEntitiesForUser(userId: string): Promise<Entity[]> {
  const { data, error } = await api.GET('/api/v1/entities/user/{userId}', {
    params: { path: { userId } },
  });

  if (error) {
    console.error('Failed to fetch user entities:', error);
    throw new Error('Failed to fetch user entities');
  }

  return data || [];
}

/**
 * Alias for fetchEntities - fetch organizations
 */
export const fetchOrganizations = fetchEntities;
