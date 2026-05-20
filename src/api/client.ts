import createClient from 'openapi-fetch';
import type { paths } from './schema';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev-api.perfect-toss.com';

// Create a type-safe API client
export const apiClient = createClient<paths>({ 
  baseUrl: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Holds the current auth token in memory
let currentAuthToken: string | null = null;

/**
 * Set authorization token for authenticated requests.
 * Uses a single persistent middleware that reads the latest token.
 */
export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

// Single auth middleware that always uses the latest token
apiClient.use({
  onRequest({ request }) {
    if (currentAuthToken) {
      request.headers.set('Authorization', `Bearer ${currentAuthToken}`);
    }
    return request;
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
