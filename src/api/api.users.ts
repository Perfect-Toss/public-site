/**
 * Users API functions
 *
 * Types are re-exported directly from the auto-generated schema so that
 * any schema rename/removal produces a compile-time error at every usage site.
 * No intermediate models, mappers, or type casts.
 */

import { api } from './index';
import type { components } from './schema';

export { Role, ROLES, isAdminUser } from '../utils/roles';

export type User = components['schemas']['User'];
export type CreateUserDto = components['schemas']['CreateUserDto'];
export type UpdateUserDto = components['schemas']['UpdateUserDto'];
export type CreateAthletesDto = components['schemas']['CreateAthletesDto'];
export type CreateCoachesDto = components['schemas']['CreateCoachesDto'];

/**
 * Get all users (requires admin authorization)
 */
export async function fetchAllUsers(): Promise<User[]> {
  const { data, error } = await api.GET('/api/v1/users', {});
  
  if (error) {
    console.error('Failed to fetch all users:', error);
    throw new Error('Failed to fetch all users');
  }
  
  return data || [];
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserDto): Promise<User> {
  const { data, error } = await api.POST('/api/v1/users', {
    body: userData,
  });
  
  if (error) {
    console.error('Failed to create user:', error);
    throw new Error('Failed to create user');
  }
  
  return data as User;
}

/**
 * Update user information
 */
export async function updateUser(userData: UpdateUserDto): Promise<User> {
  const { data, error } = await api.PUT('/api/v1/users', {
    body: userData,
  });
  
  if (error) {
    console.error('Failed to update user:', error);
    throw new Error('Failed to update user');
  }
  
  return data as User;
}

/**
 * Get all service accounts (requires admin authorization)
 */
export async function fetchServiceAccounts(): Promise<User[]> {
  const { data, error } = await api.GET('/api/v1/users/serviceaccounts', {});
  
  if (error) {
    console.error('Failed to fetch service accounts:', error);
    throw new Error('Failed to fetch service accounts');
  }
  
  return data || [];
}

/**
 * Get a specific user by ID (requires admin authorization)
 */
export async function fetchUserById(id: string): Promise<User | null> {
  const { data, error } = await api.GET('/api/v1/users/{id}', {
    params: { path: { id } },
  });
  
  if (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user');
  }
  
  return data ?? null;
}

/**
 * Fetch the currently authenticated user's profile (v2).
 * Returns the User object directly, or null if not found.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  const { data, error } = await api.GET('/api/v2/users/current', {});
  
  if (error) {
    console.error('Failed to fetch current user:', error);
    throw new Error('Failed to fetch current user');
  }
  
  return data ?? null;
}

/**
 * Accept or decline terms for a user by email
 */
export async function acceptUserTerms(email: string, accepted: boolean = true): Promise<void> {
  const { error } = await api.GET('/api/v1/users/accept', {
    params: { query: { email, accepted } },
  });
  
  if (error) {
    console.error('Failed to accept user terms:', error);
    throw new Error('Failed to accept user terms');
  }
}

/**
 * Create a new service account (requires admin authorization)
 */
export async function createServiceAccount(userData: CreateUserDto): Promise<User> {
  const { data, error } = await api.POST('/api/v1/users/serviceaccount', {
    body: userData,
  });
  
  if (error) {
    console.error('Failed to create service account:', error);
    throw new Error('Failed to create service account');
  }
  
  return data as User;
}

/**
 * Batch create athlete accounts (requires admin authorization)
 */
export async function createAthletes(athletesData: CreateAthletesDto): Promise<User[]> {
  const { data, error } = await api.POST('/api/v1/users/athletes', {
    body: athletesData,
  });
  
  if (error) {
    console.error('Failed to create athletes:', error);
    throw new Error('Failed to create athletes');
  }
  
  return data || [];
}

/**
 * Batch create coach accounts (requires admin authorization)
 */
export async function createCoaches(coachesData: CreateCoachesDto): Promise<User[]> {
  const { data, error } = await api.POST('/api/v1/users/coaches', {
    body: coachesData,
  });
  
  if (error) {
    console.error('Failed to create coaches:', error);
    throw new Error('Failed to create coaches');
  }
  
  return data || [];
}

/**
 * Sync users with external system (requires super user authorization)
 */
export async function syncUsers(): Promise<User[]> {
  const { data, error } = await api.PATCH('/api/v1/users/sync', {});
  
  if (error) {
    console.error('Failed to sync users:', error);
    throw new Error('Failed to sync users');
  }
  
  return data || [];
}

/**
 * Delete a user by their identifier (requires super user authorization)
 */
export async function deleteUserById(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/users/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete user:', error);
    throw new Error('Failed to delete user');
  }

  return true;
}