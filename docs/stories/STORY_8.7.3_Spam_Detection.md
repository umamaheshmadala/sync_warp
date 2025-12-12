**Parent Epic:** [EPIC 8.7 - Moderation & Safety](../epics/EPIC_8.7_Moderation_Safety.md)
**Priority:** P1 - High
**Status:** ⏸ ️ **WAITING FOR ADMIN PANEL** - Core spam detection implemented. Admin features (spam review queue, keyword management, user reputation controls) require admin panel.
**Dependencies:** Story 8.7.5 (Spam Config Infrastructure) - Partially Independent (keywords seeded in DB)

---

## 🎯 **Goal**
Protect users from abuse via robust **Server-Side** and Client-Side detection. Include rate limiting (10 msg/min global + 20 msg/min per-chat) enforced at the database level to prevent API bypass.

---

## 📋 **Acceptance Criteria**

### 1. Enforcement (Server-Side)
- [ ] **Database Trigger #1**: Global rate limit (10 msg/min across all chats)
- [ ] **Database Trigger #2**: Per-conversation limit (20 msg/min to same chat)
- [ ] **Keyword Filter**: Uses `spam_keywords` table from Story 8.7.5

### 2. Client-Side Experience
- [ ] **Pre-Check**: `SpamDetectionService` checks limits before network request to save bandwidth
- [ ] **Dynamic Keywords**: Fetches spam keywords from DB (auto-updates without redeployment)
- [ ] **Trusted Domains**: Allows multiple links from whitelisted domains
- [ ] **Feedback**: Toast shows "Rate limit exceeded" or "Message content not allowed"

---

## 🧩 **Implementation Details**

### 1. Database Rate Limiting (Dual Triggers)

**Industry Standard (WhatsApp):** Global + Per-Conversation limits.

```sql
-- TRIGGER 1: Global rate limit (10 messages/minute total)
CREATE OR REPLACE FUNCTION check_global_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  msg_count INT;
BEGIN
  SELECT COUNT(*) INTO msg_count
  FROM messages
  WHERE sender_id = auth.uid()
  AND created_at > NOW() - INTERVAL '1 minute';

  IF msg_count >= 10 THEN
    RAISE EXCEPTION 'Global rate limit: Maximum 10 messages per minute.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_global_rate_limit
BEFORE INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION check_global_rate_limit();

-- TRIGGER 2: Per-conversation rate limit (20 messages/minute per chat)
CREATE OR REPLACE FUNCTION check_conversation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  msg_count INT;
BEGIN
  SELECT COUNT(*) INTO msg_count
  FROM messages
  WHERE sender_id = auth.uid()
  AND conversation_id = NEW.conversation_id
  AND created_at > NOW() - INTERVAL '1 minute';

  IF msg_count >= 20 THEN
    RAISE EXCEPTION 'Conversation rate limit: Maximum 20 messages/minute per chat.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_rate_limit
BEFORE INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION check_conversation_rate_limit();
```

### 2. Spam Detection Service (Enhanced)

Uses dynamic keywords from DB (Story 8.7.5 dependency):

