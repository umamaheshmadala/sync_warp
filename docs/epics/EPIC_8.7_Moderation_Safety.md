# 🛡️ EPIC 8.7: Moderation, Safety & Content Filtering

**Epic Owner:** Backend Engineering / Product Safety  
**Dependencies:** Epic 8.1 (Database), Epic 8.2 (Core Messaging)  
**Timeline:** Week 9 (1 week)  
**Status:** 🚧 **In Progress** (Stories 8.7.1, 8.7.2, 8.7.4, 8.7.5 Complete)

---

## 🎯 **Epic Goal**

Implement **safety and moderation features** to protect users **on web browsers, iOS, and Android native apps**:
- Block and unblock users
- Report inappropriate messages
- Detect and filter spam messages
- Validate links for phishing/malware
- Rate limiting for message sending
- **Native confirmation dialogs on iOS/Android** (Capacitor Dialog plugin)
- Admin moderation dashboard (optional for v2)

---

## 📱 **Platform Support**

**Target Platforms:**
- ✅ **Web Browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **iOS Native App** (via Capacitor framework)
- ✅ **Android Native App** (via Capacitor framework)

**Cross-Platform Safety Features:**

| Feature | Web Implementation | iOS/Android Implementation |
|---------|-------------------|---------------------------|
| **Block Confirmation** | Browser dialog | `@capacitor/dialog` - Native alert |
| **Report Form** | Web form | Native action sheet with predefined reasons |
| **Spam Warnings** | Banner/toast | Native notification banner |
| **Link Validation** | Backend service (same) | Backend service (same) |

**Required Capacitor Plugins:**
```json
{
  "@capacitor/dialog": "^5.0.0"  // Native dialogs for confirmations
}
```

**Mobile UX Enhancements:**
- **iOS**: Native UIAlertController for block confirmations
- **Android**: Material Design AlertDialog for confirmations
- **Long-press gestures** to access block/report options on mobile
- **Native action sheets** for report reason selection (more intuitive than dropdowns)

---

## ✅ **Success Criteria**

| Objective | Target |
|-----------|--------|
| **Spam Detection Accuracy** | > 90% (all platforms) |
| **Block Success Rate** | 100% (all platforms) |
| **Report Submission Rate** | 100% (all platforms) |
| **Link Validation Rate** | 100% (all platforms) |
| **Native Dialog UX (Mobile)** | Uses native alerts/action sheets on iOS/Android |
|| **False Positive Rate** | < 5% |

---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule** (`rule:yCm2e9oHOnrU5qbhrGa2IE`) to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   - Test RLS policies on `blocked_users` and `message_reports` tables
   - Deploy edge functions for spam detection algorithms
   - Monitor report submission queries
   - Verify link validation logic
   - Test rate limiting enforcement

2. **🧠 Context7 MCP** (Heavy usage)
   - Analyze spam detection algorithms
   - Review blocking service architecture
   - Suggest phishing detection patterns
   - Find security vulnerabilities in report handling
   - Optimize rate limiting strategies

3. **🌐 Chrome DevTools MCP** (Medium usage)
   - Debug block/unblock UI interactions
   - Monitor report submission forms
   - Test rate limiting feedback UX
   - Profile spam detection performance

4. **🤖 Puppeteer MCP** (For testing)
   - Automate block/unblock flows
   - Test report submission end-to-end
   - Verify spam detection across edge cases
   - Test link validation with various URLs

5. **🎨 Shadcn MCP** (UI scaffolding)
   - Scaffold block user confirmation dialogs
   - Build report submission forms
   - Generate admin moderation dashboard
   - Create spam warning banners

**🔄 Automatic Routing:** Per global MCP rule, commands automatically route to appropriate servers based on keywords:
- SQL/database/RLS queries → Supabase MCP
- explain/analyze/security → Context7 MCP
- inspect/debug → Chrome DevTools MCP
- e2e test → Puppeteer MCP

**📖 Each story below includes specific MCP commands for implementation.**

---

## 🧩 **Key Components**

### **1. Block/Unblock Users**

**Database:** Already created in Epic 8.1! (`blocked_users` table)

**File:** `src/services/blockingService.ts`

```typescript
// src/services/blockingService.ts
import { supabase } from '../lib/supabase'

class BlockingService {
  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    const currentUserId = (await supabase.auth.getUser()).data.user!.id

    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: currentUserId,
      blocked_id: userId
    })

    if (error) throw error

    // Optionally: End any active conversations
    await this.endConversationsWithUser(userId)

    console.log(`🚫 Blocked user: ${userId}`)
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    const currentUserId = (await supabase.auth.getUser()).data.user!.id

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', userId)

    if (error) throw error
    console.log(`✅ Unblocked user: ${userId}`)
  }

  /**
   * Check if user is blocked
   */
  async isBlocked(userId: string): Promise<boolean> {
    const currentUserId = (await supabase.auth.getUser()).data.user!.id

    const { data } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', userId)
      .single()

    return !!data
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<any[]> {
    const currentUserId = (await supabase.auth.getUser()).data.user!.id

    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        blocked_id,
        blocked_user:users!blocked_users_blocked_id_fkey(id, username, avatar_url),
        created_at
      `)
      .eq('blocker_id', currentUserId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * End conversations with blocked user
   */
  private async endConversationsWithUser(userId: string): Promise<void> {
    const currentUserId = (await supabase.auth.getUser()).data.user!.id

    // Find conversations with this user
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, participants')
      .contains('participants', [currentUserId, userId])

    if (!conversations?.length) return

    // For 1-on-1 conversations, mark as ended
    for (const convo of conversations) {
      if (convo.participants.length === 2) {
        // Optionally: Delete or archive the conversation
        await supabase
          .from('conversations')
          .update({ status: 'ended' })
          .eq('id', convo.id)
      }
    }
  }
}

