# 📋 STORY 9.3.2: Friend Requests UI

**Epic:** [EPIC 9.3: Friends UI Components](../epics/EPIC_9.3_Friends_UI_Components.md)  
**Story Owner:** Frontend Engineering  
**Assigned To:** TBD  
**Story Points:** 3  
**Priority:** High  
**Status:** 📋 Ready for Development

---

## 📝 **Story Description**

As a **user**, I want to **manage friend requests with clear accept/reject actions** so that I can **easily add new friends or decline unwanted requests**.

---

## 🎯 **Acceptance Criteria**

### **Functional Requirements:**
1. ✅ Two tabs: "Received" (default) and "Sent"
2. ✅ Accept button creates friendship
3. ✅ Reject button with confirmation dialog
4. ✅ Show request message preview (first 100 chars)
5. ✅ Display mutual friends count ("3 mutual friends")
6. ✅ Auto-archive expired requests (> 30 days old)
7. ✅ Unread badge on tab showing new request count
8. ✅ Optimistic UI updates on accept/reject

### **UI/UX Requirements:**
9. ✅ Swipe actions on mobile (swipe left = reject, right = accept)
10. ✅ Loading state during accept/reject
11. ✅ Empty state for no requests
12. ✅ Confirmation dialog: "Are you sure you want to reject this request?"
13. ✅ Success toast: "Friend request accepted"
14. ✅ Smooth tab transitions

### **Performance:**
15. ✅ Requests load < 200ms
16. ✅ Pagination: 20 requests per page

---

## 🎨 **MCP Integration**

### **1. Shadcn MCP** (Primary)
```bash
# Scaffold friend request components
warp mcp run shadcn "create friend request card with accept/reject buttons and tabs"
```

**Components to scaffold:**
- FriendRequestsList
- FriendRequestCard
- RequestActionButtons
- ConfirmationDialog

### **2. Chrome DevTools MCP** (Testing)
```bash
# Test request flow
warp mcp run chrome-devtools "open friend requests page, test accept/reject flows"
```

### **3. Puppeteer MCP** (E2E)
```bash
# E2E test request workflow
warp mcp run puppeteer "test friend request: accept request, verify friendship created, test reject with confirmation"
```

---

## 📦 **Technical Implementation**

### **File Structure:**
```
src/components/friends/
├── FriendRequestsList.tsx      # Tabs + request list
├── FriendRequestCard.tsx       # Individual request
├── RequestActionButtons.tsx    # Accept/Reject buttons
├── RequestConfirmDialog.tsx    # Rejection confirmation
└── RequestEmptyState.tsx       # No requests state

src/hooks/friends/
├── useFriendRequests.ts        # Fetch requests
└── useRequestActions.ts        # Accept/reject logic
```

### **Key Components:**

#### **FriendRequestsList.tsx**
```typescript
export function FriendRequestsList() {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const { receivedRequests, sentRequests, isLoading } = useFriendRequests();
  
  const requests = activeTab === 'received' ? receivedRequests : sentRequests;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('received')}
          className={cn(
            'px-4 py-2 font-medium transition relative',
            activeTab === 'received' && 'text-blue-600 border-b-2 border-blue-600'
          )}
        >
          Received
          {receivedRequests.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2">
              {receivedRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={cn(
            'px-4 py-2 font-medium transition',
            activeTab === 'sent' && 'text-blue-600 border-b-2 border-blue-600'
          )}
        >
          Sent
        </button>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {requests.map((request) => (
          <FriendRequestCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}
```

