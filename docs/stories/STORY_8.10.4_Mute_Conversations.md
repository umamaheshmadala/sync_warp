# 🔕 STORY 8.10.4: Mute Conversations

**Parent Epic:** [EPIC 8.10 - Conversation Management & Organization](../epics/EPIC_8.10_Conversation_Management.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Allow users to **mute conversations** with customizable duration to suppress push notifications, essential for managing notification overload from multiple coupon/deal sharing conversations.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Cross-Platform Implementation**

| Feature              | Web                        | iOS                 | Android        |
| -------------------- | -------------------------- | ------------------- | -------------- |
| **Mute Dialog**      | Modal with duration picker | Native picker       | Native picker  |
| **Mute Icon**        | Bell-off icon              | Bell-off icon       | Bell-off icon  |
| **Duration Options** | Dropdown                   | Native wheel picker | Native spinner |
| **Haptic Feedback**  | N/A                        | Light impact        | Light impact   |

**Required Capacitor Plugins:**

```json
{
  "@capacitor/haptics": "^5.0.0" // Already installed
}
```

---

## 📖 **User Stories**

### As a user, I want to:

1. **Mute conversations** - Stop notifications from specific chats
2. **Choose duration** - 1 hour, 8 hours, 1 week, or forever
3. **See mute status** - Visual indicator on muted conversations
4. **Unmute easily** - Quick toggle to restore notifications

### Acceptance Criteria:

- ✅ Muted conversations don't send push notifications
- ✅ Mute duration options: 1h, 8h, 1 week, forever
- ✅ Mute icon visible on conversation card
- ✅ Auto-unmute when duration expires
- ✅ Unmute works immediately

---

## 🧩 **Implementation Tasks**

### **Phase 1: Database Schema (0.5 days)**

#### **Task 1.1: Create conversation_mutes Table**

```sql
-- Table to track muted conversations
CREATE TABLE IF NOT EXISTS conversation_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  muted_until TIMESTAMPTZ,  -- NULL = muted forever
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Index for checking mute status
CREATE INDEX IF NOT EXISTS idx_conversation_mutes_lookup
  ON conversation_mutes(conversation_id, user_id);

-- Index for auto-unmute cleanup
CREATE INDEX IF NOT EXISTS idx_conversation_mutes_expiry
  ON conversation_mutes(muted_until) WHERE muted_until IS NOT NULL;

-- RLS Policies
ALTER TABLE conversation_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mutes"
  ON conversation_mutes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own mutes"
  ON conversation_mutes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mutes"
  ON conversation_mutes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own mutes"
  ON conversation_mutes FOR DELETE
  USING (user_id = auth.uid());
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "apply_migration create_conversation_mutes '
  CREATE TABLE IF NOT EXISTS conversation_mutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    muted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(conversation_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_conversation_mutes_lookup
    ON conversation_mutes(conversation_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_conversation_mutes_expiry
    ON conversation_mutes(muted_until) WHERE muted_until IS NOT NULL;

  ALTER TABLE conversation_mutes ENABLE ROW LEVEL SECURITY;

  CREATE POLICY '\''Users can view their own mutes'\''
    ON conversation_mutes FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY '\''Users can create their own mutes'\''
    ON conversation_mutes FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY '\''Users can update their own mutes'\''
    ON conversation_mutes FOR UPDATE USING (user_id = auth.uid());
  CREATE POLICY '\''Users can delete their own mutes'\''
    ON conversation_mutes FOR DELETE USING (user_id = auth.uid());
'"
```

#### **Task 1.2: Update conversation_list View**

```sql
-- Add is_muted to conversation_list view
CREATE OR REPLACE VIEW conversation_list AS
SELECT
  c.id,
  c.type,
  c.is_archived,
  c.is_pinned,
  c.pinned_at,
  c.archived_at,
  c.last_message_at,
  c.unread_count,
  c.created_at,
  c.updated_at,
  -- Check if conversation is muted
  EXISTS(
    SELECT 1 FROM conversation_mutes cm
    WHERE cm.conversation_id = c.id
      AND cm.user_id = auth.uid()
      AND (cm.muted_until IS NULL OR cm.muted_until > NOW())
  ) as is_muted,
  -- Get mute expiry time
  (
    SELECT cm.muted_until
    FROM conversation_mutes cm
    WHERE cm.conversation_id = c.id
      AND cm.user_id = auth.uid()
    LIMIT 1
  ) as muted_until,
  -- ... (other columns)
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.user_id = auth.uid()
  AND cp.deleted_for_user = false
ORDER BY
  c.is_pinned DESC NULLS LAST,
  c.last_message_at DESC NULLS LAST;
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "execute_sql '
  CREATE OR REPLACE VIEW conversation_list AS
  SELECT
    c.id,
    c.type,
    c.is_archived,
    c.is_pinned,
    c.pinned_at,
    c.archived_at,
    c.last_message_at,
    c.unread_count,
    c.created_at,
    c.updated_at,
    EXISTS(
      SELECT 1 FROM conversation_mutes cm
      WHERE cm.conversation_id = c.id
        AND cm.user_id = auth.uid()
        AND (cm.muted_until IS NULL OR cm.muted_until > NOW())
    ) as is_muted,
    (
      SELECT cm.muted_until
      FROM conversation_mutes cm
      WHERE cm.conversation_id = c.id
        AND cm.user_id = auth.uid()
      LIMIT 1
    ) as muted_until
  FROM conversations c
  JOIN conversation_participants cp ON cp.conversation_id = c.id
  WHERE cp.user_id = auth.uid()
    AND cp.deleted_for_user = false
  ORDER BY
    c.is_pinned DESC NULLS LAST,
    c.last_message_at DESC NULLS LAST;
'"
```

#### **Task 1.3: Create RPC Functions**

```sql
-- RPC: Mute conversation
CREATE OR REPLACE FUNCTION mute_conversation(
  p_conversation_id UUID,
  p_duration_hours INT DEFAULT NULL  -- NULL = forever
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_muted_until TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate muted_until
  IF p_duration_hours IS NOT NULL THEN
    v_muted_until := NOW() + (p_duration_hours || ' hours')::INTERVAL;
  ELSE
    v_muted_until := NULL;  -- Muted forever
  END IF;

  -- Insert or update mute
  INSERT INTO conversation_mutes (conversation_id, user_id, muted_until)
  VALUES (p_conversation_id, v_user_id, v_muted_until)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    muted_until = v_muted_until,
    updated_at = NOW();

  RAISE NOTICE 'Conversation % muted until %', p_conversation_id, v_muted_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Unmute conversation
CREATE OR REPLACE FUNCTION unmute_conversation(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM conversation_mutes
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;

  RAISE NOTICE 'Conversation % unmuted', p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Check if conversation is muted
CREATE OR REPLACE FUNCTION is_conversation_muted(
  p_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_is_muted BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  SELECT EXISTS(
    SELECT 1 FROM conversation_mutes
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id
      AND (muted_until IS NULL OR muted_until > NOW())
  ) INTO v_is_muted;

  RETURN v_is_muted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Apply via Supabase MCP:**

```bash
warp mcp run supabase "apply_migration create_mute_functions '
  CREATE OR REPLACE FUNCTION mute_conversation(p_conversation_id UUID, p_duration_hours INT DEFAULT NULL)
  RETURNS void AS \$\$
  DECLARE
    v_user_id UUID;
    v_muted_until TIMESTAMPTZ;
  BEGIN
    v_user_id := auth.uid();
    IF p_duration_hours IS NOT NULL THEN
      v_muted_until := NOW() + (p_duration_hours || '\'' hours'\'')::INTERVAL;
    ELSE
      v_muted_until := NULL;
    END IF;
    INSERT INTO conversation_mutes (conversation_id, user_id, muted_until)
    VALUES (p_conversation_id, v_user_id, v_muted_until)
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET muted_until = v_muted_until, updated_at = NOW();
  END;
  \$\$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION unmute_conversation(p_conversation_id UUID)
  RETURNS void AS \$\$
  BEGIN
    DELETE FROM conversation_mutes
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
  END;
  \$\$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION is_conversation_muted(p_conversation_id UUID)
  RETURNS BOOLEAN AS \$\$
  DECLARE
    v_is_muted BOOLEAN;
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM conversation_mutes
      WHERE conversation_id = p_conversation_id
        AND user_id = auth.uid()
        AND (muted_until IS NULL OR muted_until > NOW())
    ) INTO v_is_muted;
    RETURN v_is_muted;
  END;
  \$\$ LANGUAGE plpgsql SECURITY DEFINER;
