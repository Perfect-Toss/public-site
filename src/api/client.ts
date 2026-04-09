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

/**
 * Set authorization token for authenticated requests
 */
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.use({
      onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${token}`);
        return request;
      },
    });
  }
}

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