#### **FriendRequestCard.tsx**
```typescript
interface FriendRequestCardProps {
  request: FriendRequest;
}

export function FriendRequestCard({ request }: FriendRequestCardProps) {
  const { acceptRequest, rejectRequest, isLoading } = useRequestActions();
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow">
        {/* Avatar */}
        <Avatar src={request.sender.avatar_url} name={request.sender.full_name} />

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-semibold">{request.sender.full_name}</h3>
          
          {/* Mutual friends */}
          {request.mutual_friends_count > 0 && (
            <p className="text-sm text-gray-600">
              {request.mutual_friends_count} mutual friend{request.mutual_friends_count > 1 ? 's' : ''}
            </p>
          )}
          
          {/* Request message preview */}
          {request.message && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {request.message}
            </p>
          )}
          
          {/* Timestamp */}
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(request.created_at))} ago
          </p>
        </div>

        {/* Actions */}
        <RequestActionButtons
          onAccept={() => acceptRequest(request.id)}
          onReject={() => setShowRejectDialog(true)}
          isLoading={isLoading}
        />
      </div>

      {/* Reject Confirmation Dialog */}
      <RequestConfirmDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={() => {
          rejectRequest(request.id);
          setShowRejectDialog(false);
        }}
        userName={request.sender.full_name}
      />
    </>
  );
}
```

#### **useRequestActions.ts**
```typescript
export function useRequestActions() {
  const queryClient = useQueryClient();
  
  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Create friendship record
      const request = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('id', requestId)
        .single();
      
      await supabase.from('friendships').insert([
        { user_id: request.data.receiver_id, friend_id: request.data.sender_id, status: 'accepted' },
        { user_id: request.data.sender_id, friend_id: request.data.receiver_id, status: 'accepted' }
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-requests']);
      queryClient.invalidateQueries(['friends-list']);
      toast.success('Friend request accepted');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-requests']);
      toast.success('Friend request rejected');
    }
  });

  return {
    acceptRequest: acceptMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    isLoading: acceptMutation.isLoading || rejectMutation.isLoading
  };
}
```

---

## 🧪 **Testing Requirements**

### **Unit Tests:**
```typescript
describe('FriendRequestsList', () => {
  it('shows received tab by default', () => {});
  it('displays unread badge with count', () => {});
  it('switches between received and sent tabs', () => {});
});

describe('FriendRequestCard', () => {
  it('shows mutual friends count', () => {});
  it('truncates long messages', () => {});
  it('shows confirmation dialog on reject', () => {});
});
```

### **E2E Tests:**
```javascript
test('Accept friend request flow', async () => {
  await page.goto('http://localhost:5173/friend-requests');
  
  // Click accept on first request
  await page.click('[data-testid="accept-button"]:first-child');
  
  // Verify success toast
  await page.waitForSelector('.toast-success');
  
  // Verify request removed from list
  const requestCount = await page.$$('[data-testid="request-card"]');
  expect(requestCount.length).toBeLessThan(initialCount);
});

test('Reject friend request with confirmation', async () => {
  await page.goto('http://localhost:5173/friend-requests');
  
  // Click reject
  await page.click('[data-testid="reject-button"]:first-child');
  
  // Confirm in dialog
  await page.waitForSelector('[data-testid="confirm-dialog"]');
  await page.click('[data-testid="confirm-reject"]');
  
  // Verify success toast
  await page.waitForSelector('.toast-success');
});
```

---

## 🚀 **Deployment Checklist**

- [ ] Tabs component with Received/Sent views
- [ ] Accept/Reject actions with optimistic updates
- [ ] Confirmation dialog for reject action
- [ ] Mutual friends count displayed
- [ ] Request message preview (100 chars)
- [ ] Expired requests auto-archived
- [ ] Swipe gestures on mobile
- [ ] Unit tests pass (90% coverage)
- [ ] E2E tests pass
- [ ] Responsive design verified
- [ ] Accessibility tested
- [ ] Code review approved

---

## 🔗 **Dependencies**

**Required:**
- Story 9.3.1: Friends List Component (for shared components)

**Blocks:**
- Story 9.3.3: Friend Profile Modal

---

**Story Created:** 2025-01-16  
**Next Story:** [STORY 9.3.3: Friend Profile Modal](./STORY_9.3.3_Friend_Profile_Modal.md)
