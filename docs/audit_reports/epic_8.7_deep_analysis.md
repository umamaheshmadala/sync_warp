# Epic 8.7 Stories: Deep Analysis & Industry Standards Review

## Executive Summary
This document analyzes all 4 stories in Epic 8.7 (Moderation & Safety), identifying gaps, asking critical questions, and comparing against industry best practices from platforms like WhatsApp, Telegram, Discord, and Slack.

---

## STORY 8.7.1: Block/Unblock System

### 🔍 Critical Questions & Gaps

#### Q1: **Bidirectional vs Unidirectional Blocking**
**Current Plan:** The story doesn't specify whether blocking is one-way or two-way.

**Industry Standard (WhatsApp/Telegram):**
- **Bidirectional**: When User A blocks User B, BOTH users cannot message each other.
- **Shadow Blocking**: User B is NOT notified they've been blocked.

**Question for Clarification:**
> Should blocking be bidirectional? If A blocks B, can B still send messages to A (that A won't see)?

**Recommended Solution:**
```sql
-- RLS Policy should check BOTH directions
CREATE POLICY "block_messaging_both_ways" ON messages
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = (
      -- Get recipient from conversation participants
      SELECT unnest(participants) FROM conversations 
      WHERE id = NEW.conversation_id AND unnest(participants) != auth.uid()
      LIMIT 1
    ))
    OR (blocked_id = auth.uid() AND blocker_id = (
      SELECT unnest(participants) FROM conversations 
      WHERE id = NEW.conversation_id AND unnest(participants) != auth.uid()
      LIMIT 1
    ))
  )
);
```

#### Q2: **Group Chat Blocking**
**Gap:** Story only mentions 1-on-1 conversations.

**Industry Standard (Telegram/Discord):**
- Blocking a user in a group chat typically:
  - Hides their messages from you (client-side filtering)
  - They can still see your messages
  - Group admin can override blocks

**Question:**
> How should blocking work in group chats? Should blocked users' messages be hidden or fully prevented?

**Recommended Solution:**
- **MVP**: Client-side filtering (hide blocked user messages in groups)
- **Future**: Add "mute user in this group" feature

#### Q3: **Conversation Cleanup**
**Gap:** Line 50 mentions "end conversations" but doesn't specify what happens to existing messages.

**Industry Standard (Signal/WhatsApp):**
- Messages remain in history but are marked as from "Blocked User"
- OR conversation is archived/hidden automatically

**Question:**
> Should existing messages with a blocked user be:
> - A) Kept visible but conversation archived?
> - B) Hidden completely (but not deleted from DB)?
> - C) Deleted?

**Recommended Solution:** Option A (Archive + Keep history for legal/safety reasons)

---

## STORY 8.7.2: Report System

### 🔍 Critical Questions & Gaps

#### Q4: **Mass Reporting Attack Prevention**
**Gap:** Auto-flagging at 3 reports is vulnerable to coordinated abuse.

**Industry Standard (Twitter/Facebook):**
- **Rate Limiting**: Same user can't report > 10 items/hour
- **Report Quality Scoring**: Trusted reporters (high accuracy history) have more weight
- **Honeypot Detection**: Flag reporters who always report valid content (spam reporters)

**Question:**
> How do we prevent a group of malicious users from mass-reporting innocent messages to auto-flag them?

**Recommended Solution:**
```typescript
// Add to reportingService.ts
async checkReporterReputation(userId: string): Promise<number> {
  // Get reporter's historical accuracy
  const { data } = await supabase
    .from('message_reports')
    .select('id, reviewed_at, status')
    .eq('reporter_id', userId)
    .not('reviewed_at', 'is', null);
  
  if (!data || data.length < 5) return 1.0; // New user, neutral weight
  
  const validReports = data.filter(r => r.status === 'actioned').length;
  const totalReports = data.length;
  
  return validReports / totalReports; // 0.0 to 1.0 score
}

// In checkAutoFlag, use weighted count:
// totalWeight = sum of reporter reputations instead of raw count
```

#### Q5: **Missing Report Categories**
**Gap:** Story mentions "Spam, Harassment, etc." but doesn't define all categories.

**Industry Standard (Discord/Slack):**
Required categories for compliance (GDPR/DSA):
- Spam
- Harassment/Bullying
- Hate Speech
- Self-Harm/Suicide
- Sexual Content (NSFW)
- Violence/Threats
- Scam/Fraud
- Impersonation
- Copyright/IP Violation
- Other

**Recommended Solution:**
Update `message_reports` table:
```sql
CREATE TYPE report_reason AS ENUM (
  'spam',
  'harassment',
  'hate_speech',
  'self_harm',
  'sexual_content',
  'violence',
  'scam',
  'impersonation',
  'copyright',
  'other'
);

ALTER TABLE message_reports 
ALTER COLUMN reason TYPE report_reason USING reason::report_reason;
```

#### Q6: **Admin Dashboard Absence**
**Gap:** Reports sit in DB with no review UI.