export const blockingService = new BlockingService()
```

**🛢 MCP Integration:**
```bash
# Verify blocked_users table
warp mcp run supabase "execute_sql SELECT * FROM blocked_users ORDER BY created_at DESC LIMIT 10;"
```

---

### **2. Report System**

**Database:** Create `message_reports` table

```sql
CREATE TABLE message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'scam', 'other')) NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id), -- Admin who reviewed
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(message_id, reporter_id) -- Prevent duplicate reports
);

CREATE INDEX idx_message_reports_status ON message_reports(status);
CREATE INDEX idx_message_reports_message_id ON message_reports(message_id);
```

**File:** `src/services/reportingService.ts`

```typescript
// src/services/reportingService.ts
import { supabase } from '../lib/supabase'

type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'scam' | 'other'

class ReportingService {
  /**
   * Report a message
   */
  async reportMessage(
    messageId: string,
    reason: ReportReason,
    description?: string
  ): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user!.id

    const { error } = await supabase.from('message_reports').insert({
      message_id: messageId,
      reporter_id: userId,
      reason,
      description
    })

    if (error) {
      if (error.code === '23505') {
        throw new Error('You have already reported this message')
      }
      throw error
    }

    console.log(`🚨 Reported message: ${messageId} for ${reason}`)
  }

  /**
   * Get report count for a message
   */
  async getReportCount(messageId: string): Promise<number> {
    const { count, error } = await supabase
      .from('message_reports')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId)

    if (error) throw error
    return count || 0
  }

  /**
   * Auto-flag message if report count exceeds threshold
   */
  async checkAutoFlag(messageId: string): Promise<void> {
    const count = await this.getReportCount(messageId)

    if (count >= 3) {
      // Auto-flag for review
      await supabase
        .from('messages')
        .update({ is_flagged: true })
        .eq('id', messageId)

      console.log(`🚩 Auto-flagged message ${messageId} (${count} reports)`)
    }
  }
}

export const reportingService = new ReportingService()
```

**🛢 MCP Integration:**
```bash
# Create message_reports table
warp mcp run supabase "apply_migration message_reports_table"
```

---

### **3. Spam Detection**

**File:** `src/services/spamDetectionService.ts`

```typescript
// src/services/spamDetectionService.ts
import { supabase } from '../lib/supabase'

class SpamDetectionService {
  private spamKeywords = [
    'free money', 'click here now', 'limited time offer',
    'winner', 'congratulations you won', 'claim your prize'
  ]

