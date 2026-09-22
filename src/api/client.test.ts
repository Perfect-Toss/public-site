import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, setAuthTokenProvider } from './client';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Stands in for global fetch; records the requests the client sends. */
function stubFetch(handler: (request: Request) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(input as Request));
  return { fetchMock, fetch: fetchMock as unknown as typeof globalThis.fetch };
}

function tokenOf(fetchMock: ReturnType<typeof vi.fn>, index: number): string | null {
  return (fetchMock.mock.calls[index][0] as Request).headers.get('Authorization');
}

describe('apiClient auth', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    setAuthTokenProvider(null);
    vi.restoreAllMocks();
  });

  it('mints a token for every request', async () => {
    const getToken = vi.fn(async () => 'token-1');
    setAuthTokenProvider({ getToken, onUnauthorized: vi.fn() });
    const { fetchMock, fetch } = stubFetch(() => json([]));

    await apiClient.GET('/api/v1/users', { fetch });
    await apiClient.GET('/api/v1/users', { fetch });

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(tokenOf(fetchMock, 0)).toBe('Bearer token-1');
    expect(tokenOf(fetchMock, 1)).toBe('Bearer token-1');
  });

  it('sends no token while signed out', async () => {
    setAuthTokenProvider({ getToken: async () => null, onUnauthorized: vi.fn() });
    const { fetchMock, fetch } = stubFetch(() => json([]));

    await apiClient.GET('/api/v1/users', { fetch });

    expect(tokenOf(fetchMock, 0)).toBeNull();
  });

  it('refreshes the token and replays the request after a 401', async () => {
    const getToken = vi.fn(async (forceRefresh = false) => (forceRefresh ? 'fresh' : 'stale'));
    const onUnauthorized = vi.fn();
    setAuthTokenProvider({ getToken, onUnauthorized });
    let calls = 0;
    const { fetchMock, fetch } = stubFetch(() => {
      calls += 1;
      return calls === 1 ? new Response(null, { status: 401 }) : json({ id: 'u1' });
    });

    const result = await apiClient.GET('/api/v1/users', { fetch });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(tokenOf(fetchMock, 1)).toBe('Bearer fresh');
    expect(result.data).toEqual({ id: 'u1' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('reports a dead session when the refreshed token is rejected too', async () => {
    const onUnauthorized = vi.fn();
    setAuthTokenProvider({ getToken: async () => 'token', onUnauthorized });
    const { fetchMock, fetch } = stubFetch(() => new Response(null, { status: 401 }));

    const result = await apiClient.GET('/api/v1/users', { fetch });

    expect(result.response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('never replays a request that has a body', async () => {
    const onUnauthorized = vi.fn();
    setAuthTokenProvider({ getToken: async () => 'token', onUnauthorized });
    const { fetchMock, fetch } = stubFetch(() => new Response(null, { status: 401 }));

    const result = await apiClient.POST('/api/v1/auth/token', {
      body: { username: 'a', password: 'b' },
      fetch,
    });

    expect(result.response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('leaves requests alone when the API is happy', async () => {
    const getToken = vi.fn(async () => 'token-1');
    setAuthTokenProvider({ getToken, onUnauthorized: vi.fn() });
    const { fetchMock, fetch } = stubFetch(() => json({ id: 'u1' }, 201));

    const result = await apiClient.GET('/api/v1/users', { fetch });

    expect(result.response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
