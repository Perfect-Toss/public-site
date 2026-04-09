/**
 * Type-safe API client for Perfect Toss API
 * 
 * Usage examples:
 * 
 * // GET request with type inference
 * const { data, error } = await api.GET('/api/v1/organizations');
 * if (data) {
 *   // data is fully typed!
 *   console.log(data);
 * }
 * 
 * // POST request with typed body
 * const { data, error } = await api.POST('/api/v1/eventlogs', {
 *   body: {
 *     eventType: 'page_view',
 *     // TypeScript will autocomplete and validate these fields!
 *   }
 * });
 * 
 * // With path parameters
 * const { data, error } = await api.GET('/api/v1/organizations/{id}', {
 *   params: { path: { id: '123' } }
 * });
 */

export { apiClient as api, setAuthToken } from './client';
export type { paths, components } from './schema';