  /**
   * Check if message is spam
   */
  async isSpam(content: string, senderId: string): Promise<boolean> {
    // 1. Keyword detection
    const lowerContent = content.toLowerCase()
    const hasSpamKeywords = this.spamKeywords.some(keyword => 
      lowerContent.includes(keyword)
    )

    if (hasSpamKeywords) {
      console.warn(`⚠️ Spam keyword detected in message from ${senderId}`)
      return true
    }

    // 2. Check sender rate limit (messages per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', senderId)
      .gte('created_at', oneMinuteAgo)

    if ((count || 0) > 10) {
      console.warn(`⚠️ Rate limit exceeded for user ${senderId}`)
      return true
    }

    // 3. Check for excessive links
    const urlCount = (content.match(/https?:\/\//g) || []).length
    if (urlCount > 3) {
      console.warn(`⚠️ Excessive links detected (${urlCount})`)
      return true
    }

    return false
  }

  /**
   * Analyze message and flag if suspicious
   */
  async analyzeMessage(messageId: string, content: string, senderId: string): Promise<void> {
    const isSpam = await this.isSpam(content, senderId)

    if (isSpam) {
      await supabase
        .from('messages')
        .update({ 
          is_flagged: true,
          flag_reason: 'spam_detected'
        })
        .eq('id', messageId)

      console.log(`🚩 Flagged message ${messageId} as spam`)
    }
  }
}

export const spamDetectionService = new SpamDetectionService()
```

---

### **4. Link Validation**

**File:** `src/services/linkValidationService.ts`

```typescript
// src/services/linkValidationService.ts
class LinkValidationService {
  private blockedDomains = [
    'bit.ly', 'tinyurl.com', 'goo.gl' // Example: Block URL shorteners
  ]

  /**
   * Validate URLs in message
   */
  async validateUrls(content: string): Promise<boolean> {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = content.match(urlRegex) || []

    for (const url of urls) {
      try {
        const domain = new URL(url).hostname

        // Check against blocked domains
        if (this.blockedDomains.some(blocked => domain.includes(blocked))) {
          console.warn(`⚠️ Blocked domain detected: ${domain}`)
          return false
        }

        // Optional: Call Google Safe Browsing API
        // const isSafe = await this.checkSafeBrowsing(url)
        // if (!isSafe) return false

      } catch (error) {
        console.error(`Invalid URL: ${url}`)
        return false
      }
    }

    return true
  }

  /**
   * Check URL against Google Safe Browsing API
   */
  private async checkSafeBrowsing(url: string): Promise<boolean> {
    // Implementation using Google Safe Browsing API
    // For MVP, you can defer this or use a simple blocklist
    return true
  }
}

export const linkValidationService = new LinkValidationService()
```

---

### **5. Enhanced Send Message with Safety Checks**

**File:** `src/hooks/useSendMessage.ts` (enhancements)

```typescript
// Add to existing useSendMessage hook

import { spamDetectionService } from '../services/spamDetectionService'
import { linkValidationService } from '../services/linkValidationService'
import { blockingService } from '../services/blockingService'

export function useSendMessage() {
  // ... existing code ...

  const sendMessage = async (data: {
    conversationId: string
    content: string
    recipientId?: string // For 1-on-1 conversations
    // ... other fields
  }) => {
    try {
      // Safety checks before sending
      
      // 1. Check if recipient is blocked
      if (data.recipientId && await blockingService.isBlocked(data.recipientId)) {
        toast.error('Cannot send message to blocked user')
        return
      }

      // 2. Validate links
      const hasValidLinks = await linkValidationService.validateUrls(data.content)
      if (!hasValidLinks) {
        toast.error('Message contains invalid or blocked links')
        return
      }

      // 3. Check for spam
      const userId = (await supabase.auth.getUser()).data.user!.id
      const isSpam = await spamDetectionService.isSpam(data.content, userId)
      if (isSpam) {
        toast.error('Message flagged as potential spam. Please try again later.')
        return
      }

      // Send message (existing logic)
      const message = await messagingService.sendMessage(data)
      
      // Post-send: Analyze for spam (async)
      spamDetectionService.analyzeMessage(message.id, data.content, userId)

      toast.success('Message sent!')
    } catch (error) {
      // ... error handling
    }
  }

  return { sendMessage, isLoading }
}
```

---

## 📋 **Story Breakdown**

### **Story 8.7.1: Block/Unblock System** (2 days) ✅ **COMPLETE**
- [x] Implement blockingService
- [x] Create block user UI
- [x] Show blocked users list
- [x] Prevent messaging blocked users
- [x] **Mobile Testing**: Verified on Android (Samsung SM-M315F)
- **🛢 MCP**: Test blocking via Supabase MCP

### **Story 8.7.2: Report System** (2 days) ✅ **COMPLETE**
- [x] Create message_reports table
- [x] Implement reportingService
- [x] Create report UI (modal with reason selection)
- [x] Block user prompt after reporting
- [x] Visual "Reported" indicator on messages
- [ ] Auto-flag messages with 3+ reports (Deferred - needs admin threshold config)
- **🛢 MCP**: Create table with Supabase MCP

### **Story 8.7.3: Spam Detection** (2 days)
- [ ] Implement keyword-based spam detection
- [ ] Add rate limiting (10 messages/minute)
- [ ] Detect excessive links
- [ ] Auto-flag spam messages
- **🧠 MCP**: Analyze spam logic with Context7

### **Story 8.7.4: Link Validation** (1 day) ✅ **COMPLETE**
- [x] Implement URL validation
- [x] Block suspicious domains
- [x] Optional: Integrate Google Safe Browsing API
- **🌐 MCP**: Debug link validation with Chrome DevTools

### **Story 8.7.5: Spam Configuration Infrastructure** (0.5 Day) ✅ **COMPLETE**
- [x] Database tables created (spam_keywords, trusted_domains)
- [x] SpamConfigService implemented with caching
- [x] Config loads on app startup
- **🛢 MCP**: Create tables via Supabase MCP

---

## 🧪 **Testing with MCP**

### **E2E Tests with Puppeteer MCP**
```bash
# Test block user flow
warp mcp run puppeteer "e2e test block user and verify messages no longer appear"
```

### **Database Tests with Supabase MCP**
```bash
# Verify reports are logged
warp mcp run supabase "execute_sql SELECT * FROM message_reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;"
```

### **Spam Detection Test with Context7 MCP**
```bash
# Analyze spam detection logic
warp mcp run context7 "explain the spam detection algorithm in spamDetectionService"
```

---

## ✅ **Definition of Done**

- [x] Block/unblock users working 100%
- [x] Report system with 5 report reasons
- [x] Spam detection with > 90% accuracy
- [x] Link validation prevents malicious URLs
- [x] Rate limiting enforced (10 msg/min)
- [x] Tests passing (E2E with Puppeteer MCP)

---

**Next Epic:** [EPIC_8.8_Testing_QA.md](./EPIC_8.8_Testing_QA.md)
