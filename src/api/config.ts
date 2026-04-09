// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev-api.perfect-toss.com';

export const API_ENDPOINTS = {
  organizations: `${API_BASE_URL}/organizations`,
  pendingReviews: `${API_BASE_URL}/reviews/pending`,
  trendingContent: `${API_BASE_URL}/content/trending`,
};

export default API_BASE_URL;
