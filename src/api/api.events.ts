/**
 * Events & Event Occurrence (instance) API functions
 *
 * An *event* is a definition (name, schedule, roster, tags) owned by an
 * organization. An *event occurrence* — called an **instance** by the API and
 * addressed under `/api/v1/events/{eventId}/instances` — is a session that
 * actually happened: the server mints its id and returns it in the `EventInstance`,
 * while the `clientSessionId` a recording device generates is what a client that
 * worked offline sends up (see `syncEventInstances`).
 *
 * Types are re-exported directly from the auto-generated schema so that
 * any schema rename/removal produces a compile-time error at every usage site.
 */

import { api } from './index';
import type { components } from './schema';

export type Event = components['schemas']['Event'];
export type CreateEventRequest = components['schemas']['CreateEventRequest'];
export type CreateEventScheduleRequest = components['schemas']['CreateEventScheduleRequest'];
export type UpdateEventRequest = components['schemas']['UpdateEventRequest'];
export type UpdateEventScheduleRequest = components['schemas']['UpdateEventScheduleRequest'];
export type EventSchedule = components['schemas']['EventSchedule'];
export type EventScheduleType = components['schemas']['EventScheduleType'];
export type EventIEnumerablePagedResponse = components['schemas']['EventIEnumerablePagedResponse'];
export type DayOfWeek = components['schemas']['DayOfWeek'];

export type EventInstance = components['schemas']['EventInstance'];
export type CreateEventInstanceRequest = components['schemas']['CreateEventInstanceRequest'];
export type SetEventInstanceStateRequest = components['schemas']['SetEventInstanceStateRequest'];
export type EventInstanceState = components['schemas']['EventInstanceState'];
export type EventInstanceStateChange = components['schemas']['EventInstanceStateChange'];
export type SyncEventInstancesRequest = components['schemas']['SyncEventInstancesRequest'];
export type SyncEventInstanceItem = components['schemas']['SyncEventInstanceItem'];
export type SyncEventInstanceState = components['schemas']['SyncEventInstanceState'];
export type EventInstanceIEnumerablePagedResponse = components['schemas']['EventInstanceIEnumerablePagedResponse'];

// ============================================================================
// Events API
// ============================================================================

/**
 * Get event definitions for the organizations the current user can access, with paging.
 * Events whose schedule has already ended are omitted unless `includeEnded` is true.
 */
export async function fetchEvents(
  pageNumber?: number,
  pageSize?: number,
  organizationId?: string,
  includeEnded?: boolean,
): Promise<EventIEnumerablePagedResponse> {
  const { data, error } = await api.GET('/api/v1/events', {
    params: { query: { pageNumber, pageSize, organizationId, includeEnded } },
  });

  if (error) {
    console.error('Failed to fetch events:', error);
    throw new Error('Failed to fetch events');
  }

  return data ?? {};
}

/**
 * Get a single event by ID (verifies the current user can access its organization)
 */
export async function fetchEventById(id: string): Promise<Event | null> {
  const { data, error } = await api.GET('/api/v1/events/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to fetch event:', error);
    throw new Error('Failed to fetch event');
  }

  return data ?? null;
}

/**
 * Create a new event with its schedule. The caller must be a global admin or
 * hold the OrganizationAdmin role on the event's organization. The schedule id
 * is minted by the server, so `schedule` is a `CreateEventScheduleRequest`.
 */
export async function createEvent(eventData: CreateEventRequest): Promise<Event | null> {
  const { data, error } = await api.POST('/api/v1/events', {
    body: eventData,
  });

  if (error) {
    console.error('Failed to create event:', error);
    throw new Error('Failed to create event');
  }

  return data ?? null;
}

/**
 * Update an existing event. The organization is immutable; the schedule, roster
 * and tags are replaced with the provided values. `schedule` is an
 * `UpdateEventScheduleRequest`, which names the existing schedule row's id.
 */
export async function updateEvent(id: string, eventData: UpdateEventRequest): Promise<Event | null> {
  const { data, error } = await api.PUT('/api/v1/events/{id}', {
    params: { path: { id } },
    body: eventData,
  });

  if (error) {
    console.error('Failed to update event:', error);
    throw new Error('Failed to update event');
  }

  return data ?? null;
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/events/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete event:', error);
    throw new Error('Failed to delete event');
  }

  return true;
}

