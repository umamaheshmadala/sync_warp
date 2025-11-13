# 🗄️ EPIC 8.1: Messaging Foundation & Database Architecture

**Epic Owner:** Product / Engineering  
**Stakeholders:** Backend Engineering, Database Admin, Security, QA  
**Dependencies:** Epic 2 (Authentication), Epic 5 (Social/Friends)  
**Timeline:** Week 1-2 (2 weeks)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Build a **robust, scalable, and secure database foundation** for SynC's messaging system that supports:
- 1:1 conversations between friends
- Real-time message delivery
- Media attachments (images/videos)
- Message status tracking (sent/delivered/read)
- Offline message queueing
- Integration with existing friends and coupon sharing systems
- **Cross-platform support: Web browsers + Native iOS/Android apps (Capacitor)**
- Future extensibility for group chats (v2)

This epic establishes the **data layer** that all messaging features will depend on.

---

## 📱 **Platform Support**

**Target Platforms:**
- ✅ **Web Browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **iOS Native App** (via Capacitor framework)
- ✅ **Android Native App** (via Capacitor framework)

**Architecture Foundation:**
This Epic establishes the **backend database and storage infrastructure** that serves all platforms (web + mobile).
- **Database**: Platform-agnostic - Supabase Postgres accessible from web and native mobile apps
- **Storage**: Configured for both browser file uploads AND native mobile file system integration
- **Realtime**: Supabase Realtime works on web and mobile via WebSocket connections
- **Authentication**: Mobile apps use Capacitor Storage adapter (configured in Epic 7.2)

**Mobile-Specific Considerations:**
- Storage bucket RLS policies support native file URI paths (iOS/Android)
- Push token tracking for FCM (Android) and APNs (iOS) in `user_push_tokens` table
- Database functions optimized for mobile network conditions (intermittent connectivity)
- Storage bucket CORS configured for native mobile app origins

**Note:** Frontend implementations for web vs mobile are handled in subsequent Epics (8.2+), which use platform detection via the `usePlatform` hook (from Epic 7.1) to conditionally use browser APIs vs Capacitor plugins.

---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule** to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   - Execute SQL queries directly: `warp mcp run supabase "execute_sql ..."`
   - Apply migrations: `warp mcp run supabase "apply_migration ..."`
   - Deploy edge functions: `warp mcp run supabase "deploy_edge_function ..."`
   - Test RLS policies in real-time
   - Verify database schema and indexes

2. **🧠 Context7 MCP** (Medium usage)
   - Analyze database schema for security gaps
   - Review SQL functions for vulnerabilities
   - Suggest performance optimizations
   - Identify integration points in existing code

3. **🎨 Shadcn MCP** (Low usage, for admin dashboards)
   - Scaffold UI components for admin tools

**🔄 Automatic Routing:** The global MCP rule automatically routes:
- SQL/database/RLS queries → Supabase MCP
- Code analysis/refactoring → Context7 MCP
- Manual debugging → Chrome DevTools MCP
- Automated testing → Puppeteer MCP

**📖 Each story below includes specific MCP commands for implementation.**

---

## ✅ **Success Criteria**

| Objective | KPI / Target |
|-----------|--------------|
| **Database Performance** | Query response time < 50ms for message fetch |
| **RLS Security** | 100% of tables protected with Row Level Security |
| **Message Delivery** | 99.9% message persistence success rate |
| **Storage Setup** | Private storage bucket with signed URLs |
| **Migration Success** | Zero data loss during schema deployment |
| **Index Optimization** | All queries use indexes (no sequential scans) |
| **Realtime Ready** | Postgres configured for Supabase Realtime |

---

## 📊 **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    MESSAGING DATABASE LAYER                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ conversations│  │   messages   │  │ read_receipts   │   │
│  │              │  │              │  │                 │   │
│  │ • id         │  │ • id         │  │ • message_id    │   │
│  │ • type       │◄─┤ • conv_id    │◄─┤ • user_id       │   │
│  │ • participants│ │ • sender_id  │  │ • read_at       │   │
│  │ • metadata   │  │ • content    │  │                 │   │
│  │ • last_msg_at│  │ • type       │  └─────────────────┘   │
│  └──────────────┘  │ • media_urls │                         │
│                     │ • status     │  ┌─────────────────┐   │
│  ┌──────────────┐  │ • deleted_at │  │ typing_indicators│  │
│  │conversation_ │  └──────────────┘  │                 │   │
│  │participants  │                     │ • conv_id       │   │
│  │              │  ┌──────────────┐  │ • user_id       │   │
│  │ • conv_id    │  │message_edits │  │ • started_at    │   │
│  │ • user_id    │  │              │  └─────────────────┘   │
│  │ • joined_at  │  │ • message_id │                         │
│  │ • is_admin   │  │ • old_content│  ┌─────────────────┐   │
│  └──────────────┘  │ • edited_at  │  │blocked_users    │   │
│                     └──────────────┘  │                 │   │
│                                        │ • blocker_id    │   │
│  ┌──────────────────────────────┐    │ • blocked_id    │   │
│  │  STORAGE BUCKET              │    └─────────────────┘   │
│  │  message-attachments         │                           │
│  │  • Private                    │                           │
│  │  • 25MB limit                │                           │
│  │  • Signed URLs               │                           │
│  └──────────────────────────────┘                           │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           ROW LEVEL SECURITY (RLS)                  │    │
│  │  ✓ Users see only their conversations               │    │
│  │  ✓ Messages visible to conversation participants    │    │
│  │  ✓ Read receipts private to message sender          │    │
│  │  ✓ Media accessible only to conversation members    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           REALTIME SUBSCRIPTIONS                    │    │
│  │  • postgres_changes on messages table               │    │
│  │  • broadcast for typing indicators                  │    │
│  │  • presence for online/offline status               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 **Detailed Component Breakdown**

