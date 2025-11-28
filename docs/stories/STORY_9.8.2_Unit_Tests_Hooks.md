# Story 9.8.2: Unit Tests - React Hooks & State Management

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🧠 Context7 MCP (Heavy)  
**Dependencies:** Story 9.8.1 (Service tests), Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Create comprehensive unit tests for all custom React hooks and Zustand state management stores in the Friends Module. This includes testing hook lifecycle, realtime subscriptions, error handling, loading states, and state management actions.

---

## ✅ Acceptance Criteria

### React Hooks Tests
- [ ] 80%+ coverage for `src/hooks/friends/useFriends.ts`
- [ ] 80%+ coverage for `src/hooks/friends/useFriendRequests.ts`
- [ ] 80%+ coverage for `src/hooks/friends/useFriendSearch.ts`
- [ ] 80%+ coverage for `src/hooks/friends/usePYMK.ts`
- [ ] 80%+ coverage for `src/hooks/friends/useBlockedUsers.ts`
- [ ] Test hook lifecycle (mount, update, unmount)
- [ ] Test realtime subscription behavior
- [ ] Test error handling and loading states

### Zustand Store Tests
- [ ] 80%+ coverage for `src/store/friendsStore.ts`
- [ ] 80%+ coverage for `src/store/notificationsStore.ts`
- [ ] Test store actions and selectors
- [ ] Test state persistence
- [ ] Test state reset on logout

### Realtime Subscription Tests
- [ ] Test subscription setup and cleanup
- [ ] Test real-time updates handling
- [ ] Test subscription error recovery
- [ ] Test offline/online behavior

---

## 🎨 Implementation

### Test File Structure

```
src/hooks/__tests__/
├── friends/
│   ├── useFriends.test.ts
│   ├── useFriendRequests.test.ts
│   ├── useFriendSearch.test.ts
│   ├── usePYMK.test.ts
│   └── useBlockedUsers.test.ts
└── realtime/
    ├── useRealtimeFriends.test.ts
    └── useRealtimeNotifications.test.ts

src/store/__tests__/
├── friendsStore.test.ts
└── notificationsStore.test.ts
```

### Example Test: useFriends.test.ts

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFriends } from '@/hooks/friends/useFriends';
import { createMockSupabase } from '../../utils/mockSupabase';

describe('useFriends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch friends on mount', async () => {
    const mockFriends = [
      { id: '1', full_name: 'John Doe' },
      { id: '2', full_name: 'Jane Smith' },
    ];

    const mockSupabase = createMockSupabase();
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockFriends,
          error: null
        })
      })
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toEqual(mockFriends);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network error' }
        })
      })
    });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('should refetch when refetch is called', async () => {
    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialFriends = result.current.friends;

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify refetch was called
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() => useFriends());

    unmount();

    // Verify cleanup (e.g., subscription cleanup)
    // ...
  });
});
```

### Example Test: useFriendRequests.test.ts

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFriendRequests } from '@/hooks/friends/useFriendRequests';

describe('useFriendRequests', () => {
  it('should fetch pending requests', async () => {
    const mockRequests = [
      { id: '1', sender_id: 'user-1', status: 'pending' },
      { id: '2', sender_id: 'user-2', status: 'pending' },
    ];

    // Mock implementation
    const { result } = renderHook(() => useFriendRequests());

    await waitFor(() => {
      expect(result.current.requests).toHaveLength(2);
    });
  });

  it('should accept friend request', async () => {
    const { result } = renderHook(() => useFriendRequests());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.acceptRequest('request-123');
    });

    // Verify request was accepted
    expect(result.current.requests).not.toContainEqual(
      expect.objectContaining({ id: 'request-123' })
    );
  });

  it('should reject friend request', async () => {
    const { result } = renderHook(() => useFriendRequests());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.rejectRequest('request-123');
    });

    // Verify request was rejected
    expect(result.current.requests).not.toContainEqual(
      expect.objectContaining({ id: 'request-123' })
    );
  });

  it('should handle realtime updates', async () => {
    const { result } = renderHook(() => useFriendRequests());

    // Simulate realtime insert
    act(() => {
      // Trigger realtime event
      mockRealtimeInsert({
        id: 'new-request',
        sender_id: 'user-3',
        status: 'pending'
      });
    });

    await waitFor(() => {
      expect(result.current.requests).toContainEqual(
        expect.objectContaining({ id: 'new-request' })
      );
    });
  });
});
```

