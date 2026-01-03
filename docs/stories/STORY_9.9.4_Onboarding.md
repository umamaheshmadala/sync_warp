# Story 9.9.4: Developer Onboarding Guide

**Epic:** [EPIC 9.9: Documentation & Developer Experience](../epics/EPIC_9.9_Documentation_DX.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**MCP Usage:** 🧠 Context7 MCP (Light)  
**Dependencies:** Stories 9.9.1-9.9.3  
**Status:** 📋 Planning

---

## 📋 Story Description

Create a comprehensive onboarding guide to help new developers get up to speed with the Friends Module in less than 2 hours, including setup, architecture overview, common tasks, and FAQs.

---

## ✅ Acceptance Criteria

### Onboarding Guide

- [ ] "Getting started" guide (< 30 minutes to complete)
- [ ] Architecture overview with diagrams
- [ ] Common tasks with code examples
- [ ] FAQ section (10+ questions)
- [ ] Troubleshooting quick reference
- [ ] Video walkthrough (optional, 10-15 minutes)

### Interactive Elements

- [ ] Code snippets with copy button
- [ ] Interactive examples (CodeSandbox/StackBlitz)
- [ ] Quick links to relevant documentation
- [ ] Progress checklist

### Validation

- [ ] Tested with 3+ new developers
- [ ] Onboarding time < 2 hours
- [ ] Feedback collected and incorporated
- [ ] 90%+ satisfaction rate

---

## 🎨 Implementation

### Phase 1: Getting Started Guide (3 hours)

**Create `docs/guides/onboarding.md`:**

````markdown
# Friends Module - Developer Onboarding

Welcome to the Friends Module! This guide will get you up to speed in less than 2 hours. 🚀

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (30 min)](#quick-start)
3. [Architecture Overview (20 min)](#architecture-overview)
4. [Common Tasks (40 min)](#common-tasks)
5. [FAQ (10 min)](#faq)
6. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have:

- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **Git** installed
- [ ] **Supabase account** ([Sign up](https://supabase.com/))
- [ ] **Basic knowledge of:**
  - React & TypeScript
  - React Query (TanStack Query)
  - Zustand (state management)
  - Tailwind CSS

**Estimated Setup Time:** 10 minutes

---

## Quick Start (30 min)

### Step 1: Clone and Install (5 min)

```bash
# Clone the repository
git clone https://github.com/your-org/sync_warp.git
cd sync_warp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```
````

### Step 2: Configure Supabase (5 min)

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these:**

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Settings → API
4. Copy URL and anon key

### Step 3: Run the App (5 min)

```bash
# Start development server
npm run dev

# Open in browser
# http://localhost:5173
```

**Expected Result:** You should see the app running with the Friends page accessible.

### Step 4: Run Tests (5 min)

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- friends

# Run E2E tests
npx playwright test
```

**Expected Result:** All tests should pass ✅

### Step 5: Explore the Code (10 min)

Open these files in your editor:

1. **`src/services/friendsService.ts`** - Core business logic
2. **`src/hooks/friends/useFriends.ts`** - React hooks
3. **`src/components/friends/FriendsList.tsx`** - Main UI component
4. **`src/store/friendsStore.ts`** - Zustand store
5. **`supabase/migrations/`** - Database schema

**Quick Tour:**

```typescript
// 1. Service Layer (Business Logic)
import { friendsService } from '@/services/friendsService';
const friends = await friendsService.getFriends();

// 2. React Hook (Data Fetching)
import { useFriends } from '@/hooks/friends/useFriends';
const { data: friends, isLoading } = useFriends();

// 3. Component (UI)
import { FriendsList } from '@/components/friends/FriendsList';
<FriendsList />

// 4. Store (Global State)
import { useFriendsStore } from '@/store/friendsStore';
const friends = useFriendsStore(state => state.friends);
```

---

## Architecture Overview (20 min)

### System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
├─────────────────────────────────────────────────┤
│  Components (UI)                                 │
│    ↓                                             │
│  Hooks (Data Fetching)                           │
│    ↓                                             │
│  Services (Business Logic)                       │
│    ↓                                             │
│  Supabase Client                                 │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│              Supabase (Backend)                  │
├─────────────────────────────────────────────────┤
│  Database (PostgreSQL)                           │
│    - friendships                                 │
│    - friend_requests                             │
│    - blocks                                      │
│    - follows                                     │
│                                                  │
│  Row Level Security (RLS)                        │
│  Real-time Subscriptions                         │
│  Edge Functions                                  │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Component → Hook → Service → Supabase → Database
                ↑                                        │
                └────────── Real-time Updates ──────────┘
```

### Key Concepts

1. **Services:** Pure functions for business logic
2. **Hooks:** React Query wrappers for data fetching
3. **Store:** Zustand for global state (online status, etc.)
4. **Components:** Presentational UI components

---

## Common Tasks (40 min)

### Task 1: Display Friends List (10 min)

```typescript
import { useFriends } from '@/hooks/friends/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';

function MyFriendsList() {
  const { data: friends, isLoading, error } = useFriends();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {friends?.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

**Try it yourself:**

1. Create a new component in `src/components/friends/`
2. Use the `useFriends` hook
3. Render the friends list
4. Test it in the browser

---

### Task 2: Send Friend Request (10 min)

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { toast } from 'sonner';

function SendRequestButton({ userId }: { userId: string }) {
  const { sendRequest } = useFriendActions();

  const handleSendRequest = async () => {
    try {
      await sendRequest.mutateAsync(userId);
      toast.success('Friend request sent!');
    } catch (error) {
      if (error.code === 'already_friends') {
        toast.info('Already friends!');
      } else {
        toast.error('Failed to send request');
      }
    }
  };

  return (
    <button onClick={handleSendRequest} disabled={sendRequest.isPending}>
      {sendRequest.isPending ? 'Sending...' : 'Send Request'}
    </button>
  );
}
```

**Try it yourself:**

1. Add a send request button to a component
2. Handle loading and error states
3. Show appropriate toast messages

---

### Task 3: Search Friends (10 min)

```typescript
import { useFriendSearch } from '@/hooks/friends/useFriendSearch';
import { useState } from 'react';

function FriendSearch() {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useFriendSearch(query);

  return (
    <div>
      <input
        type="search"
        placeholder="Search friends..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && <div>Searching...</div>}

      <div>
        {results?.map(friend => (
          <div key={friend.id}>{friend.full_name}</div>
        ))}
      </div>
    </div>
  );
}
```

**Try it yourself:**

1. Implement search with debouncing
2. Add loading states
3. Handle empty results

---

### Task 4: Block/Unblock User (10 min)

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function BlockButton({ userId }: { userId: string }) {
  const { blockUser, unblockUser } = useFriendActions();
  const { data: blockedUsers } = useBlockedUsers();

  const isBlocked = blockedUsers?.some(u => u.id === userId);

  const handleToggleBlock = async () => {
    if (isBlocked) {
      await unblockUser.mutateAsync(userId);
    } else {
      await blockUser.mutateAsync(userId);
    }
  };

  return (
    <button onClick={handleToggleBlock}>
      {isBlocked ? 'Unblock' : 'Block'}
    </button>
  );
}
```

---

## FAQ (10 min)

### Q1: Where is the friends list stored?

**A:** Friends are fetched from Supabase and cached by React Query. The `useFriendsStore` Zustand store is used for global state like online status.

### Q2: How do I debug RLS policies?

**A:** Use the Supabase SQL Editor:

```sql
-- Set user context
SET request.jwt.claim.sub = 'user-id-here';

-- Test query
SELECT * FROM friendships WHERE user_id = auth.uid();
```

### Q3: How do real-time updates work?

**A:** We use Supabase real-time subscriptions in `useRealtimeFriends` hook. It automatically updates the friends list when changes occur.

### Q4: How do I add a new field to the friend profile?

**A:**

1. Add column to database
2. Update TypeScript types
3. Update service layer
4. Update UI components

### Q5: How do I test my changes?

**A:**

```bash
# Unit tests
npm test -- src/hooks/friends/useFriends.test.tsx

# E2E tests
npx playwright test e2e/friends/

# Manual testing
npm run dev
```

### Q6: Where are the API docs?

**A:** [API Documentation](../api/) - Auto-generated from JSDoc comments.

### Q7: Where is the component library?

**A:** [Storybook](https://storybook.yourapp.com) - Visual documentation for all components.

### Q8: How do I handle errors?

**A:** Use try-catch blocks and show user-friendly messages:

```typescript
try {
  await sendFriendRequest(userId);
  toast.success("Request sent!");
} catch (error) {
  toast.error("Failed to send request");
  console.error(error);
}
```

### Q9: How do I optimize performance?

**A:**

- Use pagination for large lists
- Debounce search queries
- Use React Query's caching
- Lazy load components

### Q10: Where can I get help?

**A:**

- Slack: #friends-module-support
- GitHub Issues
- Documentation: [docs/guides/troubleshooting.md](./troubleshooting.md)

---

## Next Steps

Congratulations! You've completed the onboarding. 🎉

**Continue Learning:**

- [ ] Read [Migration Guide](./migration.md)
- [ ] Explore [API Documentation](../api/)
- [ ] Browse [Storybook](https://storybook.yourapp.com)
- [ ] Review [Architecture Diagrams](../architecture/)
- [ ] Check [Code Examples](../examples/)

**Make Your First Contribution:**

1. Pick a good first issue from GitHub
2. Create a branch
3. Make your changes
4. Write tests
5. Submit a PR

**Join the Community:**

- Slack: #friends-module
- Weekly sync: Fridays 2pm
- Code reviews: Daily

---

## Feedback

Help us improve this guide! [Submit feedback](https://forms.gle/your-form)

**Questions?** Reach out on Slack or create a GitHub issue.

````

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Generate onboarding checklist
warp mcp run context7 "create onboarding checklist for Friends Module"

# Find common code patterns
warp mcp run context7 "find common patterns in src/hooks/friends/"

# Generate FAQ from issues
warp mcp run context7 "generate FAQ from GitHub issues with label 'question'"
````

---

## 📦 Deliverables

1. **Onboarding Guide:**
   - `docs/guides/onboarding.md`

2. **Interactive Examples:**
   - CodeSandbox links
   - Code snippets

3. **Video Walkthrough (Optional):**
   - 10-15 minute video
   - Hosted on YouTube/Loom

4. **Feedback Form:**
   - Google Form or similar
   - Track onboarding metrics

---

## 📈 Success Metrics

- **Onboarding Time:** < 2 hours
- **Completion Rate:** > 90%
- **Satisfaction Score:** > 4.5/5
- **Time to First Contribution:** < 1 week

---

**Next Story:** [STORY 9.9.5: Troubleshooting Guide](./STORY_9.9.5_Troubleshooting.md)
