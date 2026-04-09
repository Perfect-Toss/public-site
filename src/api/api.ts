/**
 * Type-safe API functions using the auto-generated client
 * 
 * This file demonstrates how to use the type-safe API client.
 * All types are automatically generated from your OpenAPI spec!
 */

import { api } from './index';
import type { components } from './schema';

// Types are automatically extracted from the OpenAPI schema
export type EventLog = components['schemas']['EventLog'];
export type CreateEventLogDto = components['schemas']['CreateEventLogDto'];
export type User = components['schemas']['User'];
export type Entity = components['schemas']['Entity'];

/**
 * Example: Fetch user info
 */
export async function fetchUserInfo() {
  const { data, error } = await api.GET('/api/v1/meta/info', {});
  
  if (error) {
    console.error('Failed to fetch user info:', error);
    throw new Error('Failed to fetch user info');
  }
  
  return data;
}

/**
 * Example: Create an event log with typed request/response
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
 * Example: Bulk create event logs
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
 * Example: Get last event for a user
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

/**
 * Example: Fetch current user
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
 * Example: Login
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

// You can add more API functions here as needed
// The api client will provide full autocomplete and type checking!
