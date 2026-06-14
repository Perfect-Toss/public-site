/**
 * Type-safe API functions using the auto-generated client
 * 
 * This file provides wrapper functions for all available API endpoints.
 * All types are automatically generated from the OpenAPI spec!
 */

import { api } from './index';
import type { components } from './schema';

// Types are automatically extracted from the OpenAPI schema
export type EventLog = components['schemas']['EventLog'];
export type CreateEventLogDto = components['schemas']['CreateEventLogDto'];
export type CreateEventLogsDto = components['schemas']['CreateEventLogsDto'];
export type User = components['schemas']['User'];
export type CreateUserDto = components['schemas']['CreateUserDto'];
export type UpdateUserDto = components['schemas']['UpdateUserDto'];
export type CreateAthletesDto = components['schemas']['CreateAthletesDto'];
export type CreateCoachesDto = components['schemas']['CreateCoachesDto'];
export type Entity = components['schemas']['Entity'];
export type CreateEntityRequest = components['schemas']['CreateEntityRequest'];
export type UpdateEntityRequest = components['schemas']['UpdateEntityRequest'];
export type AddUserToEntityRequest = components['schemas']['AddUserToEntityRequest'];
export type LoginInfo = components['schemas']['LoginInfo'];
export type MetaResponse = components['schemas']['MetaResponse'];
export type Roles = components['schemas']['Roles'];
/** Runtime array of all possible role values, matching the Roles schema type. */
export const ROLES: Roles[] = [
  'Athlete',
  'Coach',
  'EntityAdmin',
  'OrganizationAdmin',
  'Admin',
  'ServiceAccount',
  'AlphaTester',
  'BetaTester',
  'SuperUser',
];
export type EventLogUserSummary = components['schemas']['EventLogUserSummary'];
export type EventLogMonthlySummary = components['schemas']['EventLogMonthlySummary'];
export type EventLogSearchCriteriaDto = components['schemas']['EventLogSearchCriteriaDto'];
export type EventLogIEnumerablePagedResponse = components['schemas']['EventLogIEnumerablePagedResponse'];
export type StringIEnumerableGenericResponse = components['schemas']['StringIEnumerableGenericResponse'];

// ============================================================================
// Auth API
// ============================================================================

/**
 * Login with username and password
 */
export async function login(username: string, password: string) {
  const { data, error } = await api.POST('/api/v1/auth/token', {
    body: { username, password },
  });
  
  if (error) {
    console.error('Login failed:', error);
    throw new Error('Login failed');
  }
  
  return data;
}

// ============================================================================
// EventLogs API
// ============================================================================

/**
 * Create a single event log
 */
export async function createEventLog(eventData: CreateEventLogDto) {
  const { data, error } = await api.POST('/api/v1/eventlogs', {
    body: eventData,
  });
  
  if (error) {
    console.error('Failed to create event log:', error);
    throw new Error('Failed to create event log');
  }
  
  return data;
}

/**
 * Bulk create event logs
 */
export async function bulkCreateEventLogs(events: CreateEventLogDto[]) {
  const { data, error } = await api.POST('/api/v1/eventlogs/bulk', {
    body: { eventLogs: events },
  });
  
  if (error) {
    console.error('Failed to bulk create event logs:', error);
    throw new Error('Failed to bulk create event logs');
  }
  
  return data;
}

/**
 * Get event log summary data grouped by user with monthly aggregates.
 * Includes number of videos captured and days used per month.
 * Requires admin authorization.
 */
export async function fetchEventLogSummary(): Promise<EventLogUserSummary[]> {
  const { data, error } = await api.GET('/api/v1/eventlogs/summary', {});

  if (error) {
    console.error('Failed to fetch event log summary:', error);
    throw new Error('Failed to fetch event log summary');
  }

  return data?.data || [];
}

/**
 * Search event logs with flexible filtering and paging (requires admin authorization)
 */
export async function searchEventLogs(criteria: EventLogSearchCriteriaDto): Promise<EventLogIEnumerablePagedResponse> {
  const { data, error } = await api.POST('/api/v1/eventlogs/search', {
    body: criteria,
  });

  if (error) {
    console.error('Failed to search event logs:', error);
    throw new Error('Failed to search event logs');
  }

  return data ?? {};
}

/**
 * Get all event log types
 */
export async function fetchEventLogTypes(): Promise<string[]> {
  const { data, error } = await api.GET('/api/v1/eventlogs/types', {});

  if (error) {
    console.error('Failed to fetch event log types:', error);
    throw new Error('Failed to fetch event log types');
  }

  return data?.data ?? [];
}

/**
 * Get all event logs for a specific entity (requires admin authorization)
 * @deprecated This endpoint has been removed. Use searchEventLogs with entityId filter instead.
 */
export async function fetchEventLogsByEntity(entityId: string) {
  return searchEventLogs({ entityId });
}

/**
 * Get all event logs of a specific type (requires admin authorization)
 * @deprecated This endpoint has been removed. Use searchEventLogs with eventType filter instead.
 */
export async function fetchEventLogsByType(eventType: string) {
  return searchEventLogs({ eventType });
}

/**
 * Get last event timestamp for a user
 */
export async function getLastUserEvent(userId: string) {
  const { data, error } = await api.GET('/api/v1/eventlogs/user/{userId}/last', {
    params: { path: { userId } },
  });
  
  if (error) {
    console.error('Failed to fetch last event:', error);
    throw new Error('Failed to fetch last event');
  }
  
  return data;
}

