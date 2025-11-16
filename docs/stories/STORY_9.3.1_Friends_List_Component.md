# 📋 STORY 9.3.1: Friends List Component

**Epic:** [EPIC 9.3: Friends UI Components](../epics/EPIC_9.3_Friends_UI_Components.md)  
**Story Owner:** Frontend Engineering  
**Assigned To:** TBD  
**Story Points:** 5  
**Priority:** High  
**Status:** 📋 Ready for Development

---

## 📝 **Story Description**

As a **user**, I want to **see my friends list with online status indicators** so that I can **quickly see who's active and connect with them**.

---

## 🎯 **Acceptance Criteria**

### **Functional Requirements:**
1. ✅ Display friends list with infinite scroll (50 items per page)
2. ✅ Show online status with green dot indicator
3. ✅ Display last active timestamps ("Active 5m ago", "Last seen 2h ago")
4. ✅ Quick action buttons: Message, Unfriend
5. ✅ Sort friends: Online first, then alphabetically by name
6. ✅ Search within friends list (local filter)
7. ✅ Pull-to-refresh on mobile
8. ✅ List virtualization for performance (react-window)

### **UI/UX Requirements:**
9. ✅ Loading skeleton while fetching data
10. ✅ Empty state: "Find friends to get started" with CTA button
11. ✅ Smooth animations (60fps)
12. ✅ Responsive design (mobile-first)
13. ✅ Haptic feedback on friend tap (mobile)
14. ✅ Accessible (keyboard navigation, screen reader support)

### **Performance Requirements:**
15. ✅ Initial load < 300ms
16. ✅ Smooth scrolling with 1000+ friends
17. ✅ Optimistic UI updates (unfriend action)

---

## 🎨 **MCP Integration**

### **1. Shadcn MCP** (Primary)
```bash
# Scaffold components using Shadcn
warp mcp run shadcn "create friends list with avatar, status badge, and action buttons"
```

**Components to scaffold:**
- FriendsList (main container)
- FriendCard (individual friend item)
- OnlineStatusBadge
- LoadingSkeleton

### **2. Chrome DevTools MCP** (Testing)
```bash
# Test responsive design
warp mcp run chrome-devtools "open http://localhost:5173/friends and test mobile/tablet/desktop views"
```

**Test checklist:**
- [ ] Mobile (375px) - Single column, touch targets 44px
- [ ] Tablet (768px) - Two columns
- [ ] Desktop (1920px) - Three columns with sidebar

### **3. Puppeteer MCP** (E2E Testing)
```bash
# Automated E2E test
warp mcp run puppeteer "test friends list: scroll to load more, click unfriend button, verify removal"
```

---

## 📦 **Technical Implementation**

### **File Structure:**
```
src/components/friends/
├── FriendsList.tsx           # Main container with virtualization
├── FriendCard.tsx            # Individual friend card
├── OnlineStatusBadge.tsx     # Green dot + last active
├── LoadingSkeleton.tsx       # Skeleton loader
└── EmptyState.tsx            # No friends state

src/hooks/friends/
├── useFriendsList.ts         # Fetch friends with pagination
└── useFriendActions.ts       # Unfriend, message actions

src/pages/
└── Friends.tsx               # Main friends page
```

### **Key Components:**

#### **1. FriendsList.tsx**
```typescript
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export function FriendsList() {
  const { friends, isLoading, hasMore, loadMore } = useFriendsList();
  
  // Sort: Online first, then alphabetical
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      if (a.is_online !== b.is_online) {
        return b.is_online ? 1 : -1; // Online first
      }
      return a.full_name.localeCompare(b.full_name);
    });
  }, [friends]);

  return (
    <AutoSizer>
      {({ height, width }) => (
        <VariableSizeList
          height={height}
          itemCount={sortedFriends.length}
          itemSize={() => 80} // 80px per friend card
          width={width}
          onScroll={handleScroll}
        >
          {({ index, style }) => (
            <FriendCard
              key={sortedFriends[index].id}
              friend={sortedFriends[index]}
              style={style}
            />
          )}
        </VariableSizeList>
      )}
    </AutoSizer>
  );
}
```