'"
```

**Test Functions:**

```bash
# Test mute for 1 hour
warp mcp run supabase "execute_sql
  SELECT mute_conversation('test-conv-id', 1);
  SELECT * FROM conversation_mutes WHERE conversation_id = 'test-conv-id';
"

# Test mute forever
warp mcp run supabase "execute_sql
  SELECT mute_conversation('test-conv-id', NULL);
  SELECT muted_until FROM conversation_mutes WHERE conversation_id = 'test-conv-id';
"

# Test unmute
warp mcp run supabase "execute_sql
  SELECT unmute_conversation('test-conv-id');
  SELECT COUNT(*) FROM conversation_mutes WHERE conversation_id = 'test-conv-id';
"
```

---

### **Phase 2: Backend Service (0.25 days)**

**File:** `src/services/conversationManagementService.ts` (extend)

```typescript
export type MuteDuration = "1h" | "8h" | "1week" | "forever";

class ConversationManagementService {
  // ... (existing methods)

  /**
   * Mute conversation
   */
  async muteConversation(
    conversationId: string,
    duration: MuteDuration = "forever"
  ): Promise<void> {
    console.log("🔕 Muting conversation:", conversationId, "for", duration);

    const durationHours = {
      "1h": 1,
      "8h": 8,
      "1week": 168, // 7 days * 24 hours
      forever: null,
    }[duration];

    const { error } = await supabase.rpc("mute_conversation", {
      p_conversation_id: conversationId,
      p_duration_hours: durationHours,
    });

    if (error) {
      console.error("Failed to mute conversation:", error);
      throw error;
    }

    console.log("✅ Conversation muted");
  }

