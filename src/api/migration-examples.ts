/**
 * Migration Guide: Old API → New Type-Safe API
 * 
 * This file shows how to migrate from the old manual API calls
 * to the new auto-generated type-safe client.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck - This is an example/migration guide file

// ==========================================
// OLD WAY (Manual)
// ==========================================

// Old: Manual interface definitions
interface OldOrganization {
  id: string;
  name: string;
  logo?: string;
}

// Old: Manual fetch wrapper
async function oldFetchOrganizations(): Promise<OldOrganization[]> {
  const response = await fetch('https://dev-api.perfect-toss.com/organizations');
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return await response.json();
}

// ==========================================
// NEW WAY (Type-Safe)
// ==========================================

import { api } from './index';
import type { components } from './schema';

// New: Types are auto-generated from OpenAPI spec
type User = components['schemas']['User'];

// New: Type-safe API call with full autocomplete
async function newFetchCurrentUser() {
  const { data, error } = await api.GET('/api/v1/users/current', {});
  
  if (error) {
    // Error is typed too!
    throw new Error('Failed to fetch user');
  }
  
  // data.data is fully typed as User
  return data;
}

// ==========================================
// MIGRATION EXAMPLES
// ==========================================

/**
 * Example 1: Simple GET request
 */
export async function exampleSimpleGet() {
  // Old way
  // const response = await fetch('/api/v1/meta/info');
  // const data = await response.json(); // No type safety
  
  // New way
  const { data, error } = await api.GET('/api/v1/meta/info', {});
  if (data?.data) {
    console.log('Version:', data.data.version);
    console.log('User:', data.data.email);
  }
}

/**
 * Example 2: POST with body
 */
export async function examplePost() {
  // Old way
  // const response = await fetch('/api/v1/eventlogs', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ eventType: 'click', ... })
  // });
  
  // New way - with full type checking!
  const { data, error } = await api.POST('/api/v1/eventlogs', {
    body: {
      eventType: 'page_view',
      timestamp: new Date().toISOString(),
      userId: '00000000-0000-0000-0000-000000000000',
      source: 'web',
      // TypeScript will error if you're missing required fields!
    }
  });
  
  if (data?.succeeded) {
    console.log('Event logged:', data.data);
  }
}

/**
 * Example 3: Path parameters
 */
export async function examplePathParams(userId: string) {
  // Old way
  // const response = await fetch(`/api/v1/eventlogs/user/${userId}/last`);
  
  // New way - type-safe path parameters!
  const { data, error } = await api.GET('/api/v1/eventlogs/user/{userId}/last', {
    params: {
      path: { userId }
      // TypeScript enforces the correct path params!
    }
  });
  
  if (data?.data) {
    console.log('Last event:', data.data);
  }
}

/**
 * Example 4: Using types in your components
 */
export function exampleUsingTypes() {
  // You can extract types from the schema
  type CreateEventLogDto = components['schemas']['CreateEventLogDto'];
  type EventLog = components['schemas']['EventLog'];
  
  const newEvent: CreateEventLogDto = {
    eventType: 'login',
    timestamp: new Date().toISOString(),
    userId: '00000000-0000-0000-0000-000000000000',
    source: 'web'
  };
  
  // TypeScript will catch any type errors!
  // newEvent.invalidField = 'error'; // ← TypeScript error!
  
  return newEvent;
}

/**
 * Example 5: Reusable helper functions
 */
export async function trackEvent(
  eventType: string,
  userId: string,
  additionalData?: Record<string, unknown>
) {
  return await api.POST('/api/v1/eventlogs', {
    body: {
      eventType,
      timestamp: new Date().toISOString(),
      userId,
      eventData: additionalData ? JSON.stringify(additionalData) : null,
      source: 'web'
    }
  });
}

// Usage:
// await trackEvent('button_click', userId, { buttonId: 'submit' });