```typescript
import { spamConfigService } from './spamConfigService'; // From Story 8.7.5

class SpamDetectionService {
  /**
   * Check if message contains spam keywords (dynamic from DB)
   */
  async isSpam(content: string, senderId: string): Promise<boolean> {
    const lowerContent = content.toLowerCase();
    
    // 1. Dynamic keyword detection
    const keywords = await spamConfigService.fetchKeywords();
    const matchedKeyword = keywords.find(kw => 
      lowerContent.includes(kw.keyword.toLowerCase())
    );

    if (matchedKeyword) {
      console.warn(`⚠️ Spam keyword detected: "${matchedKeyword.keyword}" (severity: ${matchedKeyword.severity})`);
      
      // Block high-severity, flag medium/low
      if (matchedKeyword.severity === 'high') {
        return true; // Block message
      }
    }

    // 2. Excessive link check (with trusted domain exception)
    const isTooManyLinks = await this.checkExcessiveLinks(content);
    if (isTooManyLinks) {
      console.warn(`⚠️ Excessive links detected`);
      return true;
    }

    return false;
  }

  /**
   * Check for excessive links (with trusted domain whitelist)
   */
  private async checkExcessiveLinks(content: string): Promise<boolean> {
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    
    if (urls.length <= 3) {
      return false; // 3 or fewer links is ok
    }

    // Allow unlimited links from trusted domains
    const trustedDomains = await spamConfigService.fetchTrustedDomains();
    const allTrusted = urls.every(url => {
      try {
        const domain = new URL(url).hostname;
        return trustedDomains.some(trusted => domain.includes(trusted));
      } catch {
        return false; // Invalid URL = not trusted
      }
    });

    if (allTrusted) {
      console.log('✅ Multiple links allowed (all from trusted domains)');
      return false;
    }

    return true; // Too many links from untrusted sources
  }

  /**
   * Client-side rate limit check (pre-flight)
   */
  async checkRateLimits(conversationId: string): Promise<{ 
    allowed: boolean; 
    reason?: string; 
    retryAfter?: number 
  }> {
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    // Check global limit
    const { count: globalCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId)
      .gte('created_at', oneMinuteAgo);

    if ((globalCount || 0) >= 10) {
      return { 
        allowed: false, 
        reason: 'You are sending messages too quickly. Please wait a moment.',
        retryAfter: 60 
      };
    }

    // Check per-conversation limit
    const { count: convoCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId)
      .eq('conversation_id', conversationId)
      .gte('created_at', oneMinuteAgo);

    if ((convoCount || 0) >= 20) {
      return { 
        allowed: false, 
        reason: 'Too many messages in this chat. Please slow down.',
        retryAfter: 60 
      };
    }

    return { allowed: true };
  }
}

export const spamDetectionService = new SpamDetectionService();
```

### 3. Integration (`useSendMessage.ts`)

```typescript
export function useSendMessage() {
  const sendMessage = async (data: { conversationId: string; content: string; ... }) => {
    try {
      // 1. Client-side rate limit check (pre-flight)
      const rateLimitCheck = await spamDetectionService.checkRateLimits(data.conversationId);
      if (!rateLimitCheck.allowed) {
        toast.error(rateLimitCheck.reason!);
        return;
      }

      // 2. Spam content check
      const userId = (await supabase.auth.getUser()).data.user!.id;
      const isSpam = await spamDetectionService.isSpam(data.content, userId);
      if (isSpam) {
        toast.error('Message contains prohibited content. Please review and try again.');
        return;
      }

      // 3. Send message (database triggers provide final enforcement)
      await messagingService.sendMessage(data);
      toast.success('Message sent!');
      
    } catch (error) {
      // Handle database trigger errors
      if (error.message?.includes('rate limit')) {
        toast.error('You are sending too fast. Please wait a minute.');
      } else {
        toast.error('Failed to send message');
      }
    }
  };

  return { sendMessage };
}
```

---
---

## 🤖 **MCP Integration Strategy**

### Context7 MCP
- **Code Review**: `warp mcp run context7 "analyze src/services/spamDetectionService.ts for regex performance issues"`

---

## 🧪 **Testing Plan**

### Manual Verification
1.  **Rate Limit**: Send 11 messages quickly. Verify 11th is blocked with "Too fast" error.
2.  **Keyword**: Send "free money". Verify it is blocked or flagged (depending on strictness).
3.  **Links**: Send a message with 4 URLs. Verify block.

### Automated Test
- Unit test `spamDetectionService` with various spam payloads.

---

## ✅ **Definition of Done**
- [x] `SpamDetectionService` implemented.
- [x] Rate limiting enforced (dual triggers: global + per-conversation).
- [x] UI feedback for blocked/limited messages works.
- [x] Suspicious messages are flagged in DB.
- [x] Admin integration points documented

---

## ⏸️ **Admin Panel Requirements**

> [!IMPORTANT]
> **Core functionality is complete, but full spam management requires admin panel implementation.**

### Admin Features Needed:

