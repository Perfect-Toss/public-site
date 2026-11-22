/**
 * Auth API functions
 */

import { api } from './index';
import { ApiRequestError, correlationIdOf } from './client';
import type { components } from './schema';
import type { User } from './api.users';

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

export type SessionResponse = components['schemas']['SessionResponse'];

/** The email is already linked to a different sign-in identity (HTTP 409). */
export class AccountLinkedElsewhereError extends Error {
  readonly status = 409;
  /** The id the API's logs for the rejected call are filed under. */
  readonly correlationId: string | undefined;

  constructor(response?: Response) {
    super('This email is already linked to a different sign-in. Please sign in the way you did before, or contact support.');
    this.name = 'AccountLinkedElsewhereError';
    this.correlationId = correlationIdOf(response);
  }
}

/**
 * Resolve the local account for the signed-in Firebase identity. The API
 * returns the existing account, links one that holds the same email, or creates
 * a new one — so this is called once per sign-in, before any other endpoint.
 */
export async function createSession(): Promise<User> {
  const { data, error, response } = await api.POST('/api/v1/auth/session', { body: {} });

  if (response.status === 409) {
    throw new AccountLinkedElsewhereError(response);
  }

  if (error || !data?.user) {
    console.error('Failed to create session:', error);
    throw new ApiRequestError(
      error ? 'Failed to create session' : 'Session response had no user',
      response,
      error,
      'POST',
    );
  }

  return data.user;
}

export type SignInMethodsResponse = components['schemas']['SignInMethodsResponse'];

/**
 * The sign-in methods linked to the signed-in Firebase identity. Always the
 * caller's own — there is no way to read another account's methods.
 */
export async function fetchSignInMethods(): Promise<SignInMethodsResponse> {
  const { data, error } = await api.GET('/api/v1/auth/sign-in-methods', {});

  if (error || !data) {
    console.error('Failed to fetch sign-in methods:', error);
    throw new Error('Failed to fetch sign-in methods');
  }

  return data;
}

/**
 * Look up the account for an invite-only sign-in (magic link, password). The
 * API answers 401 when no account holds the identity's email, which is
 * reported as null rather than an error.
 */
export async function fetchInvitedUser(): Promise<User | null> {
  const { data, error, response } = await api.GET('/api/v2/users/current', {});

  if (response.status === 401) {
    return null;
  }

  if (error) {
    console.error('Failed to fetch current user:', error);
    throw new ApiRequestError('Failed to fetch current user', response, error);
  }

  return data ?? null;
}
