import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { newUuid } from '../utils/uuid';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev-api.perfect-toss.com';

// Create a type-safe API client.
// NOTE: openapi-fetch sets "Content-Type: application/json" automatically for
// serialized JSON bodies, and leaves multipart/form-data bodies (FormData) for
// the browser to set with the correct boundary. So we don't set a global
// Content-Type here.
export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

/**
 * Every API request carries a fresh id in this header. The API's Serilog
 * correlation enricher stamps it on every log line for the request (the
 * `CorrelationId` custom dimension in App Insights), so a failure reported by
 * the browser can be matched to the API's own logs.
 */
export const CORRELATION_HEADER = 'x-correlation-id';

const correlationIds = new WeakMap<Response, string>();

/** The correlation id the request behind this response was sent with. */
export function correlationIdOf(response: Response | undefined): string | undefined {
  return response ? correlationIds.get(response) : undefined;
}

// Registered first: onRequest middleware runs in order and onResponse in
// reverse, so this tags the request before anything else sees it and records
// the final response (including a replay after a 401).
apiClient.use({
  onRequest({ request }) {
    if (!request.headers.has(CORRELATION_HEADER)) {
      request.headers.set(CORRELATION_HEADER, newUuid());
    }
    return request;
  },
  onResponse({ request, response }) {
    const id = request.headers.get(CORRELATION_HEADER);
    if (id) correlationIds.set(response, id);
    return response;
  },
});

/** A failed API call: the status, what the server said, and the id its logs are filed under. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly method: string;
  readonly path: string;
  readonly correlationId: string | undefined;
  readonly serverMessage: string | undefined;

  constructor(message: string, response: Response, body?: unknown, method = 'GET') {
    super(message);
    this.name = 'ApiRequestError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.method = method;
    this.correlationId = correlationIdOf(response);
    this.serverMessage = serverMessageOf(body);
    try {
      this.path = new URL(response.url).pathname;
    } catch {
      this.path = response.url;
    }
  }
}

/** The text of an API error body: the API's `{ message, errors }`, or ASP.NET problem details. */
function serverMessageOf(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return typeof body === 'string' && body ? body : undefined;
  const value = body as { message?: unknown; title?: unknown; detail?: unknown; errors?: unknown };
  const parts = [value.message ?? value.detail ?? value.title]
    .concat(Array.isArray(value.errors) ? value.errors : value.errors ? [JSON.stringify(value.errors)] : [])
    .filter((part) => part !== undefined && part !== null && part !== '');
  return parts.length ? parts.map(String).join(' | ') : undefined;
}

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

/** Shown when a write is attempted from a read-only session. */
export const READ_ONLY_MESSAGE = 'Actions are disabled while viewing the app as another user.';

// View-as sessions must not write: the request would be attributed to the
// signed-in account, not to the account on screen.
let mutationsBlocked = false;

/**
 * POSTs that change nothing — they mint a short-lived URL or run a query. A
 * read-only session still needs them, since playing a video asks for a URL.
 */
const READ_ONLY_POST_PATHS: RegExp[] = [
  /^\/api\/v1\/videos\/[^/]+\/request-download-token$/,
  /^\/api\/v1\/videos\/[^/]+\/reviews\/[^/]+\/content\/url$/,
  /^\/api\/v1\/eventlogs\/search$/,
];

function isReadOnlyRequest(request: Request): boolean {
  if (request.method === 'GET') return true;
  if (request.method !== 'POST') return false;
  const { pathname } = new URL(request.url, 'http://localhost');
  return READ_ONLY_POST_PATHS.some((pattern) => pattern.test(pathname));
}

/** Refuse every write while a read-only session is active. */
export function setMutationsBlocked(blocked: boolean): void {
  mutationsBlocked = blocked;
}

apiClient.use({
  onRequest({ request }) {
    if (mutationsBlocked && !isReadOnlyRequest(request)) {
      throw new Error(READ_ONLY_MESSAGE);
    }
    return request;
  },
});

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