  /**
   * Unmute conversation
   */
  async unmuteConversation(conversationId: string): Promise<void> {
    console.log("🔔 Unmuting conversation:", conversationId);

    const { error } = await supabase.rpc("unmute_conversation", {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error("Failed to unmute conversation:", error);
      throw error;
    }

    console.log("✅ Conversation unmuted");
  }

  /**
   * Check if conversation is muted
   */
  async isConversationMuted(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_conversation_muted", {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error("Failed to check mute status:", error);
      return false;
    }

    return data as boolean;
  }
}
```

---

### **Phase 3: Frontend Components (0.75 days)**

#### **Task 3.1: Mute Dialog (Web)**

**File:** `src/components/messaging/MuteConversationDialog.tsx`

```typescript
import React, { useState } from 'react'
import { BellOff, Clock } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { conversationManagementService, type MuteDuration } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'

interface Props {
  conversationId: string
  conversationName: string
  isMuted: boolean
  onClose: () => void
  onMuted: () => void
}

export function MuteConversationDialog({
  conversationId,
  conversationName,
  isMuted,
  onClose,
  onMuted
}: Props) {
  const [selectedDuration, setSelectedDuration] = useState<MuteDuration>('1h')
  const [isMuting, setIsMuting] = useState(false)

  const durations: Array<{ value: MuteDuration; label: string; description: string }> = [
    { value: '1h', label: '1 hour', description: 'Mute for 1 hour' },
    { value: '8h', label: '8 hours', description: 'Mute for 8 hours' },
    { value: '1week', label: '1 week', description: 'Mute for 1 week' },
    { value: 'forever', label: 'Forever', description: 'Mute until you unmute' },
  ]

  const handleMute = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light })
    }

    setIsMuting(true)

    try {
      await conversationManagementService.muteConversation(conversationId, selectedDuration)
      toast.success(`Muted for ${durations.find(d => d.value === selectedDuration)?.label}`)
      onMuted()
      onClose()
    } catch (error) {
      console.error('Mute failed:', error)
      toast.error('Failed to mute conversation')
    } finally {
      setIsMuting(false)
    }
  }

  const handleUnmute = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light })
    }

    setIsMuting(true)

    try {
      await conversationManagementService.unmuteConversation(conversationId)
      toast.success('Conversation unmuted')
      onMuted()
      onClose()
    } catch (error) {
      console.error('Unmute failed:', error)
      toast.error('Failed to unmute conversation')
    } finally {
      setIsMuting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <BellOff className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-semibold">
            {isMuted ? 'Unmute Conversation' : 'Mute Notifications'}
          </h2>
        </div>

        {isMuted ? (
          <div>
            <p className="text-gray-600 mb-6">
              Unmute notifications for "{conversationName}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isMuting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnmute}
                disabled={isMuting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isMuting ? 'Unmuting...' : 'Unmute'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Mute notifications for "{conversationName}"
            </p>

            <div className="space-y-2 mb-6">
              {durations.map(duration => (
                <label
                  key={duration.value}
                  className={cn(
                    'flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors',
                    selectedDuration === duration.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    checked={selectedDuration === duration.value}
                    onChange={() => setSelectedDuration(duration.value)}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{duration.label}</div>
                    <div className="text-sm text-gray-600">{duration.description}</div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isMuting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMute}
                disabled={isMuting}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isMuting ? 'Muting...' : 'Mute'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

#### **Task 3.2: Mute Icon Indicator**

**File:** `src/components/messaging/ConversationCard.tsx` (modify)

```typescript
import { BellOff } from 'lucide-react'

export function ConversationCard({ conversation }: Props) {
  return (
    <div className="flex items-center gap-3 p-4">
      {/* Avatar */}
      <Avatar />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{conversation.other_participant.username}</h3>
          {conversation.is_muted && (
            <BellOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </div>
        {/* Last message preview */}
      </div>

      {/* Unread badge */}
    </div>
  )
}
```

---

## 🧪 **Testing Checklist**

### **Supabase MCP Tests**

```bash
# Test mute for 1 hour
warp mcp run supabase "execute_sql
  SELECT mute_conversation('test-conv-id', 1);
  SELECT conversation_id, muted_until FROM conversation_mutes;
"

# Test mute forever
warp mcp run supabase "execute_sql
  SELECT mute_conversation('test-conv-id', NULL);
  SELECT conversation_id, muted_until FROM conversation_mutes;
"

# Test unmute
warp mcp run supabase "execute_sql
  SELECT unmute_conversation('test-conv-id');
  SELECT COUNT(*) FROM conversation_mutes WHERE conversation_id = 'test-conv-id';
"

# Test is_muted in view
warp mcp run supabase "execute_sql
  SELECT id, is_muted, muted_until FROM conversation_list LIMIT 10;
"
```

### **Manual Testing**

**Web:**

- [ ] Mute dialog appears with duration options
- [ ] Mute icon appears on conversation card
- [ ] Unmute works correctly
- [ ] Push notifications suppressed for muted conversations

**Mobile:**

- [ ] Haptic feedback on mute/unmute
- [ ] Mute icon visible
- [ ] Duration picker works
- [ ] Notifications suppressed

---

## 📊 **Success Metrics**

| Metric                       | Target             |
| ---------------------------- | ------------------ |
| **Mute Success Rate**        | > 99%              |
| **Notification Suppression** | 100%               |
| **Auto-unmute Accuracy**     | 100%               |
| **Haptic Feedback**          | Triggers on mobile |

---

## 📦 **Deliverables**

1. ✅ Table: `conversation_mutes`
2. ✅ RPC: `mute_conversation()`
3. ✅ RPC: `unmute_conversation()`
4. ✅ RPC: `is_conversation_muted()`
5. ✅ Component: `MuteConversationDialog.tsx`
6. ✅ Updated: `ConversationCard.tsx` (mute icon)
7. ✅ Service methods in `conversationManagementService.ts`
8. ✅ Integration with push notification service

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 1.5 days  
**Risk Level:** Low (straightforward mute logic)
