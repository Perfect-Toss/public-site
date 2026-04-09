# API Integration Documentation

This document explains how the Perfect Toss application integrates with the backend API.

## Configuration

The API base URL is configured through an environment variable in the `.env` file:

```
VITE_API_BASE_URL=https://dev-api.perfect-toss.com
```

For development, this points to `dev-api.perfect-toss.com`. For production, update this to the production API URL.

## API Files

### `/src/api/config.js`
Exports the API base URL and endpoint constants.

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev-api.perfect-toss.com';

export const API_ENDPOINTS = {
  organizations: `${API_BASE_URL}/organizations`,
  pendingReviews: `${API_BASE_URL}/reviews/pending`,
  trendingContent: `${API_BASE_URL}/content/trending`,
};
```

### `/src/api/api.js`
Contains the API fetch functions used throughout the application.

## API Endpoints

### Organizations
**Endpoint:** `GET /organizations`

Fetches the list of organizations the user belongs to.

**Expected Response:**
```json
[
  {
    "id": 1,
    "name": "OLYMPIC INDOOR TENNIS",
    "logo": "🎾"
  }
]
```

### Pending Reviews
**Endpoint:** `GET /reviews/pending`

Fetches videos that are pending review.

**Expected Response:**
```json
[
  {
    "id": 1,
    "thumbnail": "https://...",
    "duration": "00:15:43",
    "club": "OLYMPIC INDOOR TENNIS CLUB",
    "clinic": "THURSDAY NIGHT CLINIC - 6:30",
    "instructor": "BILL BELLAMY",
    "date": "09/15/24",
    "tags": ["Forehand", "Footwork"],
    "status": "Review Pending..."
  }
]
```

### Trending Content
**Endpoint:** `GET /content/trending`

Fetches trending content.

**Expected Response:**
```json
[
  {
    "id": 1,
    "title": "...",
    // Additional fields TBD
  }
]
```

## Authentication

API requests should include authentication tokens from Firebase. To add authentication to API calls, update the `apiFetch` function in `/src/api/api.js`:

```javascript
import { auth } from '../firebase/config';

async function apiFetch(url, options = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  // ... rest of the function
}
```

## Error Handling

The HomePage component handles three states:

1. **Loading State:** Displays a spinner while fetching data
2. **Error State:** Shows an error message with a retry button if the API call fails
3. **Success State:** Displays the data from the API

## Usage in Components

```javascript
import { fetchOrganizations, fetchPendingReviews } from '../../api/api';

// In your component
useEffect(() => {
  const loadData = async () => {
    try {
      const orgsData = await fetchOrganizations();
      setOrganizations(orgsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };
  loadData();
}, []);
```

## CORS Configuration

Ensure your backend API has CORS configured to accept requests from your frontend domain:

- Development: `http://localhost:5174`
- Production: Your production domain

## Future Enhancements

- Add request/response interceptors for consistent error handling
- Implement retry logic for failed requests
- Add request caching to reduce API calls
- Add pagination support for large datasets
- Implement real-time updates using WebSockets or Firebase Realtime Database
