/**
 * Entities API functions
 */
import { api } from './index';
import type { components } from './schema';

export type Entity = components['schemas']['Entity'];
export type CreateEntityRequest = components['schemas']['CreateEntityRequest'];
export type UpdateEntityRequest = components['schemas']['UpdateEntityRequest'];
export type AddUserToEntityRequest = components['schemas']['AddUserToEntityRequest'];

/**
 * Fetch all root-level entities (organizations without a parent)
 */
export async function fetchEntities() {
  const { data, error } = await api.GET('/api/v1/entities', {});
  
  if (error) {
    console.error('Failed to fetch entities:', error);
    throw new Error('Failed to fetch entities');
  }
  
  return data?.data || [];
}

/**
 * Fetch all entities in the system
 */
export async function fetchAllEntities() {
  const { data, error } = await api.GET('/api/v1/entities/all', {});
  
  if (error) {
    console.error('Failed to fetch all entities:', error);
    throw new Error('Failed to fetch all entities');
  }
  
  return data?.data || [];
}

/**
 * Fetch a specific entity by ID
 */
export async function fetchEntityById(id: string) {
  const { data, error } = await api.GET('/api/v1/entities/id/{id}', {
    params: { path: { id } },
  });
  
  if (error) {
    console.error('Failed to fetch entity:', error);
    throw new Error('Failed to fetch entity');
  }
  
  return data?.data || null;
}

/**
 * Fetch all entities of a specific type
 */
export async function fetchEntitiesByType(entityType: string) {
  const { data, error } = await api.GET('/api/v1/entities/type/{entityType}', {
    params: { path: { entityType } },
  });
  
  if (error) {
    console.error('Failed to fetch entities by type:', error);
    throw new Error('Failed to fetch entities by type');
  }
  
  return data?.data || [];
}

/**
 * Fetch all child entities of a specific parent entity
 */
export async function fetchChildEntities(parentEntityId: string) {
  const { data, error } = await api.GET('/api/v1/entities/parent/{parentEntityId}', {
    params: { path: { parentEntityId } },
  });
  
  if (error) {
    console.error('Failed to fetch child entities:', error);
    throw new Error('Failed to fetch child entities');
  }
  
  return data?.data || [];
}

/**
 * Create a new entity
 */
export async function createEntity(entityData: CreateEntityRequest) {
  const { data, error } = await api.POST('/api/v1/entities', {
    body: entityData,
  });
  
  if (error) {
    console.error('Failed to create entity:', error);
    throw new Error('Failed to create entity');
  }
  
  return data?.data || null;
}

/**
 * Update an existing entity
 */
export async function updateEntity(id: string, entityData: UpdateEntityRequest) {
  const { data, error } = await api.PUT('/api/v1/entities/{id}', {
    params: { path: { id } },
    body: entityData,
  });
  
  if (error) {
    console.error('Failed to update entity:', error);
    throw new Error('Failed to update entity');
  }
  
  return data?.data || null;
}

/**
 * Delete an entity
 */
export async function deleteEntity(id: string) {
  const { data, error } = await api.DELETE('/api/v1/entities/{id}', {
    params: { path: { id } },
  });
  
  if (error) {
    console.error('Failed to delete entity:', error);
    throw new Error('Failed to delete entity');
  }
  
  return data?.succeeded || false;
}

/**
 * Fetch users for a specific entity
 */
export async function fetchEntityUsers(entityId: string) {
  const { data, error } = await api.GET('/api/v1/entities/{entityId}/users', {
    params: { path: { entityId } },
  });

  if (error) {
    console.error('Failed to fetch entity users:', error);
    throw new Error('Failed to fetch entity users');
  }

  return data?.data || [];
}

/**
 * Add a user to an entity with specific roles
 */
export async function addUserToEntity(
  entityId: string, 
  userId: string, 
  roles: AddUserToEntityRequest
) {
  const { data, error } = await api.POST('/api/v1/entities/{entityId}/users/{userId}', {
    params: { path: { entityId, userId } },
    body: roles,
  });
  
  if (error) {
    console.error('Failed to add user to entity:', error);
    throw new Error('Failed to add user to entity');
  }
  
  return data?.succeeded || false;
}

/**
 * Remove a user from an entity
 */
export async function removeUserFromEntity(entityId: string, userId: string) {
  const { data, error } = await api.DELETE('/api/v1/entities/{entityId}/users/{userId}', {
    params: { path: { entityId, userId } },
  });
  
  if (error) {
    console.error('Failed to remove user from entity:', error);
    throw new Error('Failed to remove user from entity');
  }
  
  return data?.succeeded || false;
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

  return data?.data || [];
}

/**
 * Alias for fetchEntities - fetch organizations
 */
export const fetchOrganizations = fetchEntities;