#### **2. FriendCard.tsx**
```typescript
interface FriendCardProps {
  friend: Friend;
  style?: React.CSSProperties;
}

export function FriendCard({ friend, style }: FriendCardProps) {
  const { unfriend, sendMessage } = useFriendActions();

  return (
    <div style={style} className="flex items-center gap-3 p-4 hover:bg-gray-50">
      {/* Avatar with online badge */}
      <div className="relative">
        <Avatar src={friend.avatar_url} name={friend.full_name} />
        <OnlineStatusBadge isOnline={friend.is_online} />
      </div>

      {/* Friend info */}
      <div className="flex-1">
        <h3 className="font-semibold">{friend.full_name}</h3>
        <p className="text-sm text-gray-600">
          {friend.is_online ? 'Active now' : formatLastSeen(friend.last_active)}
        </p>
      </div>

      {/* Quick actions */}
      <button onClick={() => sendMessage(friend.id)} className="...">
        <MessageCircle className="w-5 h-5" />
      </button>
      <button onClick={() => unfriend(friend.id)} className="...">
        <UserMinus className="w-5 h-5" />
      </button>
    </div>
  );
}
```

#### **3. useFriendsList.ts**
```typescript
export function useFriendsList() {
  return useInfiniteQuery({
    queryKey: ['friends-list'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          profiles!friend_id(
            id, full_name, username, avatar_url,
            is_online, last_active
          )
        `)
        .eq('user_id', currentUserId)
        .eq('status', 'accepted')
        .order('is_online', { ascending: false })
        .order('full_name')
        .range(pageParam * 50, (pageParam + 1) * 50 - 1);
      
      return data?.map(f => f.profiles) || [];
    },
    getNextPageParam: (lastPage, pages) => 
      lastPage.length === 50 ? pages.length : undefined,
  });
}
```

---

## 🧪 **Testing Requirements**

### **Unit Tests:**
```typescript
describe('FriendsList', () => {
  it('sorts online friends first', () => {});
  it('renders 50 friends per page', () => {});
  it('displays loading skeleton initially', () => {});
  it('shows empty state when no friends', () => {});
});
```

### **Integration Tests:**
- [ ] Scroll to load more friends (page 2, 3, etc.)
- [ ] Click message button → opens chat
- [ ] Click unfriend → shows confirmation → removes friend
- [ ] Search filters friends list locally

### **E2E Tests (Puppeteer):**
```javascript
test('Friends list workflow', async () => {
  await page.goto('http://localhost:5173/friends');
  
  // Wait for friends to load
  await page.waitForSelector('[data-testid="friend-card"]');
  
  // Verify online friends appear first
  const firstFriend = await page.$('[data-testid="friend-card"]:first-child');
  const hasOnlineBadge = await firstFriend.$('[data-testid="online-badge"]');
  expect(hasOnlineBadge).toBeTruthy();
  
  // Scroll to load more
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  
  // Verify more friends loaded
  const friendCount = await page.$$('[data-testid="friend-card"]');
  expect(friendCount.length).toBeGreaterThan(50);
});
```

---

## 🚀 **Deployment Checklist**

- [ ] Components created and styled with Shadcn + Tailwind
- [ ] Infinite scroll implemented with react-window
- [ ] Online status updates in real-time (Supabase Realtime)
- [ ] Responsive design tested on all breakpoints
- [ ] Accessibility: ARIA labels, keyboard navigation
- [ ] Loading states and empty states implemented
- [ ] Unit tests pass (90% coverage)
- [ ] E2E tests pass
- [ ] Performance: < 300ms load time, 60fps scrolling
- [ ] Deployed to dev environment
- [ ] Code review approved
- [ ] Merged to main branch

---

## 🔗 **Dependencies**

**Required Before Starting:**
- ✅ Epic 9.1: Database schema for friendships
- ✅ Epic 9.2: Search optimization

**Blocks:**
- Story 9.3.2: Friend Requests UI
- Story 9.3.3: Friend Profile Modal

---

## 📚 **Resources**

- [React Window Docs](https://react-window.vercel.app/)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Shadcn Avatar Component](https://ui.shadcn.com/docs/components/avatar)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Story Created:** 2025-01-16  
**Last Updated:** 2025-01-16  
**Next Story:** [STORY 9.3.2: Friend Requests UI](./STORY_9.3.2_Friend_Requests_UI.md)
