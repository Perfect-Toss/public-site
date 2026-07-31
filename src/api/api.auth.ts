/**
 * Auth API functions
 */

import { api } from './index';

/**
 * Login with username and password
 */
export async function login(username: string, password: string): Promise<void> {
  const { error } = await api.POST('/api/v1/auth/token', {
    body: { username, password },
  });
  
  if (error) {
    console.error('Login failed:', error);
    throw new Error('Login failed');
  }
}
