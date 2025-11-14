# Messaging RLS Policies

This document describes the Row Level Security (RLS) policies applied to the core messaging tables in SynC.

All policies rely on `auth.uid()` from Supabase Auth and are applied to authenticated users via the `authenticated` role.

---

## 1. Conversations (`public.conversations`)

### 1.1 Users can view their conversations
- **Policy name:** `Users can view their conversations`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rule:** A user may only read conversations where their user ID is in the `participants` array.
- **Effect:**
  - Users only see conversations they are a member of.
  - Prevents visibility of other users' conversations.

### 1.2 Users can create direct conversations
- **Policy name:** `Users can create direct conversations`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - The conversation must be of type `direct`.
  - `participants` must contain exactly 2 users.
  - `auth.uid()` must be one of the `participants`.
  - There must be an existing `friendships` row linking `auth.uid()` and the other participant.
  - No blocking is in effect between `auth.uid()` and the other participant in either direction (`blocked_users`).
- **Effect:**
  - Users can only start direct conversations with people they are friends with.
  - Users cannot start a conversation if either side has blocked the other.

### 1.3 Users can update conversation settings
- **Policy name:** `Users can update conversation settings`
- **Command:** `UPDATE`
- **Who is allowed:** Any authenticated user.
- **Rule:** The user must be in the `participants` array (both `USING` and `WITH CHECK`).
- **Effect:**
  - Participants can update conversation-level settings (e.g., name, mute/archived/pinned flags).
  - Non-participants cannot modify the conversation.

---

## 2. Messages (`public.messages`)

### 2.1 Users can view conversation messages
- **Policy name:** `Users can view conversation messages`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - The message must belong to a conversation where `auth.uid()` is a participant.
  - The message sender must **not** be someone that `auth.uid()` has blocked (`blocked_users` where `blocker_id = auth.uid()` and `blocked_id = sender_id`).
- **Effect:**
  - Users only see messages in conversations they are part of.
  - Messages from users you have blocked are hidden.

### 2.2 Users can send messages
- **Policy name:** `Users can send messages`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - `sender_id` must equal `auth.uid()`.
  - The target conversation must include `auth.uid()` as a participant.
  - No **other** participant in the conversation has blocked `auth.uid()` (checked via `blocked_users`).
- **Effect:**
  - Users can only send messages to conversations they belong to.
  - If any other participant has blocked the sender, the insert is rejected.

### 2.3 Users can edit their own recent messages
- **Policy name:** `Users can edit their own recent messages`
- **Command:** `UPDATE`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - The message `sender_id` must equal `auth.uid()`.
  - The message must not be soft-deleted (`is_deleted = false`).
  - The message must be newer than 15 minutes (`created_at > now() - interval '15 minutes'`).
- **Effect:**
  - Users can edit their own messages only for a short window after sending.
  - Enforces the 15-minute edit window defined in the story.

### 2.4 Users can delete their own messages
- **Policy name:** `Users can delete their own messages`
- **Command:** `UPDATE`
- **Who is allowed:** Any authenticated user.
- **Rule:** `sender_id` must equal `auth.uid()` (both `USING` and `WITH CHECK`).
- **Effect:**
  - Users can soft-delete messages they sent.
  - Users cannot delete messages sent by other users.

---

## 3. Message Read Receipts (`public.message_read_receipts`)

### 3.1 Senders can view read receipts
- **Policy name:** `Senders can view read receipts`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rule:** There must be a corresponding row in `messages` where `messages.id = message_id` and `messages.sender_id = auth.uid()`.
- **Effect:**
  - Only the sender of a message can see who has read that message.
  - Prevents other users from seeing read receipts for messages they did not send.

### 3.2 Users can create their own read receipts
- **Policy name:** `Users can create their own read receipts`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rule:** `user_id` must equal `auth.uid()`.
- **Effect:**
  - A user can only create read/delivered records for themselves.
  - Prevents users from spoofing read receipts for other users.

### 3.3 Users can update their own read receipts
- **Policy name:** `Users can update their own read receipts`
- **Command:** `UPDATE`
- **Who is allowed:** Any authenticated user.
- **Rule:** `user_id` must equal `auth.uid()` (for both `USING` and `WITH CHECK`).
- **Effect:**
  - Users can update their own receipt rows (e.g., mark as read).
  - Users cannot alter read receipts for others.

---

## 4. Conversation Participants (`public.conversation_participants`)

### 4.1 Participants can view conversation participants
- **Policy name:** `Participants can view conversation participants`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rule:** The row's `conversation_id` must refer to a conversation where `auth.uid()` is a participant.
- **Effect:**
  - Users see participants only for conversations they are part of.
  - No leakage of participant lists for other conversations.

### 4.2 Users can join conversations they are part of
- **Policy name:** `Users can join conversations they are part of`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - `user_id` must equal `auth.uid()`.
  - The conversation referenced must already list `auth.uid()` in its `participants` array.
- **Effect:**
  - Allows inserting per-user participant settings, but only for oneself.
  - Prevents users from creating participant rows for someone else.

### 4.3 Users can manage their own participation settings
- **Policy name:** `Users can manage their own participation settings`
- **Command:** `UPDATE`
- **Who is allowed:** Any authenticated user.
- **Rule:** `user_id` must equal `auth.uid()`.
- **Effect:**
  - Users can change their own mute, archive, pin, and `last_read_at` settings.
  - They cannot change settings for other participants.

