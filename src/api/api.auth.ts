/**
 * Auth API functions
 */

import { api } from './index';
import type { components } from './schema';

export type LoginInfo = components['schemas']['LoginInfo'];

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