#### 1. Spam Review Queue
- **Purpose:** Review messages flagged by spam detection system
- **UI:** 
  - List of flagged messages with spam score, reason, timestamp
  - Filter by score, severity, date range
  - Bulk actions (approve/dismiss multiple flags)
- **Actions:**
  - Approve (confirm spam) → Delete message, warn user
  - Dismiss (false positive) → Unflag message, improve keyword
  - Escalate → Forward to senior moderator

#### 2. Spam Keyword Management
- **Purpose:** Configure spam keywords and severity levels
- **UI:**
  - Table of keywords with severity (low/medium/high)
  - Action type (flag vs. block)
  - Add/Edit/Delete keywords
  - Bulk import from CSV
- **Database:** Access to `spam_keywords` table
- **Service:** Admin-only CRUD operations

#### 3. User Reputation Dashboard
- **Purpose:** Monitor and adjust user trust scores
- **UI:**
  - User reputation scores (0-100 scale)
  - Spam flags received, rate limit violations
  - Manual reputation adjustment controls
- **Actions:**
  - Reset violations (give user second chance)
  - Manually boost/reduce reputation
  - View violation history

#### 4. Spam Analytics
- **Purpose:** Monitor spam detection system effectiveness
- **Metrics:**
  - Total messages flagged/blocked per day
  - False positive rate (dismissed flags / total flags)
  - Top triggered keywords
  - Rate limit violation trends
  - Average spam score over time
- **Charts:**
  - Line chart: Spam detections over time
  - Bar chart: Top spam reasons
  - Pie chart: Severity distribution

#### 5. Pattern Management (Advanced)
- **Purpose:** Manage regex patterns for spam detection
- **UI:** Similar to keyword management but for regex patterns
- **Validation:** Test regex before saving to prevent errors

### Database Access Required:
- **Read:** `spam_keywords`, `spam_patterns`, `user_reputation_scores`, `rate_limit_violations`
- **Write:** All spam tables (admin CRUD operations)
- **Query:** Flagged messages (`messages` WHERE `is_spam_flagged = true`)

### API Endpoints for Admin (To Be Implemented):

```typescript
// Admin Spam Service (future implementation)
interface AdminSpamService {
  // Spam Review
  getSpamQueue(filters?: SpamQueueFilters): Promise<FlaggedMessage[]>
  reviewFlag(messageId: string, action: 'approve' | 'dismiss', notes?: string): Promise<void>
  bulkReviewFlags(messageIds: string[], action: 'approve' | 'dismiss'): Promise<void>
  
  // Keyword Management
  getKeywords(): Promise<SpamKeyword[]>
  createKeyword(keyword: CreateSpamKeywordDto): Promise<SpamKeyword>
  updateKeyword(id: string, updates: UpdateSpamKeywordDto): Promise<SpamKeyword>
  deleteKeyword(id: string): Promise<void>
  bulkImportKeywords(csv: string): Promise<ImportResult>
  
  // User Reputation
  getUserReputation(userId: string): Promise<UserReputationDetails>
  adjustReputation(userId: string, adjustment: number, reason: string): Promise<void>
  resetViolations(userId: string): Promise<void>
  
  // Analytics
  getSpamStats(dateRange?: DateRange): Promise<SpamAnalytics>
  getTopKeywords(limit: number): Promise<KeywordStats[]>
  getFalsePositiveRate(): Promise<number>
}
```

### RLS Policies to Add:

```sql
-- Admin policies (add when admin role implemented)
CREATE POLICY "admins_manage_keywords" ON spam_keywords
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admins_view_all_violations" ON rate_limit_violations
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admins_view_all_reputation" ON user_reputation_scores
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
```

### Integration Checklist for Admin Module:

- [ ] Create Admin Spam Service (`adminSpamService.ts`)
- [ ] Build Spam Review Queue UI component
- [ ] Build Keyword Management UI component
- [ ] Build User Reputation Dashboard component
- [ ] Implement spam analytics queries
- [ ] Add admin RLS policies to database
- [ ] Create admin-only API routes
- [ ] Add role-based access control (RBAC)
- [ ] Test false positive handling workflow

---

**Implementation Status:** ✅ **Core Complete** | ⏸️ **Admin Features Pending**
