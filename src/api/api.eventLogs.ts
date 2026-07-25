/**
 * EventLogs API functions
 */

import { api } from './index';
import type { components } from './schema';

export type EventLog = components['schemas']['EventLog'];
export type CreateEventLogDto = components['schemas']['CreateEventLogDto'];
export type CreateEventLogsDto = components['schemas']['CreateEventLogsDto'];
export type EventLogUserSummary = components['schemas']['EventLogUserSummary'];
export type EventLogMonthlySummary = components['schemas']['EventLogMonthlySummary'];
export type EventLogSearchCriteriaDto = components['schemas']['EventLogSearchCriteriaDto'];
export type EventLogIEnumerablePagedResponse = components['schemas']['EventLogIEnumerablePagedResponse'];

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