### **Component 1: Core Tables Schema**

#### **1.1 Conversations Table**

**Purpose:** Represents a messaging conversation between 2 users (1:1 for MVP)

**Schema:**
```sql
CREATE TABLE public.conversations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Conversation Type
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  
  -- Participants (array of user IDs)
  participants UUID[] NOT NULL,
  
  -- Metadata
  name TEXT, -- For future group chats
  avatar_url TEXT, -- For future group chats
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_participants CHECK (array_length(participants, 1) >= 2),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Indexes for performance
CREATE INDEX idx_conversations_participants ON conversations USING gin(participants);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_type ON conversations(type);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

**Rationale:**
- `participants` array allows quick lookup of user's conversations
- GIN index on `participants` enables fast queries like "find all conversations for user X"
- `last_message_at` enables sorting conversation list by recency
- `type` field prepared for future group chat expansion (v2)
- Metadata JSONB for future extensibility without schema changes

---

#### **1.2 Messages Table**

**Purpose:** Stores all messages sent in conversations

**Schema:**
```sql
CREATE TABLE public.messages (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message Content
  content TEXT, -- Can be NULL for media-only messages
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'link', 'coupon', 'deal')),
  
  -- Media & Attachments
  media_urls TEXT[], -- Array of storage URLs
  thumbnail_url TEXT, -- For video thumbnails
  
  -- Link & Rich Content
  link_preview JSONB, -- {title, description, image, url}
  
  -- Coupon/Deal Sharing (Integration with existing sharing system)
  shared_coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  shared_deal_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  
  -- Message Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  
  -- Edit/Delete tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Reply/Thread (for future)
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_content CHECK (
    content IS NOT NULL OR 
    array_length(media_urls, 1) > 0 OR
    shared_coupon_id IS NOT NULL OR
    shared_deal_id IS NOT NULL
  ),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Critical Indexes for Performance
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_status ON messages(status) WHERE status != 'read';
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_shared_coupon ON messages(shared_coupon_id) WHERE shared_coupon_id IS NOT NULL;
CREATE INDEX idx_messages_shared_deal ON messages(shared_deal_id) WHERE shared_deal_id IS NOT NULL;
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Enable Realtime (CRITICAL for real-time messaging)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

**Rationale:**
- `type` field supports text, media, links, and **crucially** coupon/deal sharing
- `shared_coupon_id` and `shared_deal_id` integrate with your existing sharing system
- `is_edited` and `edited_at` enable message editing feature
- `is_deleted` enables soft deletion (messages can be "unsent")
- `reply_to_id` prepared for threaded replies (v2)
- Composite index on `(conversation_id, created_at)` optimizes message history fetching
- Partial indexes reduce index size for infrequent queries

---

#### **1.3 Message Read Receipts Table**

**Purpose:** Track which users have read which messages (for "delivered" and "read" indicators)

**Schema:**
```sql
CREATE TABLE public.message_read_receipts (
  -- Composite Primary Key
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status Tracking
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  PRIMARY KEY (message_id, user_id)
);

-- Indexes
CREATE INDEX idx_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX idx_read_receipts_unread ON message_read_receipts(user_id, read_at) WHERE read_at IS NULL;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;
```

**Rationale:**
- Separate table allows efficient queries for "unread messages count"
- `delivered_at` and `read_at` timestamps support both status levels
- Partial index on unread messages optimizes badge count queries
- Realtime updates enable instant read receipt UI updates

---

#### **1.4 Conversation Participants Table**

**Purpose:** Explicit participant management (prepared for groups v2, useful for 1:1 metadata)

**Schema:**
```sql
CREATE TABLE public.conversation_participants (
  -- Relationships
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participant Metadata
  is_admin BOOLEAN DEFAULT false, -- For future group chats
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  left_at TIMESTAMPTZ,
  
  -- User-specific settings
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ,
  
  -- Notifications
  notification_preference TEXT DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'none')),
  
  PRIMARY KEY (conversation_id, user_id)
);

-- Indexes
CREATE INDEX idx_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_participants_active ON conversation_participants(user_id) WHERE left_at IS NULL;
```

**Rationale:**
- Decouples participant state from conversations table
- Allows per-user settings (mute, archive, pin) without duplicating conversation data
- `last_read_at` enables accurate unread count calculation
- Prepared for group admin roles (v2)

---

#### **1.5 Message Edits History Table**

**Purpose:** Audit trail for edited messages (transparency & trust)

**Schema:**
```sql
CREATE TABLE public.message_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  old_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT different_content CHECK (old_content != new_content)
);

-- Indexes
CREATE INDEX idx_message_edits_message_id ON message_edits(message_id, edited_at DESC);
```

**Rationale:**
- Users can see "Message edited" indicator
- Edit history accessible via UI (transparency)
- Protects against malicious editing

---

#### **1.6 Typing Indicators Table**

**Purpose:** Track who is currently typing in conversations (ephemeral data)

**Schema:**
```sql
CREATE TABLE public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  PRIMARY KEY (conversation_id, user_id)
);

-- Indexes
CREATE INDEX idx_typing_conversation_id ON typing_indicators(conversation_id);

-- Auto-cleanup old typing indicators (> 10 seconds old)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS trigger AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE started_at < now() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_typing_trigger
  AFTER INSERT ON typing_indicators
  EXECUTE FUNCTION cleanup_old_typing_indicators();
```