**Industry Standard (All platforms):**
- Moderation queue with filters (by reason, date, status)
- One-click actions: Dismiss, Delete Message, Ban User, Escalate
- Audit log of moderator actions

**Question:**
> Who will review reports? Do we need a basic admin panel in this sprint, or defer to v2?

**Recommended Solution (MVP):**
- Create `AdminReportsPage.tsx` with read-only table view
- Use Supabase Dashboard for v1 (defer full UI to Epic 8.8 or later)

---

## STORY 8.7.3: Spam Safety & Rate Limiting

### 🔍 Critical Questions & Gaps

#### Q7: **Rate Limit Scope**
**Gap:** Trigger checks messages per user globally. What about per-conversation limits?

**Industry Standard (WhatsApp):**
- **Global Limit**: 256 messages/day to all contacts
- **Per-Conversation Limit**: 10 messages/minute to same person (anti-spam)
- **Broadcast Limit**: 5 lists at once

**Question:**
> Should we also have per-conversation rate limits (e.g., max 20 msgs/min to same person)?

**Recommended Solution:**
Add second trigger:
```sql
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
    RAISE EXCEPTION 'Conversation rate limit: 20 messages/min per chat.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Q8: **Spam Keyword Maintenance**
**Gap:** Hardcoded keywords in `spamDetectionService.ts` require app redeployment to update.

**Industry Standard (Gmail/Outlook):**
- **Remote Config**: Fetch spam rules from backend (Firebase Remote Config, Supabase Edge Function)
- **ML Models**: Use NLP/sentiment analysis (OpenAI Moderation API, Perspective API)

**Recommended Solution (MVP):**
```typescript
// Store keywords in Supabase table
CREATE TABLE spam_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT UNIQUE NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now()
);

// Fetch on app start or cache in localStorage
async function fetchSpamKeywords(): Promise<string[]> {
  const { data } = await supabase.from('spam_keywords').select('keyword');
  return data?.map(row => row.keyword) || [];
}
```

#### Q9: **Legitimate Use Cases**
**Gap:** What if a user legitimately needs to send multiple links (e.g., sharing a playlist)?

**Industry Standard (Slack):**
- **Whitelist Domains**: Trust certain domains (youtube.com, spotify.com)
- **User Override**: "Send Anyway" button for suspicious content (with logging)

**Recommended Solution:**
```typescript
const trustedDomains = ['youtube.com', 'spotify.com', 'github.com', 'google.com'];

async validateUrls(content: string): Promise<{ valid: boolean; warning?: string }> {
  const urls = content.match(/https?:\/\/[^\s]+/g) || [];
  
  if (urls.length > 3) {
    const allTrusted = urls.every(url => {
      const domain = new URL(url).hostname;
      return trustedDomains.some(trusted => domain.includes(trusted));
    });
    
    if (allTrusted) {
      return { valid: true }; // Allow trusted domains
    }
    
    return { 
      valid: false, 
      warning: 'Too many links. Trusted domains are allowed.' 
    };
  }
  
  return { valid: true };
}
```

---

## STORY 8.7.4: Link Validation

### 🔍 Critical Questions & Gaps

#### Q10: **Phishing Detection API**
**Gap:** Story mentions "Google Safe Browsing" but marks it as deferred.

**Industry Standard (Chrome/Firefox):**
- **Google Safe Browsing API v4**: Free tier (10k lookups/day)
- **VirusTotal API**: Checks URLs against 70+ scanners
- **OpenPhish**: Real-time phishing feed

**Question:**
> Should we integrate Google Safe Browsing API for v1, or rely only on local blocklist?

**Recommended Solution (Balanced):**
```typescript
// Hybrid approach: Local blocklist + API for unknown domains
async validateUrlSafety(url: string): Promise<boolean> {
  const domain = new URL(url).hostname;
  
  // 1. Check local blocklist (instant)
  if (this.blockedDomains.includes(domain)) {
    return false;
  }
  
  // 2. Check whitelist (instant)
  if (this.trustedDomains.includes(domain)) {
    return true;
  }
  
  // 3. Call Safe Browsing API (async, cache result)
  const cached = localStorage.getItem(`url_safety_${domain}`);
  if (cached) return cached === 'safe';
  
  const isSafe = await this.checkSafeBrowsingAPI(url);
  localStorage.setItem(`url_safety_${domain}`, isSafe ? 'safe' : 'unsafe');
  
  return isSafe;
}
```

**API Setup:**
```bash
# In .env
VITE_GOOGLE_SAFE_BROWSING_KEY=your_api_key
```

```typescript
private async checkSafeBrowsingAPI(url: string): Promise<boolean> {
  const response = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${import.meta.env.VITE_GOOGLE_SAFE_BROWSING_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({
        client: { clientId: 'sync-app', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      })
    }
  );
  
  const data = await response.json();
  return !data.matches || data.matches.length === 0;
}
```

#### Q11: **Homograph/Punycode Attacks**
**Gap:** Story doesn't address internationalized domain names (IDN) phishing.

**Industry Example:**
- `раypal.com` (Cyrillic 'а') vs `paypal.com` (Latin 'a')
- Browsers show: `xn--ypal-8ve.com`

**Industry Standard (Chrome):**
- Warn users when URL contains mixed scripts
- Convert punycode to visible Unicode with warning

**Recommended Solution:**
```typescript
function detectHomographAttack(url: string): boolean {
  const domain = new URL(url).hostname;
  
  // Check if domain contains punycode
  if (domain.startsWith('xn--')) {
    return true; // Suspicious
  }
  
  // Check for mixed scripts (Latin + Cyrillic)
  const hasCyrillic = /[\u0400-\u04FF]/.test(domain);
  const hasLatin = /[a-zA-Z]/.test(domain);
  
  if (hasCyrillic && hasLatin) {
    return true; // Likely phishing
  }
  
  return false;
}
```

#### Q12: **URL Shortener Handling**
**Gap:** Story blocks ALL URL shorteners. But legitimate use exists (Twitter character limits).

**Industry Standard (LinkedIn):**
- **Expand First**: Resolve shortened URL to final destination
- **Check Final URL**: Validate the expanded URL instead

**Recommended Solution:**
```typescript
async expandShortUrl(shortUrl: string): Promise<string> {
  try {
    // Use a URL expansion service or HEAD request
    const response = await fetch(shortUrl, { 
      method: 'HEAD', 
      redirect: 'follow' 
    });
    return response.url; // Final destination
  } catch {
    return shortUrl; // Couldn't expand, use original
  }
}