// ============================================================================
// Meta API
// ============================================================================

/**
 * Get API meta information including version and user info
 */
export async function fetchMetaInfo() {
  const { data, error } = await api.GET('/api/v1/meta/info', {});
  
  if (error) {
    console.error('Failed to fetch meta info:', error);
    throw new Error('Failed to fetch meta info');
  }
  
  return data;
}

/**
 * Ping the API to check if it's alive
 */
export async function pingApi() {
  const { data, error } = await api.GET('/api/v1/meta/ping', {});
  
  if (error) {
    console.error('Failed to ping API:', error);
    throw new Error('Failed to ping API');
  }
  
  return data;
}

// ============================================================================
// Users API
// ============================================================================

/**
 * Get all users (requires admin authorization)
 */
export async function fetchAllUsers() {
  const { data, error } = await api.GET('/api/v1/users', {});
  
  if (error) {
    console.error('Failed to fetch all users:', error);
    throw new Error('Failed to fetch all users');
  }
  
  return data?.data || [];
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserDto) {
  const { data, error } = await api.POST('/api/v1/users', {
    body: userData,
  });
  
  if (error) {
    console.error('Failed to create user:', error);
    throw new Error('Failed to create user');
  }
  
  return data;
}

/**
 * Update user information
 */
export async function updateUser(userData: UpdateUserDto) {
  const { data, error } = await api.PATCH('/api/v1/users', {
    body: userData,
  });
  
  if (error) {
    console.error('Failed to update user:', error);
    throw new Error('Failed to update user');
  }
  
  return data;
}

/**
 * Get all service accounts (requires admin authorization)
 */
export async function fetchServiceAccounts() {
  const { data, error } = await api.GET('/api/v1/users/serviceaccounts', {});
  
  if (error) {
    console.error('Failed to fetch service accounts:', error);
    throw new Error('Failed to fetch service accounts');
  }
  
  return data?.data || [];
}

/**
 * Get a specific user by ID (requires admin authorization)
 */
export async function fetchUserById(id: string) {
  const { data, error } = await api.GET('/api/v1/users/{id}', {
    params: { path: { id } },
  });
  
  if (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user');
  }
  
  return data?.data || null;
}

/**
 * Fetch the currently authenticated user
 */
export async function fetchCurrentUser() {
  const { data, error } = await api.GET('/api/v1/users/current', {});
  
  if (error) {
    console.error('Failed to fetch current user:', error);
    throw new Error('Failed to fetch current user');
  }
  
  return data;
}

/**
 * Accept or decline terms for a user by email
 */
export async function acceptUserTerms(email: string, accepted: boolean = true) {
  const { data, error } = await api.GET('/api/v1/users/accept', {
    params: { query: { email, accepted } },
  });
  
  if (error) {
    console.error('Failed to accept user terms:', error);
    throw new Error('Failed to accept user terms');
  }
  
  return data;
}

/**
 * Create a new service account (requires admin authorization)
 */
export async function createServiceAccount(userData: CreateUserDto) {
  const { data, error } = await api.POST('/api/v1/users/serviceaccount', {
    body: userData,
  });
  
  if (error) {
    console.error('Failed to create service account:', error);
    throw new Error('Failed to create service account');
  }
  
  return data;
}

/**
 * Batch create athlete accounts (requires admin authorization)
 */
export async function createAthletes(athletesData: CreateAthletesDto) {
  const { data, error } = await api.POST('/api/v1/users/athletes', {
    body: athletesData,
  });
  
  if (error) {
    console.error('Failed to create athletes:', error);
    throw new Error('Failed to create athletes');
  }
  
  return data?.data || [];
}

/**
 * Batch create coach accounts (requires admin authorization)
 */
export async function createCoaches(coachesData: CreateCoachesDto) {
  const { data, error } = await api.POST('/api/v1/users/coaches', {
    body: coachesData,
  });
  
  if (error) {
    console.error('Failed to create coaches:', error);
    throw new Error('Failed to create coaches');
  }
  
  return data?.data || [];
}

/**
 * Sync users with external system (requires super user authorization)
 */
export async function syncUsers() {
  const { data, error } = await api.PATCH('/api/v1/users/sync', {});
  
  if (error) {
    console.error('Failed to sync users:', error);
    throw new Error('Failed to sync users');
  }
  
  return data?.data || [];
}

/**
 * Delete a user by their identifier (requires super user authorization)
 */
export async function deleteUserById(id: string) {
  const { data, error } = await api.DELETE('/api/v1/users/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete user:', error);
    throw new Error('Failed to delete user');
  }

  return data?.succeeded ?? false;
}

// ============================================================================
// Entities API
// ============================================================================

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

export async function fetchEntityUsers(entityId: string) {
  const { data, error } = await api.GET('/api/v1/entities/{entityId}/users', {
    params: { path: { entityId } },
  });

  if (error) {
    console.error('Failed to fetch entity users:', error);
    throw new Error('Failed to fetch entity users');
  }

  return data?.data || [];
};

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

// ============================================================================
// Deprecated aliases (for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use fetchMetaInfo instead
 */
export const fetchUserInfo = fetchMetaInfo;

/**
 * Alias for fetchEntities - fetch organizations
 */
export const fetchOrganizations = fetchEntities;
