/**
 * Users API functions
 */
import { api } from './index';
import type { components } from './schema';

export type User = components['schemas']['User'];
export type CreateUserDto = components['schemas']['CreateUserDto'];
export type UpdateUserDto = components['schemas']['UpdateUserDto'];
export type CreateAthletesDto = components['schemas']['CreateAthletesDto'];
export type CreateCoachesDto = components['schemas']['CreateCoachesDto'];
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
