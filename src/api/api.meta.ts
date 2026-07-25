/**
 * Meta API functions
 */

import { api } from './index';
import type { components } from './schema';

export type MetaResponse = components['schemas']['MetaResponse'];

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

/** @deprecated Use fetchMetaInfo instead */
export const fetchUserInfo = fetchMetaInfo;
