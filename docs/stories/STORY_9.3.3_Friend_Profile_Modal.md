# 📋 STORY 9.3.3: Friend Profile Modal

**Epic:** [EPIC 9.3: Friends UI Components](../epics/EPIC_9.3_Friends_UI_Components.md)  
**Story Owner:** Frontend Engineering  
**Story Points:** 3  
**Priority:** Medium  
**Status:** 📋 Ready for Development

---

## 📝 **Story Description**

As a **user**, I want to **view a friend's profile in a modal with action buttons** so that I can **easily message, unfriend, or manage my relationship with them**.

---

## 🎯 **Acceptance Criteria**

### **Functional Requirements:**
1. ✅ Profile header: Avatar, full name, username, location
2. ✅ Mutual friends section with avatars (first 5) + count
3. ✅ Actions menu with buttons:
   - Message (opens chat)
   - Unfriend (with confirmation)
   - Block user (with confirmation)
   - Follow/Unfollow toggle
4. ✅ Recent activity feed (if profile is public)
5. ✅ Share profile button
6. ✅ Close button (X) and backdrop click to dismiss

### **UI/UX Requirements:**
7. ✅ Slide-in animation from bottom (mobile) or center (desktop)
8. ✅ Loading state while fetching profile data
9. ✅ Confirmation dialogs for destructive actions
10. ✅ Toast notifications for actions ("Unfriended John Doe")
11. ✅ Responsive: Full-screen on mobile, modal on desktop

### **Performance:**
12. ✅ Modal opens < 100ms
13. ✅ Profile data loads < 200ms

---

## 🎨 **MCP Integration**

### **1. Shadcn MCP**
```bash
warp mcp run shadcn "create profile modal with header, actions menu, and mutual friends section"
```

### **2. Chrome DevTools MCP**
Test modal interactions and animations

### **3. Puppeteer MCP**
```bash
warp mcp run puppeteer "test profile modal: open modal, click unfriend with confirmation, verify friendship removed"
```

---

## 📦 **Technical Implementation**

### **File Structure:**
```
src/components/friends/
├── FriendProfileModal.tsx      # Main modal container
├── ProfileHeader.tsx           # Avatar, name, location
├── MutualFriendsSection.tsx    # Mutual friends display
├── FriendActionsMenu.tsx       # Action buttons
├── RecentActivityFeed.tsx      # Activity timeline
└── ProfileSkeleton.tsx         # Loading state
```

### **Key Component:**

```typescript
interface FriendProfileModalProps {
  friendId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FriendProfileModal({ friendId, isOpen, onClose }: FriendProfileModalProps) {
  const { profile, mutualFriends, isLoading } = useFriendProfile(friendId);
  const { unfriend, blockUser, toggleFollow } = useFriendActions();
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* Profile Header */}
            <ProfileHeader profile={profile} />

            {/* Mutual Friends */}
            <MutualFriendsSection friends={mutualFriends} />

            {/* Actions Menu */}
            <FriendActionsMenu
              friendId={friendId}
              onMessage={() => {/* Open chat */}}
              onUnfriend={() => setShowUnfriendDialog(true)}
              onBlock={() => {/* Show block dialog */}}
              onToggleFollow={() => toggleFollow(friendId)}
              isFollowing={profile.is_following}
            />

            {/* Recent Activity (if public) */}
            {profile.is_activity_public && (
              <RecentActivityFeed friendId={friendId} />
            )}
          </>
        )}
      </DialogContent>

      {/* Unfriend Confirmation */}
      <ConfirmDialog
        isOpen={showUnfriendDialog}
        onClose={() => setShowUnfriendDialog(false)}
        onConfirm={() => {
          unfriend(friendId);
          onClose();
        }}
        title="Unfriend User?"
        message={`Are you sure you want to remove ${profile?.full_name} from your friends?`}
      />
    </Dialog>
  );
}
```

---

## 🧪 **Testing**

### **Unit Tests:**
- Modal opens/closes correctly
- Actions trigger appropriate functions
- Confirmation dialogs appear for destructive actions
- Loading state displays skeleton

### **E2E Tests:**
```javascript
test('Friend profile modal workflow', async () => {
  // Open modal
  await page.click('[data-testid="friend-card"]:first-child');
  await page.waitForSelector('[data-testid="profile-modal"]');
  
  // Verify profile data loaded
  expect(await page.textContent('h2')).toBeTruthy();
  
  // Click unfriend
  await page.click('[data-testid="unfriend-button"]');
  await page.waitForSelector('[data-testid="confirm-dialog"]');
  await page.click('[data-testid="confirm-unfriend"]');
  
  // Verify modal closes and friend removed
  await page.waitForSelector('[data-testid="profile-modal"]', { state: 'hidden' });
});
```

---

## 🚀 **Deployment Checklist**

- [ ] Modal component with slide-in animation
- [ ] Profile header with avatar and info
- [ ] Mutual friends section (5 avatars + count)
- [ ] Actions menu: Message, Unfriend, Block, Follow/Unfollow
- [ ] Confirmation dialogs for destructive actions
- [ ] Recent activity feed (if public)
- [ ] Share profile functionality
- [ ] Responsive design (full-screen mobile, centered desktop)
- [ ] Unit and E2E tests pass
- [ ] Accessibility: Focus trap, ESC to close

---

**Next Story:** [STORY 9.3.4: Friend Search UI](./STORY_9.3.4_Friend_Search_UI.md)
