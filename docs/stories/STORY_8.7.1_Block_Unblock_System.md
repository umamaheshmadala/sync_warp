# 🛡️ STORY 8.7.1: Block/Unblock System

**Parent Epic:** [EPIC 8.7 - Moderation & Safety](../epics/EPIC_8.7_Moderation_Safety.md)
**Priority:** P0 - Critical
**Estimated Effort:** 2 Days

---

## 🎯 **Goal**
Implement a robust user blocking system that allows users to block abusive contacts. Blocked users should not be able to send messages, and their existing conversations should be hidden or disabled. This must work seamlessly across Web and Mobile (iOS/Android) using native confirmation dialogs.

---

## 📋 **Acceptance Criteria**

### 1. Database & Service
- [ ] `blocked_users` table exists and has correct RLS policies.
- [ ] **Server-Side Enforcement**: `messages` table RLS policy prevents INSERT if `sender_id` is blocked by `recipient_id`.
- [ ] `BlockingService` implemented with methods: `blockUser`, `unblockUser`, `isBlocked`, `getBlockedUsers`.

### 2. User Interface
- [ ] "Block User" option available in Chat Header and Profile.
- [ ] "Unblock User" option replaces "Block" if already blocked.
- [ ] **Native Confirmation Dialog**:
    - Mobile: `@capacitor/dialog`.
    - Web: Standard dialog.

### 3. Interaction Rules
- [ ] Sending to blocked user fails physically (Database Error) in addition to UI check.

---

## 🧩 **Implementation Details**

### 1. Database Verification & Enforcement (CRITICAL)

#### Bidirectional Blocking RLS Policy
**Industry Standard (WhatsApp/Telegram):** Blocking prevents messaging in BOTH directions.

```sql
-- Helper function to get conversation recipient
CREATE OR REPLACE FUNCTION get_conversation_recipient(
  conversation_id UUID,
  current_user_id UUID
) RETURNS UUID AS $$
  SELECT unnest(participants)
  FROM conversations
  WHERE id = conversation_id
  AND unnest(participants) != current_user_id
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Bidirectional blocking policy
CREATE POLICY "prevent_messaging_blocked_users_bidirectional" ON messages
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (
      -- Case 1: Current user blocked the recipient
      (blocker_id = auth.uid() AND blocked_id = get_conversation_recipient(NEW.conversation_id, auth.uid()))
      OR
      -- Case 2: Recipient blocked current user
      (blocked_id = auth.uid() AND blocker_id = get_conversation_recipient(NEW.conversation_id, auth.uid()))
    )
  )
);
```

#### Message Archiving on Block
**Industry Standard (Signal):** Archive conversation but keep message history.

```typescript
// In blockingService.ts - Update endConversationsWithUser method
private async endConversationsWithUser(userId: string): Promise<void> {
  const currentUserId = (await supabase.auth.getUser()).data.user!.id;

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, participants')
    .contains('participants', [currentUserId, userId]);

  if (!conversations?.length) return;

  for (const convo of conversations) {
    if (convo.participants.length === 2) {
      // Archive the conversation (not delete)
      await supabase
        .from('conversation_participants')
        .update({ 
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('conversation_id', convo.id)
        .eq('user_id', currentUserId);
      
      console.log(`📦 Archived conversation ${convo.id}`);
    }
  }
}
```

### 2. Blocking Service (`src/services/blockingService.ts`)

Enhanced with shadow blocking (no notification to blocked user):

```typescript
class BlockingService {
  /**
   * Block a user (bidirectional, silent)
   */
  async blockUser(userId: string): Promise<void> {
    const currentUserId = (await supabase.auth.getUser()).data.user!.id;

    // Check if already blocked
    const existing = await this.isBlocked(userId);
    if (existing) {
      throw new Error('User is already blocked');
    }

    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: currentUserId,
      blocked_id: userId
    });

    if (error) throw error;

    // Archive conversations
    await this.endConversationsWithUser(userId);

    console.log(`🚫 Blocked user: ${userId} (bidirectional)`);
  }

  // ... rest of service from Epic
}
```

### 3. UI Components

#### ChatHeader.tsx - Block/Unblock Button
```typescript
const [isBlocked, setIsBlocked] = useState(false);

useEffect(() => {
  if (recipientId) {
    blockingService.isBlocked(recipientId).then(setIsBlocked);
  }
}, [recipientId]);

const handleBlockToggle = async () => {
  if (!recipientId) return;
  
  const confirmed = await Dialog.confirm({
    title: isBlocked ? 'Unblock User?' : 'Block User?',
    message: isBlocked 
      ? 'This user will be able to message you again.'
      : 'You will no longer receive messages from this user. They will not be notified.',
    okButtonTitle: isBlocked ? 'Unblock' : 'Block',
    cancelButtonTitle: 'Cancel'
  });

  if (confirmed.value) {
    try {
      if (isBlocked) {
        await blockingService.unblockUser(recipientId);
        toast.success('User unblocked');
      } else {
        await blockingService.blockUser(recipientId);
        toast.success('User blocked');
      }
      setIsBlocked(!isBlocked);
    } catch (error) {
      toast.error(error.message);
    }
  }
};
```

#### Group Chat Handling (Future Enhancement)
For MVP, blocking in group chats is handled client-side:
- Blocked user messages are filtered from view
- They remain in DB for group integrity
- Other group members still see them

```typescript
// In MessageList.tsx
const filteredMessages = messages.filter(msg => {
  // Hide messages from blocked users in groups
  if (isGroupChat && blockedUserIds.includes(msg.sender_id)) {
    return false;
  }
  return true;
});
```

### 4. Error Handling

When RLS blocks a message, catch the error gracefully:

```typescript
// In useSendMessage.ts
try {
  await messagingService.sendMessage(data);
} catch (error) {
  if (error.code === 'PGRST116' || error.message.includes('blocked')) {
    toast.error('Unable to send message. This user may have blocked you.');
  } else {
    toast.error('Message failed to send');
  }
}
```

---

## 🤖 **MCP Integration Strategy**

### Supabase MCP
- **Verify Table**: `warp mcp run supabase "execute_sql SELECT * FROM blocked_users"`
- **Test Policies**: `warp mcp run supabase "execute_sql SELECT * FROM blocked_users WHERE blocker_id = 'current_user_id'"`

### Capacitor Logic
- Use `@capacitor/dialog` for native feel on mobile.

---

## 🧪 **Testing Plan**

### Unit/Integration Tests
- Mock `BlockingService` in `useSendMessage.test.ts` to verify it stops sending.

### Manual Verification
1.  **Block**: Go to Chat -> Menu -> Block. Confirm dialog. Verify "Block" changes to "Unblock".
2.  **Send Attempt**: Try to type and send. Verify error toast "Cannot send message to blocked user".
3.  **Unblock**: Go to Settings -> Blocked Users. Unblock the user.
4.  **Restore**: Verify messaging works again.

---

## ✅ **Definition of Done**
- [ ] Service implemented and unit tested.
- [ ] UI for Block/Unblock works on Desktop & Mobile.
- [ ] Native dialogs used on mobile.
- [ ] Blocked Users list page implemented.
- [ ] Messaging blocked users is impossible.