### 4.4 Users can leave conversations
- **Policy name:** `Users can leave conversations`
- **Command:** `DELETE`
- **Who is allowed:** Any authenticated user.
- **Rule:** `user_id` must equal `auth.uid()`.
- **Effect:**
  - Users can remove their own participant row to leave a conversation.
  - They cannot remove other users from the conversation.

---

## 5. Message Edits (`public.message_edits`)

### 5.1 Users can view their own message edits
- **Policy name:** `Users can view their own message edits`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rule:** There must be a corresponding `messages` row where `messages.id = message_id` and `messages.sender_id = auth.uid()`.
- **Effect:**
  - Users can see the edit history only for messages they sent.
  - Edit history for other users' messages is not visible.

### 5.2 Users can log edits for their own messages
- **Policy name:** `Users can log edits for their own messages`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - `edited_by` must equal `auth.uid()`.
  - There must be a corresponding `messages` row where `messages.id = message_id` and `messages.sender_id = auth.uid()`.
- **Effect:**
  - Only the sender of a message can create edit history rows for that message.
  - Prevents users from forging edit history for others.

---

## 6. Typing Indicators (`public.typing_indicators`)

### 6.1 Conversation participants can view typing indicators
- **Policy name:** `Conversation participants can view typing indicators`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rule:** The `conversation_id` must refer to a conversation where `auth.uid()` is a participant.
- **Effect:**
  - Users only see typing indicators for conversations they are in.

### 6.2 Users can publish their own typing indicator
- **Policy name:** `Users can publish their own typing indicator`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - `user_id` must equal `auth.uid()`.
  - The conversation must include `auth.uid()` as a participant.
- **Effect:**
  - Users can signal their typing status only for themselves and only in conversations they belong to.

### 6.3 Users can clear their own typing indicator
- **Policy name:** `Users can clear their own typing indicator`
- **Command:** `DELETE`
- **Who is allowed:** Any authenticated user.
- **Rule:** `user_id` must equal `auth.uid()`.
- **Effect:**
  - Users can clear their own typing rows.
  - They cannot clear typing indicators for other users.

---

## 7. Blocked Users (`public.blocked_users`)

### 7.1 Users can view blocks involving themselves
- **Policy name:** `Users can view blocks involving themselves`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rule:** `blocker_id = auth.uid()` **or** `blocked_id = auth.uid()`.
- **Effect:**
  - Users see who they have blocked and who has blocked them.
  - Used by other policies (e.g., messages) to enforce blocking.

### 7.2 Users can create blocks against others
- **Policy name:** `Users can create blocks against others`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rule:** `blocker_id` must equal `auth.uid()`.
- **Effect:**
  - Users can add new block relationships where they are the blocker.
  - Prevents creating blocks on behalf of other users.

### 7.3 Users can update their own blocks
- **Policy name:** `Users can update their own blocks`
- **Command:** `UPDATE`
- **Who is allowed:** Any authenticated user.
- **Rule:** `blocker_id` must equal `auth.uid()` (both `USING` and `WITH CHECK`).
- **Effect:**
  - Users can modify existing blocks they created (for example, adding a reason).

### 7.4 Users can remove their own blocks
- **Policy name:** `Users can remove their own blocks`
- **Command:** `DELETE`
- **Who is allowed:** Any authenticated user.
- **Rule:** `blocker_id` must equal `auth.uid()`.
- **Effect:**
  - Users can unblock others by removing rows where they are the blocker.

---

## 8. Storage Bucket RLS (message-attachments)

RLS is also applied to the `message-attachments` storage bucket via policies on `storage.objects`.

### 8.1 Users can upload their own attachments
- **Policy name:** `Users can upload their own attachments`
- **Table:** `storage.objects`
- **Command:** `INSERT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - `bucket_id` must be `message-attachments`.
  - The first folder segment of `name` must equal `auth.uid()` (`(storage.foldername(name))[1] = auth.uid()::text`).
- **Effect:**
  - Users can upload files only under their own `{user_id}/...` prefix.
  - Prevents users from writing into other users' folders.

### 8.2 Users can view conversation attachments
- **Policy name:** `Users can view conversation attachments`
- **Table:** `storage.objects`
- **Command:** `SELECT`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - `bucket_id` must be `message-attachments`.
  - There must exist a `messages` row and a `conversation_participants` row such that:
    - `cp.user_id = auth.uid()`
    - `cp.left_at IS NULL` (user is still in the conversation)
    - The object `name` is present in `messages.media_urls` or equals `messages.thumbnail_url`.
- **Effect:**
  - Users only see attachments that belong to conversations they participate in.
  - Files not referenced by messages in their conversations are invisible.

### 8.3 Users can delete their own attachments
- **Policy name:** `Users can delete their own attachments`
- **Table:** `storage.objects`
- **Command:** `DELETE`
- **Who is allowed:** Any authenticated user.
- **Rules:**
  - `bucket_id` must be `message-attachments`.
  - First path segment must equal `auth.uid()`.
- **Effect:**
  - Users can delete objects inside their own `{user_id}/...` path.
  - Users cannot delete attachments owned by other users.

---

## 9. High-Level Security Guarantees

With these policies:

- Users can only see conversations and messages they participate in.
- Blocked users cannot send messages to each other, and blocked senders' messages are hidden.
- Message editing is limited to a 15-minute window and to the original sender.
- Read receipts, participant settings, typing indicators, block relationships, and message attachments are all scoped to the current user and their conversations.

These policies are designed to work uniformly across Web, iOS, and Android clients using `supabase-js` with the authenticated user's JWT.
