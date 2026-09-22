import createClient from 'openapi-fetch';
import type { paths } from './schema';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev-api.perfect-toss.com';

// Create a type-safe API client.
// NOTE: openapi-fetch sets "Content-Type: application/json" automatically for
// serialized JSON bodies, and leaves multipart/form-data bodies (FormData) for
// the browser to set with the correct boundary. So we don't set a global
// Content-Type here.
export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

/**
 * Source of the Authorization header for every request, plus the reaction to a
 * rejected session. Registered by AuthProvider so this module stays independent
 * of the auth provider.
 */
export interface IAuthTokenProvider {
  /** Token for the next request. `forceRefresh` bypasses any cached token. */
  getToken(forceRefresh?: boolean): Promise<string | null>;
  /** The API rejected a freshly minted token, so the session is no longer valid. */
  onUnauthorized(): void;
}

let authTokenProvider: IAuthTokenProvider | null = null;

/** Register (or clear) the provider that supplies auth tokens. */
export function setAuthTokenProvider(provider: IAuthTokenProvider | null): void {
  authTokenProvider = provider;
}

async function resolveToken(forceRefresh = false): Promise<string | null> {
  if (!authTokenProvider) {
    return null;
  }
  try {
    return await authTokenProvider.getToken(forceRefresh);
  } catch (error) {
    console.error('Failed to resolve auth token:', error);
    return null;
  }
}

// Auth middleware. The token is resolved per request, so an expired token is
// refreshed by the provider instead of being sent again.
apiClient.use({
  async onRequest({ request }) {
    const token = await resolveToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
});

// Unauthorized middleware. A 401 forces a token refresh and replays the request
// once. Requests with a body are not replayed (their stream is already
// consumed) — the refreshed token is used by the next request instead.
apiClient.use({
  async onResponse({ request, response, options }) {
    if (response.status !== 401 || request.body !== null) {
      return response;
    }

    const token = await resolveToken(true);
    if (!token) {
      return response;
    }

    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const retried = await options.fetch(new Request(request, { headers }));

    if (retried.status === 401) {
      console.warn('API rejected a refreshed token — the session is no longer valid');
      authTokenProvider?.onUnauthorized();
    }

    return retried;
  },
});

/**
 * Add global error handling middleware
 */
apiClient.use({
  onResponse({ response }) {
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response;
  },
});

export default apiClient;
