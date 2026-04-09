# API Client - Type-Safe OpenAPI Integration

## 🎉 What Changed?

Your API is now managed using **auto-generated TypeScript types** from your OpenAPI 3.0 specification!

## ✨ Key Benefits

1. **100% Type Safety** - All API calls are fully typed
2. **Autocomplete** - Your IDE knows all endpoints and their parameters
3. **Always In Sync** - One command updates all types from your API spec
4. **Catch Errors Early** - TypeScript catches API mismatches at compile time
5. **Tiny Runtime** - Only ~600 bytes of runtime code

## 📦 What's Included

- `schema.d.ts` - Auto-generated types (regenerated from your API spec)
- `client.ts` - Configured API client with middleware
- `index.ts` - Public exports
- `api.ts` - Example API functions showing usage patterns
- `migration-examples.ts` - Migration guide from old to new patterns

## 🚀 Getting Started

### 1. Regenerate Types (when API changes)

```bash
npm run generate:api
```

This pulls the latest OpenAPI spec from `dev-api.perfect-toss.com/swagger`

### 2. Import and Use

```typescript
import { api } from '@/api';

// Simple GET
const { data, error } = await api.GET('/api/v1/users/current', {});

// POST with body
const { data, error } = await api.POST('/api/v1/eventlogs', {
  body: {
    eventType: 'page_view',
    timestamp: new Date().toISOString(),
    userId: currentUserId,
  }
});

// With path params
const { data, error } = await api.GET('/api/v1/eventlogs/user/{userId}/last', {
  params: { path: { userId: 'abc-123' } }
});
```

### 3. Add Authentication

```typescript
import { setAuthToken } from '@/api';

setAuthToken(userToken);
// All subsequent requests include Authorization header
```

## 📚 Documentation

See [docs/07-API_MANAGEMENT.md](../docs/07-API_MANAGEMENT.md) for complete documentation.

## 🔄 Workflow

1. Backend updates API → OpenAPI spec changes
2. Frontend runs `npm run generate:api`
3. TypeScript shows exactly what changed
4. Update code with full type safety and autocomplete

## 💡 Tips

- **Never edit** `schema.d.ts` directly (it's auto-generated)
- Run `generate:api` regularly to stay in sync
- Use the exported types: `import type { components } from '@/api/schema'`
- Create wrapper functions in `api.ts` for complex operations

## 📖 Examples

Check out these files:
- `api.ts` - Real-world usage examples
- `migration-examples.ts` - How to migrate from old patterns
- `docs/07-API_MANAGEMENT.md` - Complete guide

## 🛠 Technologies

- [openapi-typescript](https://openapi-ts.dev/introduction) - Generate types
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) - Type-safe fetch client