### Example Test: friendsStore.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useFriendsStore } from '@/store/friendsStore';

describe('friendsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useFriendsStore.getState().reset();
  });

  it('should set friends', () => {
    const friends = [
      { id: '1', full_name: 'John Doe' },
      { id: '2', full_name: 'Jane Smith' },
    ];

    useFriendsStore.getState().setFriends(friends);

    expect(useFriendsStore.getState().friends).toEqual(friends);
  });

  it('should add friend', () => {
    const friend = { id: '1', full_name: 'John Doe' };

    useFriendsStore.getState().addFriend(friend);

    expect(useFriendsStore.getState().friends).toContainEqual(friend);
  });

  it('should remove friend', () => {
    const friends = [
      { id: '1', full_name: 'John Doe' },
      { id: '2', full_name: 'Jane Smith' },
    ];

    useFriendsStore.getState().setFriends(friends);
    useFriendsStore.getState().removeFriend('1');

    expect(useFriendsStore.getState().friends).toHaveLength(1);
    expect(useFriendsStore.getState().friends).not.toContainEqual(
      expect.objectContaining({ id: '1' })
    );
  });

  it('should select friend by id', () => {
    const friends = [
      { id: '1', full_name: 'John Doe' },
      { id: '2', full_name: 'Jane Smith' },
    ];

    useFriendsStore.getState().setFriends(friends);

    const friend = useFriendsStore.getState().getFriendById('1');

    expect(friend).toEqual(friends[0]);
  });

  it('should persist state to localStorage', () => {
    const friends = [{ id: '1', full_name: 'John Doe' }];

    useFriendsStore.getState().setFriends(friends);

    // Verify localStorage was updated
    const stored = localStorage.getItem('friends-store');
    expect(stored).toContain('John Doe');
  });

  it('should reset state on logout', () => {
    const friends = [{ id: '1', full_name: 'John Doe' }];

    useFriendsStore.getState().setFriends(friends);
    useFriendsStore.getState().reset();

    expect(useFriendsStore.getState().friends).toEqual([]);
  });
});
```

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Find all hooks
warp mcp run context7 "list all hooks in src/hooks/friends/"

# Analyze hook dependencies
warp mcp run context7 "analyze dependencies for useFriends hook"

# Find untested hooks
warp mcp run context7 "find untested hooks in src/hooks/"

# Review hook patterns
warp mcp run context7 "analyze custom hooks for best practices"
```

---

## 📦 Deliverables

1. **Hook Test Files:**
   - `src/hooks/__tests__/friends/useFriends.test.ts`
   - `src/hooks/__tests__/friends/useFriendRequests.test.ts`
   - `src/hooks/__tests__/friends/useFriendSearch.test.ts`
   - `src/hooks/__tests__/friends/usePYMK.test.ts`
   - `src/hooks/__tests__/friends/useBlockedUsers.test.ts`

2. **Store Test Files:**
   - `src/store/__tests__/friendsStore.test.ts`
   - `src/store/__tests__/notificationsStore.test.ts`

3. **Test Utilities:**
   - `src/__tests__/utils/hookTestHelpers.ts`
   - `src/__tests__/utils/mockRealtime.ts`

---

## 📈 Success Metrics

- **Code Coverage:** > 80% for all hooks and stores
- **Test Count:** > 50 hook tests
- **Test Execution Time:** < 20 seconds
- **All Tests Passing:** 100% pass rate

---

**Next Story:** [STORY 9.8.3: Component Tests - Friends UI](./STORY_9.8.3_Component_Tests.md)
