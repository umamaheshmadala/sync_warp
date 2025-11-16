# 📋 STORY 9.3.7: Online Status & Badges

**Epic:** [EPIC 9.3: Friends UI Components](../epics/EPIC_9.3_Friends_UI_Components.md)  
**Story Points:** 2  
**Priority:** High  
**Status:** 📋 Ready for Development

---

## 📝 **Story Description**

As a **user**, I want to **see online status and notification badges** so that I can **know who's active and if I have pending friend requests**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Green dot badge for online users
2. ✅ Last active text ("Active 5m ago", "Last seen 2h ago", "Last seen yesterday")
3. ✅ Red notification badge for unread friend requests
4. ✅ Blue badge for new friend notifications
5. ✅ Real-time status updates via Supabase Realtime
6. ✅ Badge count displays number (e.g., "3" for 3 requests)
7. ✅ Accessible: ARIA labels for screen readers
8. ✅ Smooth fade-in/out animations for status changes

---

## 🎨 **MCP Integration**

```bash
# Shadcn: Badge components
warp mcp run shadcn "create status badge with online indicator and notification counter"
```

---

## 📦 **Implementation**

```typescript
// OnlineStatusBadge.tsx
export function OnlineStatusBadge({ 
  isOnline, 
  lastActive 
}: { 
  isOnline: boolean; 
  lastActive?: string; 
}) {
  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-green-600">Active now</span>
        </>
      ) : (
        <span className="text-sm text-gray-500">
          {formatLastSeen(lastActive)}
        </span>
      )}
    </div>
  );
}

// NotificationBadge.tsx
export function NotificationBadge({ count, type = 'default' }: {
  count: number;
  type?: 'default' | 'primary' | 'danger';
}) {
  if (count === 0) return null;

  const bgColor = {
    default: 'bg-gray-500',
    primary: 'bg-blue-500',
    danger: 'bg-red-500'
  }[type];

  return (
    <span
      className={`absolute -top-1 -right-1 ${bgColor} text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5`}
      aria-label={`${count} notification${count > 1 ? 's' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// useOnlineStatus.ts - Real-time updates
export function useOnlineStatus() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set(
          Object.values(state).flatMap(presences => 
            presences.map((p: any) => p.user_id)
          )
        );
        setOnlineUsers(online);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { onlineUsers };
}

// formatLastSeen.ts
export function formatLastSeen(lastActive?: string): string {
  if (!lastActive) return 'Last seen a while ago';
  
  const now = new Date();
  const last = new Date(lastActive);
  const diff = now.getTime() - last.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  if (hours < 24) return `Last seen ${hours}h ago`;
  if (days === 1) return 'Last seen yesterday';
  if (days < 7) return `Last seen ${days}d ago`;
  return 'Last seen a while ago';
}
```

---

## 🧪 **Testing**

### **Unit Tests:**
```typescript
describe('OnlineStatusBadge', () => {
  it('shows green dot for online users', () => {});
  it('formats last active correctly', () => {});
});

describe('NotificationBadge', () => {
  it('displays count correctly', () => {});
  it('shows 99+ for count > 99', () => {});
  it('hides when count is 0', () => {});
});

describe('formatLastSeen', () => {
  it('returns "Just now" for < 1 min', () => {});
  it('returns "Active Xm ago" for < 1 hour', () => {});
  it('returns "Last seen Xh ago" for < 24 hours', () => {});
  it('returns "Last seen yesterday" for 1 day', () => {});
});
```

---

## 🚀 **Deployment Checklist**

- [ ] OnlineStatusBadge component created
- [ ] NotificationBadge component created
- [ ] Real-time status updates via Supabase Presence
- [ ] formatLastSeen utility function
- [ ] Badge animations (fade-in/out)
- [ ] Accessible ARIA labels
- [ ] Unit tests pass
- [ ] Visual regression tests pass

---

**Next Story:** [STORY 9.3.8: Empty States & Loading](./STORY_9.3.8_Empty_States_Loading.md)
