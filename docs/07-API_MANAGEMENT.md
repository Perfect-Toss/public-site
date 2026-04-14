# API Management with OpenAPI 3.0

This project now uses **auto-generated type-safe API clients** from your OpenAPI specification!

## 🎯 Benefits

✅ **Full Type Safety**: TypeScript knows all your API endpoints, request bodies, and responses  
✅ **Auto-completion**: Your IDE will autocomplete all API paths and parameters  
✅ **No Manual Types**: Types are auto-generated from your OpenAPI spec  
✅ **Always In Sync**: Run `npm run generate:api` to update types when your API changes  
✅ **Tiny Bundle**: Only ~600 bytes runtime overhead  
✅ **Error Handling**: Built-in error handling and middleware support  

## 📁 File Structure

```
src/api/
├── schema.d.ts       # Auto-generated types (DO NOT EDIT)
├── client.ts         # API client configuration
├── index.ts          # Public API exports
├── api.ts            # Your API functions (examples)
└── config.ts         # Legacy config (can be removed)
```

## 🚀 Quick Start

### 1. Update API Types

When your API changes, regenerate the types:

```bash
npm run generate:api
```

This fetches the latest OpenAPI spec from `https://dev-api.perfect-toss.com/swagger/v1-internal/swagger.json`

### 2. Using the API Client

**Simple GET request:**
```typescript
import { api } from '@/api';

const { data, error } = await api.GET('/api/v1/users/current', {});

if (error) {
  console.error('Failed:', error);
  return;
}

// data is fully typed!
console.log(data.data?.firstName);
```

**POST request with body:**
```typescript
import { api } from '@/api';

const { data, error } = await api.POST('/api/v1/eventlogs', {
  body: {
    eventType: 'page_view',
    timestamp: new Date().toISOString(),
    userId: currentUserId,
    source: 'web',
  }
});
```

**Request with path parameters:**
```typescript
const { data, error } = await api.GET('/api/v1/eventlogs/user/{userId}/last', {
  params: {
    path: { userId: 'some-user-id' }
  }
});
```

### 3. Authentication

Set the auth token globally:

```typescript
import { setAuthToken } from '@/api';

// After user logs in
setAuthToken(userToken);

// Now all requests will include the Authorization header
```

### 4. Using Type Definitions

Export and use the generated types:

```typescript
import type { components } from '@/api/schema';

type User = components['schemas']['User'];
type EventLog = components['schemas']['EventLog'];

function displayUser(user: User) {
  console.log(`${user.firstName} ${user.lastName}`);
}
```

## 📖 Examples

See `src/api/api.ts` for complete examples of:
- Fetching user info
- Creating event logs
- Bulk operations
- Login
- Error handling

## 🔧 Advanced Usage

### Custom Middleware

Add global request/response interceptors:

```typescript
import { apiClient } from '@/api/client';

// Add custom headers
apiClient.use({
  onRequest({ request }) {
    request.headers.set('X-Custom-Header', 'value');
    return request;
  }
});

// Log all responses
apiClient.use({
  onResponse({ response }) {
    console.log('Response:', response.status);
    return response;
  }
});
```

### Environment-Specific Base URLs

The API base URL is configured via environment variables:

```bash
# .env.development
VITE_API_BASE_URL=https://dev-api.perfect-toss.com

# .env.production
VITE_API_BASE_URL=https://api.perfect-toss.com
```

## 🆚 Before vs After

### ❌ Before (Manual Types)
```typescript
// Manually define types
interface Organization {
  id: string;
  name: string;
}

// Manual fetch wrapper
async function fetchOrganizations(): Promise<Organization[]> {
  const response = await fetch('/api/organizations');
  return await response.json(); // No type safety!
}
```

### ✅ After (Auto-Generated)
```typescript
// Types are auto-generated from OpenAPI spec
const { data, error } = await api.GET('/api/v1/users/current', {});
// ↑ Full type safety, autocomplete, and error checking!
```

## 📝 Workflow

1. Backend team updates the API
2. Run `npm run generate:api` to fetch latest spec
3. TypeScript immediately shows you what changed
4. Update your code with full type safety

## 🔗 Resources

- [openapi-fetch Documentation](https://openapi-ts.dev/openapi-fetch/)
- [openapi-typescript Documentation](https://openapi-ts.dev/introduction)
- [Your API Swagger UI](https://dev-api.perfect-toss.com/swagger)

## 🎓 Tips

1. **Don't edit `schema.d.ts`** - It's auto-generated and will be overwritten
2. **Use the `api` client directly** for maximum flexibility
3. **Create helper functions** in `api.ts` for commonly used endpoints
4. **Update types regularly** to stay in sync with backend changes
5. **Leverage TypeScript** - Let the compiler catch API mismatches early!