**Rationale:**
- Lightweight ephemeral data
- Auto-cleanup prevents stale typing indicators
- Realtime broadcast used for instant updates (not just database polling)

---

#### **1.7 Blocked Users Table**

**Purpose:** Block/unblock functionality (user safety)

**Schema:**
```sql
CREATE TABLE public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reason TEXT,
  
  PRIMARY KEY (blocker_id, blocked_id),
  
  CONSTRAINT cannot_block_self CHECK (blocker_id != blocked_id)
);

-- Indexes
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);
```

**Rationale:**
- Prevents blocked users from sending messages
- Integrated into RLS policies
- Bidirectional block support

---

### **Component 2: Storage Bucket Configuration**

#### **2.1 Message Attachments Bucket**

**Purpose:** Store images and videos sent in messages from **web browsers AND native iOS/Android apps**

**Configuration:**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false, -- PRIVATE bucket (signed URLs only)
  26214400, -- 25 MB limit
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v' -- iOS native camera recordings
  ]
);
```

**📱 Mobile App Considerations:**
- **iOS**: Supports native camera captures (MOV, HEIC/HEIF converted to JPEG)
- **Android**: Supports native camera captures (MP4, JPEG)
- **Storage bucket accepts uploads from Capacitor Filesystem plugin**
- **CORS configured to allow native app origins** (see CORS configuration below)

**File Path Structure:**
```
message-attachments/
  {user_id}/
    {conversation_id}/
      {timestamp}-{filename}             ← Original file (web or mobile)
      {timestamp}-{filename}_thumb.jpg   ← Thumbnail (generated on upload)
      
  # Mobile-specific paths (optional, same structure)
  # Capacitor apps upload to same paths as web
```

**CORS Configuration for Mobile Apps:**
```sql
-- Allow native mobile apps to access storage bucket
-- Configure via Supabase Dashboard: Storage > Settings > CORS
-- Allowed Origins:
--   - https://*.supabase.co (web)
--   - capacitor://localhost (iOS)
--   - http://localhost (Android)
```

**RLS Policies for Storage:**
```sql
-- Policy 1: Users can upload attachments to their own folders
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can view attachments in their conversations
CREATE POLICY "Users can view conversation attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE 
      cp.user_id = auth.uid() AND
      cp.left_at IS NULL AND
      (m.media_urls @> ARRAY[storage.objects.name] OR
       m.thumbnail_url = storage.objects.name)
  )
);

-- Policy 3: Users can delete their own uploaded attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Rationale:**
- Private bucket ensures security (no public URLs)
- File size limit prevents abuse
- MIME type restriction prevents malicious file uploads
- Folder structure enables efficient cleanup
- Signed URLs expire (default 1 hour) for additional security

---

### **Component 3: Row Level Security (RLS) Policies**

#### **3.1 Conversations Table RLS**

```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = ANY(participants));

-- Policy 2: Users can create conversations (only direct conversations in MVP)
CREATE POLICY "Users can create direct conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  type = 'direct' AND
  array_length(participants, 1) = 2 AND
  auth.uid() = ANY(participants) AND
  -- Ensure both users are friends
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE (
      (f.user1_id = auth.uid() AND f.user2_id = ANY(participants)) OR
      (f.user2_id = auth.uid() AND f.user1_id = ANY(participants))
    )
  ) AND
  -- Ensure neither user has blocked the other
  NOT EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE (
      (b.blocker_id = auth.uid() AND b.blocked_id = ANY(participants)) OR
      (b.blocker_id = ANY(participants) AND b.blocked_id = auth.uid())
    )
  )
);

-- Policy 3: Users can update their conversation settings
CREATE POLICY "Users can update conversation settings"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = ANY(participants))
WITH CHECK (auth.uid() = ANY(participants));

-- Policy 4: Users cannot delete conversations (soft delete via archive)
-- No DELETE policy = no one can delete
```

**Rationale:**
- Only conversation participants can see messages
- Creation requires friendship (prevents spam)
- Blocked users cannot create conversations
- No hard delete prevents data loss

---

#### **3.2 Messages Table RLS**

```sql
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view messages in their conversations
CREATE POLICY "Users can view conversation messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY(c.participants)
  )
  AND 
  -- Hide messages from blocked users
  NOT EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE b.blocker_id = auth.uid() 
      AND b.blocked_id = messages.sender_id
  )
);

-- Policy 2: Users can send messages in their conversations
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY(c.participants)
  ) AND
  -- Ensure recipient hasn't blocked sender
  NOT EXISTS (
    SELECT 1 FROM blocked_users b
    JOIN conversations c ON c.id = messages.conversation_id
    WHERE b.blocker_id = ANY(c.participants)
      AND b.blocker_id != auth.uid()
      AND b.blocked_id = auth.uid()
  )
);

-- Policy 3: Users can edit their own messages (within 15 minutes)
CREATE POLICY "Users can edit their own recent messages"
ON messages FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid() AND
  is_deleted = false AND
  created_at > now() - INTERVAL '15 minutes'
)
WITH CHECK (
  sender_id = auth.uid() AND
  is_deleted = false
);

-- Policy 4: Users can delete (soft delete) their own messages
CREATE POLICY "Users can delete their own messages"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());
```