async validateUrls(content: string): Promise<boolean> {
  const urls = content.match(/https?:\/\/[^\s]+/g) || [];
  
  for (const url of urls) {
    const domain = new URL(url).hostname;
    
    // If it's a shortener, expand it first
    if (this.shortenerDomains.includes(domain)) {
      const expandedUrl = await this.expandShortUrl(url);
      const finalDomain = new URL(expandedUrl).hostname;
      
      // Now check the final domain
      if (this.blockedDomains.includes(finalDomain)) {
        return false;
      }
    }
  }
  
  return true;
}
```

---

## Cross-Story Gaps

### G1: **Logging & Audit Trail**
**Missing from all stories:** Comprehensive logging for security events.

**Industry Standard (SOC 2 Compliance):**
Every moderation action should be logged:
- Who blocked/reported whom
- When spam was auto-flagged
- Which admin reviewed a report

**Recommended:**
```sql
CREATE TABLE moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- 'block', 'report', 'flag', 'review'
  actor_id UUID REFERENCES users(id),
  target_id UUID, -- user_id or message_id
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### G2: **User Appeals Process**
**Missing:** No way for users to contest false blocks/reports.

**Industry Standard (Facebook/Twitter):**
- "Request Review" button for flagged content
- Appeal form for blocked accounts
- 48-hour SLA for review

**Recommended (Future):**
Add to Epic 8.8 or later.

---

## Summary Table: Questions Requiring Decisions

| # | Question | Story | Industry Standard | Recommended for MVP |
|---|----------|-------|-------------------|---------------------|
| Q1 | Bidirectional blocking? | 8.7.1 | Yes (WhatsApp) | **YES** - Implement |
| Q2 | Group chat blocking? | 8.7.1 | Client-side filter | **DEFER** - Add to Epic cleanup |
| Q3 | Message cleanup strategy? | 8.7.1 | Archive messages | **Archive** |
| Q4 | Prevent mass-report abuse? | 8.7.2 | Reputation scoring | **YES** - Add reputation |
| Q5 | Complete report categories? | 8.7.2 | 10+ categories | **YES** - Use ENUM |
| Q6 | Admin dashboard needed? | 8.7.2 | Critical | **DEFER** - Use Supabase UI |
| Q7 | Per-conversation limits? | 8.7.3 | Yes (WhatsApp) | **YES** - Add trigger |
| Q8 | Remote spam keyword config? | 8.7.3 | Yes (Gmail) | **YES** - DB table |
| Q9 | Trusted domain whitelist? | 8.7.3 | Yes (Slack) | **YES** - Implement |
| Q10 | Safe Browsing API? | 8.7.4 | Standard practice | **YES** - Free tier |
| Q11 | Homograph detection? | 8.7.4 | Browser-level | **YES** - Simple check |
| Q12 | URL expansion? | 8.7.4 | LinkedIn/Twitter | **OPTIONAL** - Nice to have |

---

## Recommended Updated Story Sequence

Given dependencies and new requirements:

1. **STORY 8.7.1**: Block/Unblock (with bidirectional RLS)
2. **STORY 8.7.5**: Spam Keywords Config Table (NEW - prerequisite for 8.7.3)
3. **STORY 8.7.3**: Spam Safety (updated with dual triggers)
4. **STORY 8.7.2**: Report System (updated with reputation + ENUMs)
5. **STORY 8.7.4**: Link Validation (updated with Safe Browsing API)

**Total Effort Revised:** 7-8 days (was 7 days, +1 for new story)
