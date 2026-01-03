# Story 9.9.1: API Documentation (JSDoc + TypeDoc)

**Epic:** [EPIC 9.9: Documentation & Developer Experience](../epics/EPIC_9.9_Documentation_DX.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🧠 Context7 MCP (Heavy)  
**Dependencies:** Epics 9.1-9.8  
**Status:** 📋 Planning

---

## 📋 Story Description

Create comprehensive API documentation for all services, hooks, and utility functions in the Friends Module using JSDoc comments and TypeDoc for auto-generated documentation.

---

## ✅ Acceptance Criteria

### JSDoc Coverage

- [ ] All services have JSDoc comments (friendsService, etc.)
- [ ] All hooks have JSDoc comments (useFriends, useFriendRequests, etc.)
- [ ] All utility functions have JSDoc comments
- [ ] All types and interfaces documented
- [ ] Examples provided for every public function

### Documentation Generation

- [ ] TypeDoc configured and working
- [ ] Auto-generated docs site created
- [ ] Docs deployed to GitHub Pages or similar
- [ ] Search functionality working
- [ ] Mobile-responsive documentation

### Quality

- [ ] 100% API documentation coverage
- [ ] All parameters documented with types
- [ ] All return values documented
- [ ] All exceptions/errors documented
- [ ] Code examples for complex functions

---

## 🎨 Implementation

### Phase 1: JSDoc for Services (4 hours)

**Files to Document:**

- `src/services/friendsService.ts`
- `src/services/pymkService.ts`
- `src/services/notificationService.ts`

**Example JSDoc:**

````typescript
/**
 * Sends a friend request to a user.
 *
 * @param friendId - The UUID of the user to send a request to
 * @returns A promise resolving to the created friend request
 * @throws {Error} If the user is already a friend
 * @throws {Error} If the user is blocked
 * @throws {Error} If a pending request already exists
 *
 * @example
 * ```typescript
 * try {
 *   const request = await sendFriendRequest('user-123');
 *   console.log(request.status); // 'pending'
 * } catch (error) {
 *   if (error.code === 'already_friends') {
 *     toast.error('Already friends!');
 *   }
 * }
 * ```
 */
export async function sendFriendRequest(
  friendId: string
): Promise<FriendRequest> {
  // Implementation
}
````

---

### Phase 2: JSDoc for Hooks (4 hours)

**Files to Document:**

- `src/hooks/friends/useFriends.ts`
- `src/hooks/friends/useFriendRequests.ts`
- `src/hooks/friends/useFriendSearch.ts`
- `src/hooks/friends/useFriendActions.ts`
- `src/hooks/friends/useBlockedUsers.ts`
- `src/hooks/realtime/useRealtimeFriends.ts`
- `src/hooks/realtime/useRealtimeOnlineStatus.ts`

**Example JSDoc:**

````typescript
/**
 * Hook to fetch and manage the user's friends list.
 *
 * @param options - Optional configuration for the friends query
 * @param options.limit - Maximum number of friends to fetch (default: 50)
 * @param options.enabled - Whether the query should run (default: true)
 *
 * @returns Query result with friends data and loading states
 *
 * @example
 * ```typescript
 * function FriendsList() {
 *   const { data: friends, isLoading } = useFriends({ limit: 100 });
 *
 *   if (isLoading) return <Skeleton />;
 *   return <div>{friends.map(f => <FriendCard key={f.id} friend={f} />)}</div>;
 * }
 * ```
 */
export function useFriends(options?: UseFriendsOptions) {
  // Implementation
}
````

---

### Phase 3: TypeDoc Configuration (2 hours)

**Create `typedoc.json`:**

```json
{
  "entryPoints": [
    "src/services/friendsService.ts",
    "src/hooks/friends",
    "src/hooks/realtime",
    "src/store/friendsStore.ts",
    "src/store/presenceStore.ts"
  ],
  "out": "docs/api",
  "exclude": ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
  "plugin": ["typedoc-plugin-markdown"],
  "theme": "default",
  "readme": "none",
  "includeVersion": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Services", "Hooks", "Stores", "Types"]
}
```

**Add npm scripts:**

```json
{
  "scripts": {
    "docs:generate": "typedoc",
    "docs:serve": "npx http-server docs/api -p 8080",
    "docs:validate": "typedoc --validation.invalidLink"
  }
}
```

---

### Phase 4: Documentation Site (4 hours)

**Create documentation structure:**

```
docs/
├── api/
│   ├── services/
│   │   ├── friendsService.md
│   │   ├── pymkService.md
│   │   └── notificationService.md
│   ├── hooks/
│   │   ├── useFriends.md
│   │   ├── useFriendRequests.md
│   │   └── useFriendSearch.md
│   └── stores/
│       ├── friendsStore.md
│       └── presenceStore.md
├── index.md
└── README.md
```

**Create `docs/index.md`:**

````markdown
# Friends Module API Documentation

Welcome to the Friends Module API documentation. This documentation covers all services, hooks, and utilities.

## Quick Links

- [Services](./api/services/)
- [Hooks](./api/hooks/)
- [Stores](./api/stores/)

## Getting Started

```typescript
import { useFriends } from "@/hooks/friends/useFriends";
import { sendFriendRequest } from "@/services/friendsService";

function MyComponent() {
  const { data: friends } = useFriends();
  // Use friends data
}
```
````

## Common Use Cases

- [Sending a Friend Request](./examples/send-friend-request.md)
- [Accepting a Friend Request](./examples/accept-friend-request.md)
- [Blocking a User](./examples/block-user.md)
- [Searching Friends](./examples/search-friends.md)

````

---

### Phase 5: Deploy Documentation (2 hours)

**GitHub Pages Setup:**
```yaml
# .github/workflows/docs.yml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**/*.ts'
      - 'src/**/*.tsx'
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Generate documentation
        run: npm run docs:generate

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/api
````

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Generate JSDoc for a file
warp mcp run context7 "add JSDoc comments to src/services/friendsService.ts"

# Validate JSDoc coverage
warp mcp run context7 "check JSDoc coverage in src/hooks/friends/"

# Generate examples
warp mcp run context7 "generate code examples for useFriends hook"

# Find undocumented functions
warp mcp run context7 "find functions without JSDoc in src/services/"
```

---

## 📦 Deliverables

1. **JSDoc Comments:**
   - All services documented
   - All hooks documented
   - All utilities documented

2. **TypeDoc Configuration:**
   - `typedoc.json`
   - npm scripts for docs generation

3. **Generated Documentation:**
   - `docs/api/` directory
   - Markdown files for all APIs
   - Index and navigation

4. **GitHub Pages:**
   - Deployed documentation site
   - Automatic updates on push

---

## 📈 Success Metrics

- **JSDoc Coverage:** 100%
- **Documentation Pages:** 20+ pages
- **Code Examples:** 15+ examples
- **Build Time:** < 30 seconds
- **Page Load Time:** < 2 seconds

---

**Next Story:** [STORY 9.9.2: Component Storybook](./STORY_9.9.2_Storybook.md)