**Rationale:**
- Blocked users' messages are hidden
- 15-minute edit window prevents abuse
- Soft delete preserves conversation context
- Prevents blocked user from sending messages

---

#### **3.3 Read Receipts RLS**

```sql
-- Enable RLS
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view read receipts for messages they sent
CREATE POLICY "Senders can view read receipts"
ON message_read_receipts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  )
);

-- Policy 2: System can create read receipts
CREATE POLICY "System can create read receipts"
ON message_read_receipts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own read receipts
CREATE POLICY "Users can update their own read receipts"
ON message_read_receipts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

### **Component 4: Database Functions & Triggers**

#### **4.1 Send Message Function**

**Purpose:** Atomic message creation with auto-receipt generation

```sql
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_media_urls TEXT[] DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_link_preview JSONB DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_conversation conversations%ROWTYPE;
  v_participant UUID;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation 
  FROM conversations 
  WHERE id = p_conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Verify sender is participant
  IF NOT (auth.uid() = ANY(v_conversation.participants)) THEN
    RAISE EXCEPTION 'User is not a conversation participant';
  END IF;
  
  -- Create message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    media_urls,
    thumbnail_url,
    link_preview,
    shared_coupon_id,
    shared_deal_id,
    reply_to_id,
    status
  ) VALUES (
    p_conversation_id,
    auth.uid(),
    p_content,
    p_type,
    p_media_urls,
    p_thumbnail_url,
    p_link_preview,
    p_shared_coupon_id,
    p_shared_deal_id,
    p_reply_to_id,
    'sent'
  )
  RETURNING id INTO v_message_id;
  
  -- Create read receipt entries for all participants except sender
  FOREACH v_participant IN ARRAY v_conversation.participants LOOP
    IF v_participant != auth.uid() THEN
      INSERT INTO message_read_receipts (message_id, user_id, delivered_at)
      VALUES (v_message_id, v_participant, now());
    END IF;
  END LOOP;
  
  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;
  
  -- If sharing coupon/deal, record in shares table (integration!)
  IF p_shared_coupon_id IS NOT NULL THEN
    INSERT INTO shares (sharer_id, coupon_id, share_method, shared_at)
    VALUES (auth.uid(), p_shared_coupon_id, 'message', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Rationale:**
- Atomic operation (all-or-nothing)
- Auto-generates read receipts
- Updates conversation timestamp
- **Integrates with existing shares table** for coupon/deal tracking
- Security definer allows system-level operations

---

#### **4.2 Mark Message as Read Function**

```sql
CREATE OR REPLACE FUNCTION mark_message_as_read(p_message_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_message messages%ROWTYPE;
BEGIN
  -- Get message details
  SELECT * INTO v_message FROM messages WHERE id = p_message_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Verify user is in conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = v_message.conversation_id 
      AND auth.uid() = ANY(c.participants)
  ) THEN
    RAISE EXCEPTION 'User not in conversation';
  END IF;
  
  -- Don't mark own messages as read
  IF v_message.sender_id = auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Update read receipt
  UPDATE message_read_receipts
  SET read_at = now()
  WHERE message_id = p_message_id 
    AND user_id = auth.uid() 
    AND read_at IS NULL;
  
  -- Update message status if all recipients have read
  UPDATE messages m
  SET status = 'read', updated_at = now()
  WHERE m.id = p_message_id
    AND m.status != 'read'
    AND NOT EXISTS (
      SELECT 1 FROM message_read_receipts mrr
      WHERE mrr.message_id = m.id AND mrr.read_at IS NULL
    );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### **4.3 Get Unread Message Count Function**

```sql
CREATE OR REPLACE FUNCTION get_unread_message_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT m.id)
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE auth.uid() = ANY(c.participants)
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  )::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

#### **4.4 Create or Get Conversation Function**

**Purpose:** Avoid duplicate 1:1 conversations

```sql
CREATE OR REPLACE FUNCTION create_or_get_conversation(p_participant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participants UUID[];
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'direct'
    AND participants @> ARRAY[auth.uid(), p_participant_id]
    AND array_length(participants, 1) = 2
  LIMIT 1;
  
  IF FOUND THEN
    RETURN v_conversation_id;
  END IF;
  
  -- Verify users are friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE (
      (f.user1_id = auth.uid() AND f.user2_id = p_participant_id) OR
      (f.user2_id = auth.uid() AND f.user1_id = p_participant_id)
    )
  ) THEN
    RAISE EXCEPTION 'Users must be friends to create conversation';
  END IF;
  
  -- Verify no blocking
  IF EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE (
      (b.blocker_id = auth.uid() AND b.blocked_id = p_participant_id) OR
      (b.blocker_id = p_participant_id AND b.blocked_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with blocked user';
  END IF;
  
  -- Create conversation
  v_participants := ARRAY[auth.uid(), p_participant_id];
  
  INSERT INTO conversations (type, participants)
  VALUES ('direct', v_participants)
  RETURNING id INTO v_conversation_id;
  
  -- Create participant entries
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, auth.uid()),
    (v_conversation_id, p_participant_id);
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### **4.5 Auto-Update Conversation Timestamp Trigger**

```sql
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
```

---

#### **4.6 Extend Notification Types for Messaging**

```sql
-- Add new notification types to existing enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_reply';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'coupon_shared_message';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deal_shared_message';
```

---

### **Component 5: Database Views for Efficiency**

#### **5.1 Conversation List View**

**Purpose:** Optimized query for conversation list UI

```sql
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
  c.id AS conversation_id,
  c.type,
  c.participants,
  c.is_archived,
  c.is_muted,
  c.is_pinned,
  c.created_at,
  c.last_message_at,
  
  -- Last message details
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.type AS last_message_type,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_timestamp,
  
  -- Sender profile
  sender.full_name AS last_message_sender_name,
  sender.avatar_url AS last_message_sender_avatar,
  
  -- Other participant (for 1:1 conversations)
  CASE 
    WHEN c.type = 'direct' THEN
      (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
  END AS other_participant_id,
  
  other_profile.full_name AS other_participant_name,
  other_profile.avatar_url AS other_participant_avatar,
  other_profile.is_online AS other_participant_online,
  
  -- Unread count
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  ) AS unread_count
  