// ============================================================================
// Event Occurrences (instances) API
// ============================================================================

/**
 * Get a page of the stored occurrences of a single event, newest first.
 * Each occurrence is returned whole, with its ordered state changes.
 */
export async function fetchEventInstances(
  eventId: string,
  pageNumber?: number,
  pageSize?: number,
): Promise<EventInstanceIEnumerablePagedResponse> {
  const { data, error } = await api.GET('/api/v1/events/{eventId}/instances', {
    params: { path: { eventId }, query: { pageNumber, pageSize } },
  });

  if (error) {
    console.error('Failed to fetch event instances:', error);
    throw new Error('Failed to fetch event instances');
  }

  return data ?? {};
}

/**
 * Get a page of the occurrences across every event the caller can access
 * (calendar feed), newest first.
 */
export async function fetchAllEventInstances(
  pageNumber?: number,
  pageSize?: number,
): Promise<EventInstanceIEnumerablePagedResponse> {
  const { data, error } = await api.GET('/api/v1/events/instances', {
    params: { query: { pageNumber, pageSize } },
  });

  if (error) {
    console.error('Failed to fetch event instances:', error);
    throw new Error('Failed to fetch event instances');
  }

  return data ?? {};
}

/**
 * Get a single stored occurrence by its id (the id the server minted for it)
 */
export async function fetchEventInstance(eventId: string, id: string): Promise<EventInstance | null> {
  const { data, error } = await api.GET('/api/v1/events/{eventId}/instances/{id}', {
    params: { path: { eventId, id } },
  });

  if (error) {
    console.error('Failed to fetch event instance:', error);
    throw new Error('Failed to fetch event instance');
  }

  return data ?? null;
}

/**
 * Open an occurrence by recording its first state (`Initiated`).
 * The `clientSessionId` is minted by the client and kept for reconciliation, so
 * a device that recorded the session offline can push it up later; an occurrence
 * the server already holds is returned untouched, so reconnecting never restarts one.
 */
export async function createEventInstance(
  eventId: string,
  instanceData: CreateEventInstanceRequest,
): Promise<EventInstance | null> {
  const { data, error } = await api.POST('/api/v1/events/{eventId}/instances', {
    params: { path: { eventId } },
    body: instanceData,
  });

  if (error) {
    console.error('Failed to create event instance:', error);
    throw new Error('Failed to create event instance');
  }

  return data ?? null;
}

/**
 * Record one more state of an occurrence. States recorded offline are stored
 * as-is; one that breaks the expected flow is logged as out of order, not refused.
 */
export async function setEventInstanceState(
  eventId: string,
  id: string,
  stateData: SetEventInstanceStateRequest,
): Promise<EventInstance | null> {
  const { data, error } = await api.PUT('/api/v1/events/{eventId}/instances/{id}', {
    params: { path: { eventId, id } },
    body: stateData,
  });

  if (error) {
    console.error('Failed to set event instance state:', error);
    throw new Error('Failed to set event instance state');
  }

  return data ?? null;
}

/**
 * Clear a stored occurrence (undo a mistaken session). Idempotent.
 */
export async function deleteEventInstance(eventId: string, id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/events/{eventId}/instances/{id}', {
    params: { path: { eventId, id } },
  });

  if (error) {
    console.error('Failed to delete event instance:', error);
    throw new Error('Failed to delete event instance');
  }

  return true;
}

/**
 * Record the occurrences a client captured while offline, all in one call.
 * States are applied in the order they happened, and a state the occurrence
 * already holds is skipped — so a batch that only partly made it can be resent.
 */
export async function syncEventInstances(
  syncRequest: SyncEventInstancesRequest,
): Promise<EventInstance[]> {
  const { data, error } = await api.POST('/api/v1/events/instances/sync', {
    body: syncRequest,
  });

  if (error) {
    console.error('Failed to sync event instances:', error);
    throw new Error('Failed to sync event instances');
  }

  return data || [];
}