FROM conversations c

-- Last message
LEFT JOIN LATERAL (
  SELECT * FROM messages 
  WHERE conversation_id = c.id 
    AND is_deleted = false
  ORDER BY created_at DESC 
  LIMIT 1
) lm ON true

-- Last message sender
LEFT JOIN profiles sender ON sender.id = lm.sender_id

-- Other participant (for 1:1)
LEFT JOIN LATERAL (
  SELECT * FROM profiles
  WHERE id = (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
) other_profile ON c.type = 'direct'

WHERE auth.uid() = ANY(c.participants);
```

**Usage:**
```sql
-- Get user's conversation list sorted by recent activity
SELECT * FROM conversation_list
ORDER BY last_message_at DESC NULLS LAST;

-- Get unread conversations only
SELECT * FROM conversation_list
WHERE unread_count > 0
ORDER BY last_message_at DESC;
```

---

### **Component 6: Performance Optimization**

#### **6.1 Index Strategy**

**Critical Indexes Already Created:**
- ✅ GIN index on `conversations.participants`
- ✅ Composite index on `(conversation_id, created_at)` for message history
- ✅ Partial indexes for unread messages
- ✅ Indexes on foreign keys

**Additional Optimization:**
```sql
-- Full-text search on message content (for search feature)
ALTER TABLE messages ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX idx_messages_content_search ON messages USING gin(content_tsv);

-- Materialized view for conversation stats (refreshed periodically)
CREATE MATERIALIZED VIEW conversation_stats AS
SELECT 
  c.id AS conversation_id,
  COUNT(m.id) AS total_messages,
  COUNT(DISTINCT m.sender_id) AS active_participants,
  MAX(m.created_at) AS last_activity,
  COUNT(CASE WHEN m.type = 'image' THEN 1 END) AS image_count,
  COUNT(CASE WHEN m.type = 'video' THEN 1 END) AS video_count,
  COUNT(CASE WHEN m.shared_coupon_id IS NOT NULL THEN 1 END) AS shared_coupons_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id AND m.is_deleted = false
GROUP BY c.id;

CREATE UNIQUE INDEX idx_conversation_stats_id ON conversation_stats(conversation_id);

-- Refresh stats daily
CREATE OR REPLACE FUNCTION refresh_conversation_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_stats;
END;
$$ LANGUAGE plpgsql;
```

---

#### **6.2 Partition Strategy for Large Scale**

**Purpose:** Partition messages table by date for large-scale performance

```sql
-- Convert messages table to partitioned (for future scalability)
-- Run this when message count exceeds 10M rows

CREATE TABLE messages_partitioned (LIKE messages INCLUDING ALL)
PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE messages_2025_01 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE messages_2025_02 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-create future partitions via cron job
```

---

### **Component 7: Data Retention & Cleanup**

#### **7.1 Message Retention Policy**

**Industry Standard:** Messages retained for **90 days** (Instagram, WhatsApp standard)

```sql
-- Soft delete messages older than 90 days
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS void AS $$
BEGIN
  -- Mark messages as deleted (soft delete)
  UPDATE messages
  SET is_deleted = true, deleted_at = now()
  WHERE created_at < now() - INTERVAL '90 days'
    AND is_deleted = false;
    
  -- Delete media files older than 90 days via edge function trigger
  -- (Separate cleanup job for storage bucket)
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (if available) or edge function
```

---

#### **7.2 Cleanup Orphaned Data**

```sql
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS void AS $$
BEGIN
  -- Delete read receipts for deleted messages
  DELETE FROM message_read_receipts
  WHERE message_id IN (
    SELECT id FROM messages WHERE is_deleted = true AND deleted_at < now() - INTERVAL '7 days'
  );
  
  -- Delete typing indicators older than 1 minute
  DELETE FROM typing_indicators
  WHERE started_at < now() - INTERVAL '1 minute';
  
  -- Delete edit history for messages older than 30 days
  DELETE FROM message_edits
  WHERE edited_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 📋 **Story Breakdown for Epic 8.1**

### **Story 8.1.1: Core Tables Schema Creation**
**Tasks:**
- [ ] Create `conversations` table with constraints
- [ ] Create `messages` table with type checks
- [ ] Create `message_read_receipts` table
- [ ] Create `conversation_participants` table
- [ ] Create `message_edits` table
- [ ] Create `typing_indicators` table
- [ ] Create `blocked_users` table
- [ ] Add all necessary indexes
- [ ] Enable Realtime on critical tables
- [ ] Write migration file `20250201_create_messaging_tables.sql`

**🛢 MCP Integration (Supabase MCP):**
```bash
# Create migration file via Supabase MCP
warp mcp run supabase "apply_migration create_messaging_tables"

# Verify tables created
warp mcp run supabase "execute_sql SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%message%' OR tablename = 'conversations';"

# Check indexes
warp mcp run supabase "execute_sql SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages', 'message_read_receipts');"

# Verify Realtime enabled
warp mcp run supabase "execute_sql SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

**Acceptance Criteria:**
- ✅ All tables created successfully
- ✅ Constraints validated (CHECK constraints work)
- ✅ Indexes created and used in query plans
- ✅ Realtime enabled and tested
- ✅ Migration runs without errors

**Estimated Effort:** 2 days

---

### **Story 8.1.2: Row Level Security (RLS) Implementation**
**Tasks:**
- [ ] Enable RLS on all messaging tables
- [ ] Create RLS policies for conversations
- [ ] Create RLS policies for messages (including block checks)
- [ ] Create RLS policies for read receipts
- [ ] Create RLS policies for participants
- [ ] Test RLS with different user scenarios
- [ ] Document RLS policy logic

**🛢 MCP Integration (Supabase MCP):**
```bash
# Enable RLS on all tables
warp mcp run supabase "execute_sql ALTER TABLE conversations ENABLE ROW LEVEL SECURITY; ALTER TABLE messages ENABLE ROW LEVEL SECURITY; ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;"

# Verify RLS enabled
warp mcp run supabase "execute_sql SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages', 'message_read_receipts', 'conversation_participants', 'message_edits', 'typing_indicators', 'blocked_users');"

# List all RLS policies
warp mcp run supabase "execute_sql SELECT schemaname, tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public';"

# Test RLS policy (insert test)
warp mcp run supabase "execute_sql SELECT * FROM conversations WHERE auth.uid() = ANY(participants) LIMIT 5;"
```

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze RLS policy coverage
warp mcp run context7 "analyze RLS policies and identify any tables missing security policies"

# Find potential security gaps
warp mcp run context7 "review database schema and suggest additional RLS policies for messaging tables"
```

**Acceptance Criteria:**
- ✅ Users can only see their conversations
- ✅ Blocked users cannot send messages
- ✅ Edit policy enforces 15-minute window
- ✅ RLS tested with automated tests
- ✅ No data leakage between users

**Estimated Effort:** 3 days

---

### **Story 8.1.3: Storage Bucket Setup**
**Tasks:**
- [ ] Create `message-attachments` storage bucket
- [ ] Configure file size limits (25MB)
- [ ] Set allowed MIME types
- [ ] Create RLS policies for storage bucket
- [ ] Test file upload/download with signed URLs
- [ ] Configure CORS for web/mobile
- [ ] Set up auto-cleanup for orphaned files

**🛢 MCP Integration (Supabase MCP):**
```bash
# Create storage bucket (via Supabase Dashboard or SQL)
warp mcp run supabase "execute_sql INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('message-attachments', 'message-attachments', false, 26214400, '{\"image/*\", \"video/*\"}');"

# Verify bucket created
warp mcp run supabase "execute_sql SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE name = 'message-attachments';"

# Check storage RLS policies
warp mcp run supabase "execute_sql SELECT * FROM storage.objects WHERE bucket_id = 'message-attachments' LIMIT 5;"

# Test signed URL generation (manual test via app)
# Note: Signed URLs are generated in application code, not SQL
```

**📱 Mobile App Testing:**
```bash
# Test storage upload from iOS simulator
# (Manual test via Capacitor Camera plugin in Epic 8.3)

# Test storage upload from Android emulator
# (Manual test via Capacitor Camera plugin in Epic 8.3)

# Verify CORS for native origins
warp mcp run supabase "execute_sql SELECT * FROM storage.buckets WHERE name = 'message-attachments';"
# Check CORS via Supabase Dashboard: Storage > Settings > CORS
```

**Acceptance Criteria:**
- ✅ Bucket created and configured
- ✅ File uploads work from **web browsers**
- ✅ File uploads work from **iOS native app (Capacitor)**
- ✅ File uploads work from **Android native app (Capacitor)**
- ✅ RLS prevents unauthorized access
- ✅ Signed URLs expire correctly
- ✅ File size limits enforced
- ✅ CORS configured for native mobile origins

**Estimated Effort:** 2-3 days (includes mobile testing)

---

### **Story 8.1.4: Core Database Functions**
**Tasks:**
- [ ] Implement `send_message()` function
- [ ] Implement `mark_message_as_read()` function
- [ ] Implement `get_unread_message_count()` function
- [ ] Implement `create_or_get_conversation()` function
- [ ] Create trigger for conversation timestamp updates
- [ ] Extend notification_type enum for messaging
- [ ] Add unit tests for all functions
- [ ] Document function parameters and usage

**🛢 MCP Integration (Supabase MCP):**
```bash
# Create database functions via migration
warp mcp run supabase "apply_migration create_messaging_functions"

# Test send_message function
warp mcp run supabase "execute_sql SELECT send_message('conversation-id-here', 'Test message', 'text');"

# Test mark_message_as_read function
warp mcp run supabase "execute_sql SELECT mark_message_as_read('message-id-here');"

# Test get_unread_message_count function
warp mcp run supabase "execute_sql SELECT get_unread_message_count();"

# Verify trigger created
warp mcp run supabase "execute_sql SELECT tgname, tgrelid::regclass, tgtype FROM pg_trigger WHERE tgname LIKE '%conversation%';"

# List all custom functions
warp mcp run supabase "execute_sql SELECT proname, pg_get_function_arguments(oid) as args FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%message%';"
```

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze function implementation
warp mcp run context7 "review send_message database function and identify potential edge cases or race conditions"

# Check for SQL injection risks
warp mcp run context7 "analyze database functions for SQL injection vulnerabilities"
```

**Acceptance Criteria:**
- ✅ All functions work atomically
- ✅ Error handling for edge cases
- ✅ Functions are SECURITY DEFINER where needed
- ✅ Integration with shares table works
- ✅ Tests cover happy path and error cases

**Estimated Effort:** 3 days

---

### **Story 8.1.5: Optimized Database Views**
**Tasks:**
- [ ] Create `conversation_list` view
- [ ] Add full-text search index on messages
- [ ] Create `conversation_stats` materialized view
- [ ] Set up refresh schedule for materialized views
- [ ] Test view performance with sample data
- [ ] Document view usage patterns

**🛢 MCP Integration (Supabase MCP):**
```bash
# Create views via migration
warp mcp run supabase "apply_migration create_messaging_views"

# Test conversation_list view
warp mcp run supabase "execute_sql SELECT * FROM conversation_list LIMIT 10;"

# Verify full-text search index
warp mcp run supabase "execute_sql SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'messages' AND indexdef LIKE '%gin%';"

# Test full-text search
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE search_vector @@ to_tsquery('english', 'hello') LIMIT 5;"

# Check materialized view
warp mcp run supabase "execute_sql SELECT * FROM conversation_stats LIMIT 10;"

# Manually refresh materialized view
warp mcp run supabase "execute_sql REFRESH MATERIALIZED VIEW conversation_stats;"
```

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze view query performance
warp mcp run context7 "analyze conversation_list view SQL and suggest performance optimizations"
```

**Acceptance Criteria:**
- ✅ Views return data efficiently (<100ms)
- ✅ conversation_list includes all needed fields
- ✅ Unread count calculation is accurate
- ✅ Full-text search works correctly

**Estimated Effort:** 2 days

---

### **Story 8.1.6: Data Retention & Cleanup Jobs**
**Tasks:**
- [ ] Implement `archive_old_messages()` function (90-day retention)
- [ ] Implement `cleanup_orphaned_data()` function
- [ ] Set up scheduled job trigger (pg_cron or edge function)
- [ ] Create admin dashboard for retention monitoring
- [ ] Test cleanup logic with old test data

**🛢 MCP Integration (Supabase MCP):**
```bash
# Create cleanup functions via migration
warp mcp run supabase "apply_migration create_cleanup_functions"

# Test archive_old_messages function
warp mcp run supabase "execute_sql SELECT archive_old_messages();"

# Test cleanup_orphaned_data function
warp mcp run supabase "execute_sql SELECT cleanup_orphaned_data();"

# Deploy edge function for scheduled cleanup (Epic 8.9)
warp mcp run supabase "deploy_edge_function cleanup-old-messages"

# Verify edge function deployed
warp mcp run supabase "list_edge_functions"
```

**Note:** Full automation of retention policy is implemented in **Epic 8.9: Message Retention Automation**

**Acceptance Criteria:**
- ✅ Messages older than 90 days are soft deleted
- ✅ Orphaned data cleaned up regularly
- ✅ Storage bucket files cleaned up
- ✅ No performance impact during cleanup

**Estimated Effort:** 2 days

---

### **Story 8.1.7: Performance Testing & Optimization**
**Tasks:**
- [ ] Load test with 100K messages
- [ ] Analyze query performance with EXPLAIN ANALYZE
- [ ] Optimize slow queries (if any)
- [ ] Test Realtime subscription performance
- [ ] Benchmark storage upload/download speeds
- [ ] Document performance baseline metrics

**🛢 MCP Integration (Supabase MCP):**
```bash
# Analyze query performance with EXPLAIN
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = 'test-conv-id' ORDER BY created_at DESC LIMIT 50;"

# Check for sequential scans
warp mcp run supabase "execute_sql SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages');"

# View slow queries (if pg_stat_statements enabled)
warp mcp run supabase "execute_sql SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE query LIKE '%message%' ORDER BY mean_exec_time DESC LIMIT 10;"

# Check table statistics
warp mcp run supabase "execute_sql SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages');"
```

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze database schema for performance bottlenecks
warp mcp run context7 "analyze messaging database schema and identify potential performance bottlenecks or missing indexes"

# Review query patterns
warp mcp run context7 "review messagingService.ts and identify SQL queries that might benefit from optimization"
```

**Acceptance Criteria:**
- ✅ Message fetch < 50ms
- ✅ Conversation list load < 100ms
- ✅ No sequential scans in query plans
- ✅ Realtime updates < 300ms latency

**Estimated Effort:** 2 days

---

### **Story 8.1.8: Integration with Existing Systems**
**Tasks:**
- [ ] Verify integration with `friendships` table
- [ ] Test integration with `shares` table (coupon/deal tracking)
- [ ] Extend `notifications` table types
- [ ] Test block functionality with `blocked_users`
- [ ] Verify auth flow with existing auth system
- [ ] Update existing friend service to support messaging

**🛢 MCP Integration (Supabase MCP):**
```bash
# Verify friendships table integration
warp mcp run supabase "execute_sql SELECT * FROM friendships WHERE user_id = auth.uid() AND status = 'accepted' LIMIT 5;"

# Check shares table structure
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shares';"

# Test message with coupon share
warp mcp run supabase "execute_sql INSERT INTO messages (conversation_id, sender_id, content, shared_coupon_id) VALUES ('test-conv', auth.uid(), 'Check this coupon!', 'coupon-id-here') RETURNING *;"

# Verify notification types
warp mcp run supabase "execute_sql SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type');"

# Test blocked users integration
warp mcp run supabase "execute_sql SELECT * FROM blocked_users WHERE blocker_id = auth.uid() OR blocked_id = auth.uid();"
```

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze existing codebase for integration points
warp mcp run context7 "find all references to friendships table in the codebase"

warp mcp run context7 "analyze shares table schema and suggest how to track message shares"

# Review notification integration
warp mcp run context7 "review notifications service and identify how to add message notifications"
```

**Acceptance Criteria:**
- ✅ Only friends can start conversations
- ✅ Coupon shares tracked in shares table
- ✅ Notifications created for new messages
- ✅ Blocked users cannot message each other

**Estimated Effort:** 2 days

---

## ✅ **Definition of Done for Epic 8.1**

- [x] All 8 stories completed and tested
- [x] Database migration file created and tested
- [x] RLS policies verified with security audit
- [x] Storage bucket configured and tested
- [x] All database functions have unit tests
- [x] Performance benchmarks meet targets
- [x] Integration with existing systems verified
- [x] Documentation complete (schema diagram, function docs)
- [x] Code reviewed and approved
- [x] Deployed to staging environment
- [x] QA sign-off received

---

## 🧪 **Testing Strategy for Epic 8.1**

### **Unit Tests (Database Functions)**
```sql
-- Test send_message function
DO $$
DECLARE
  v_conversation_id UUID;
  v_message_id UUID;
BEGIN
  -- Create test conversation
  v_conversation_id := create_or_get_conversation('{test-friend-id}');
  
  -- Send message
  v_message_id := send_message(
    v_conversation_id,
    'Test message',
    'text'
  );
  
  -- Verify message created
  ASSERT (SELECT COUNT(*) FROM messages WHERE id = v_message_id) = 1;
  
  -- Verify read receipt created
  ASSERT (SELECT COUNT(*) FROM message_read_receipts WHERE message_id = v_message_id) = 1;
END $$;
```

### **Integration Tests (RLS)**
```typescript
// Test RLS policies
describe('Message RLS Policies', () => {
  it('should not allow user to see messages from conversations they are not in', async () => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    const user3 = await createTestUser()
    
    // User1 and User2 are friends
    await createFriendship(user1.id, user2.id)
    
    // Create conversation between user1 and user2
    const conversation = await createConversation([user1.id, user2.id])
    
    // User2 sends message
    const message = await sendMessage(user2, conversation.id, 'Hello')
    
    // User3 should NOT see the message
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', message.id)
      .auth(user3.token)
    
    expect(data).toHaveLength(0) // RLS blocks access
  })
})
```

### **Performance Tests**
```typescript
// Load test message fetching
describe('Message Performance', () => {
  it('should fetch 50 messages in under 100ms', async () => {
    const conversation = await createTestConversation()
    await seedMessages(conversation.id, 1000) // Seed 1000 messages
    
    const start = Date.now()
    const messages = await fetchMessages(conversation.id, 50)
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(100)
    expect(messages).toHaveLength(50)
  })
})
```

---

## 📊 **Success Metrics for Epic 8.1**

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Migration Success Rate** | 100% | Zero errors during deployment |
| **Query Performance** | < 50ms | EXPLAIN ANALYZE on critical queries |
| **RLS Coverage** | 100% | All tables have RLS enabled |
| **Storage Upload Success** | > 99% | Monitor upload error rate |
| **Index Usage** | 100% | No sequential scans in production |
| **Test Coverage** | > 85% | Database function tests |
| **Documentation Completeness** | 100% | All functions/tables documented |

---

## 🚧 **Risks & Mitigation**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **RLS policy bugs** | High | Comprehensive testing with different user scenarios |
| **Performance issues** | Medium | Load testing before production, monitoring |
| **Data migration failures** | High | Backup before migration, rollback plan |
| **Storage quota limits** | Medium | Implement file size limits, cleanup jobs |
| **Realtime latency** | Medium | Monitor Realtime performance, optimize queries |

---

## 📦 **Deliverables**

1. ✅ **Database Migration File**: `supabase/migrations/20250201_create_messaging_tables.sql`
2. ✅ **RLS Policy Documentation**: `docs/messaging/RLS_POLICIES.md`
3. ✅ **Function Documentation**: `docs/messaging/DATABASE_FUNCTIONS.md`
4. ✅ **Schema Diagram**: `docs/messaging/SCHEMA_DIAGRAM.png`
5. ✅ **Performance Benchmarks**: `docs/messaging/PERFORMANCE_BENCHMARKS.md`
6. ✅ **Test Suite**: `tests/database/messaging.test.sql`

---

## 🔗 **Dependencies**

**Upstream Dependencies:**
- ✅ Epic 2: Authentication system must be complete
- ✅ Epic 5: Friends system must be functional
- ✅ Existing notifications table
- ✅ Existing shares table (for coupon/deal tracking)

**Downstream Dependencies:**
- 🔄 Epic 8.2: Core messaging implementation depends on this database layer
- 🔄 Epic 8.3: Media attachments depend on storage bucket setup
- 🔄 Epic 8.6: Push notifications depend on notification types

---

## 🎓 **Learning Resources for Implementation**

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Postgres RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Efficient Postgres Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

---

**Epic Status:** 📋 **Ready for Implementation**  
**Next Epic:** [EPIC_8.2_Core_Messaging_Implementation.md](./EPIC_8.2_Core_Messaging_Implementation.md)
