# Story 10.1.1: Share Infrastructure & Service Layer

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🔴 NOT STARTED  
**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Dependencies:** None

---

## 📋 Overview

Create the foundational sharing infrastructure including the unified share service, database schema for tracking, UTM parameter generation, platform detection, and click/conversion tracking.

---

## 🎯 Acceptance Criteria

### AC-1: Database Schema - Share Events Table
**Given** the database needs share tracking  
**When** this story is complete  
**Then** the `share_events` table exists with the following columns:
- `id` (UUID, primary key, auto-generated)
- `user_id` (UUID, nullable, FK to profiles, ON DELETE SET NULL)
- `entity_type` (TEXT, CHECK IN: 'storefront', 'product', 'offer', 'profile')
- `entity_id` (UUID, NOT NULL)
- `share_method` (TEXT, CHECK IN: 'chat', 'native_share', 'copy_link', 'facebook', 'twitter', 'whatsapp', 'email')
- `recipient_user_id` (UUID, nullable, FK to profiles - for in-app chat shares)
- `utm_source` (TEXT)
- `utm_medium` (TEXT)
- `utm_campaign` (TEXT)
- `utm_content` (TEXT)
- `shared_url` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes Required:**
- `idx_share_events_entity` ON (entity_type, entity_id)
- `idx_share_events_user` ON (user_id)
- `idx_share_events_created` ON (created_at)

---

### AC-2: Database Schema - Share Clicks Table
**Given** shared links need click tracking  
**When** this story is complete  
**Then** the `share_clicks` table exists with:
- `id` (UUID, primary key)
- `share_event_id` (UUID, FK to share_events, ON DELETE CASCADE)
- `clicked_at` (TIMESTAMPTZ, DEFAULT NOW())
- `ip_hash` (TEXT, for deduplication - NOT storing raw IP)
- `user_agent` (TEXT)
- `referrer` (TEXT, nullable)

**Indexes:**
- `idx_share_clicks_event` ON (share_event_id)
- `idx_share_clicks_ip_time` ON (share_event_id, ip_hash, clicked_at) - for deduplication

---

### AC-3: Database Schema - Share Conversions Table
**Given** conversions from shares need tracking  
**When** this story is complete  
**Then** the `share_conversions` table exists with:
- `id` (UUID, primary key)
- `share_event_id` (UUID, FK to share_events, ON DELETE CASCADE)
- `conversion_type` (TEXT, CHECK IN: 'favorite', 'follow', 'add_friend', 'signup', 'purchase')
- `converted_user_id` (UUID, FK to profiles)
- `converted_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes:**
- `idx_share_conversions_event` ON (share_event_id)
- `idx_share_conversions_user` ON (converted_user_id)

---

### AC-4: Row Level Security (RLS) Policies
**Given** share data needs proper access control  
**When** this story is complete  
**Then** the following RLS policies exist:

```sql
-- share_events policies
"Users can view own shares" - SELECT where auth.uid() = user_id
"Anyone can create shares" - INSERT with CHECK (true)
"Business owners can view entity shares" - SELECT where user owns the entity

-- share_clicks policies
"Users can view clicks on their shares" - SELECT via join to share_events
"Click tracking inserts allowed" - INSERT with CHECK (true)

-- share_conversions policies
"Users can view conversions on their shares" - SELECT via join
```

---

### AC-5: Unified Share Service
**Given** the app needs consistent sharing functionality  
**When** this story is complete  
**Then** `src/services/unifiedShareService.ts` exists with:

```typescript
export interface ShareOptions {
  entityType: 'storefront' | 'product' | 'offer' | 'profile';
  entityId: string;
  entityData: {
    title: string;
    description: string;
    imageUrl?: string;
    url: string;
  };
}

export type ShareMethod = 'chat' | 'native_share' | 'copy_link' | 'facebook' | 'twitter' | 'whatsapp' | 'email';

export interface ShareResult {
  success: boolean;
  method: ShareMethod;
  shareEventId?: string;
  error?: string;
}

export interface ShareStats {
  totalShares: number;
  uniqueSharers: number;
  totalClicks: number;
  totalConversions: number;
  clickThroughRate: number;
  conversionRate: number;
  methodBreakdown: Record<ShareMethod, number>;
  dailyShares: { date: string; count: number }[];
}

class UnifiedShareService {
  // Generate share URL with UTM parameters
  generateShareUrl(options: ShareOptions, method: ShareMethod): string;
  
  // Track a share event in the database
  trackShare(options: ShareOptions, method: ShareMethod, recipientUserId?: string): Promise<string>;
  
  // Track a click on a shared link
  trackClick(shareEventId: string, ipHash: string, userAgent: string): Promise<void>;
  
  // Track a conversion (favorite, follow, etc.)
  trackConversion(shareEventId: string, type: string, userId: string): Promise<void>;
  
  // Share via native share sheet (uses @capacitor/share or Web Share API)
  shareNative(options: ShareOptions): Promise<ShareResult>;
  
  // Share via clipboard copy
  shareClipboard(options: ShareOptions): Promise<ShareResult>;
  
  // Share to specific social platform
  shareToPlatform(options: ShareOptions, platform: 'facebook' | 'twitter' | 'whatsapp' | 'email'): Promise<ShareResult>;
  
  // Share via in-app chat to one or more friends
  shareToChat(options: ShareOptions, friendIds: string[], message?: string): Promise<ShareResult>;
  
  // Check if native share is available
  isNativeShareSupported(): boolean;
  
  // Get share statistics for an entity
  getShareStats(entityType: string, entityId: string): Promise<ShareStats>;
}

export const unifiedShareService = new UnifiedShareService();
```

---

### AC-6: UTM Parameter Generation
**Given** shares need tracking parameters  
**When** `generateShareUrl()` is called  
**Then** the returned URL includes:
- `utm_source=sync` (constant)
- `utm_medium=share` (constant)
- `utm_campaign=${entityType}_${entityId.substring(0,8)}` (dynamic)
- `utm_content=${shareMethod}` (e.g., 'chat', 'whatsapp')
- `ref=${shareEventId}` (unique tracking ID for this share)

**Example:**
```
https://syncwarp.app/business/cafe-delight?utm_source=sync&utm_medium=share&utm_campaign=storefront_abc12345&utm_content=whatsapp&ref=550e8400-e29b-41d4-a716-446655440000
```

---

### AC-7: Platform Detection Hook
**Given** the app needs to detect native share capability  
**When** this story is complete  
**Then** `src/hooks/usePlatform.ts` exists with:

```typescript
interface PlatformInfo {
  platform: 'ios' | 'android' | 'web';
  isNativeShareSupported: boolean;
  isNativeApp: boolean;
  isMobile: boolean;
  isDesktop: boolean;
}

export function usePlatform(): PlatformInfo;
```

**Detection Logic:**
1. Check `Capacitor.isNativePlatform()` for native app
2. Check `Capacitor.getPlatform()` for iOS/Android
3. Check `navigator.share` availability for Web Share API
4. Check `navigator.userAgent` for mobile vs desktop

---

### AC-8: Social Platform Share URLs
**Given** users click social share buttons  
**When** share button is clicked  
**Then** the correct URL is opened:

| Platform | URL Format |
|----------|------------|
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` |
| Twitter | `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}` |
| WhatsApp | `https://api.whatsapp.com/send?text=${encodedMessage}` (message includes URL) |
| Email | `mailto:?subject=${encodedSubject}&body=${encodedBody}` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` |

---

### AC-9: Click Tracking Resolver
**Given** shared links contain a `ref` parameter  
**When** a user visits a shared link  
**Then** the click is tracked before showing the content:

**Option A: Client-Side Tracking**
```typescript
// In the page component (e.g., BusinessProfile.tsx)
useEffect(() => {
  const ref = searchParams.get('ref');
  if (ref) {
    unifiedShareService.trackClick(ref, hashIP(), navigator.userAgent);
  }
}, [searchParams]);
```

**Option B: Edge Function (Server-Side)**
- Create Supabase Edge Function `/functions/track-click`
- Accepts GET request with `ref` parameter
- Tracks click, then redirects to actual URL
- This is more accurate but adds latency

**Decision:** Implement Option A (client-side) for simplicity, with deduplication logic.

---

### AC-10: Deduplication Logic
**Given** the same user may click a link multiple times  
**When** tracking clicks  
**Then** duplicates within 24 hours from the same IP hash are NOT recorded

```typescript
async trackClick(shareEventId: string, ipHash: string, userAgent: string): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Check for existing click
  const { data: existing } = await supabase
    .from('share_clicks')
    .select('id')
    .eq('share_event_id', shareEventId)
    .eq('ip_hash', ipHash)
    .gte('clicked_at', twentyFourHoursAgo.toISOString())
    .limit(1);
  
  if (!existing?.length) {
    await supabase.from('share_clicks').insert({
      share_event_id: shareEventId,
      ip_hash: ipHash,
      user_agent: userAgent
    });
  }
}
```

---

### AC-11: IP Hashing Utility
**Given** raw IP addresses should not be stored (privacy)  
**When** tracking clicks  
**Then** use a one-way hash:

```typescript
function hashIP(ip: string): string {
  // Use a simple hash - we just need deduplication, not reversibility
  return btoa(ip).substring(0, 16);
}
```

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/services/unifiedShareService.ts` | Core share service |
| `src/hooks/usePlatform.ts` | Platform detection hook |
| `src/hooks/useUnifiedShare.ts` | React hook wrapper for service |
| `supabase/migrations/xxx_create_share_tables.sql` | Database migration |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/supabase.ts` | Types for new tables |
| `src/types/database.ts` | TypeScript types (if exists) |

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] `generateShareUrl()` produces correct UTM params
- [ ] `generateShareUrl()` handles special characters in titles
- [ ] `isNativeShareSupported()` returns correct value per platform
- [ ] `hashIP()` produces consistent output
- [ ] `trackShare()` inserts record with correct data

### Integration Tests
- [ ] `trackShare()` creates record in database
- [ ] `trackClick()` creates click record
- [ ] `trackClick()` deduplicates within 24 hours
- [ ] `trackConversion()` links to correct share event
- [ ] `getShareStats()` returns accurate aggregates

### E2E Tests
- [ ] Native share sheet opens on mobile
- [ ] Clipboard fallback works on desktop
- [ ] Social buttons open correct URLs
- [ ] `ref` param is preserved through share flow

---

## 📊 Database Migration SQL

```sql
-- Migration: Create share tracking tables
-- Epic: 10.1 Unified Sharing Ecosystem
-- Story: 10.1.1 Share Infrastructure

-- 1. Share Events Table
CREATE TABLE IF NOT EXISTS share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('storefront', 'product', 'offer', 'profile')),
  entity_id UUID NOT NULL,
  share_method TEXT NOT NULL CHECK (share_method IN ('chat', 'native_share', 'copy_link', 'facebook', 'twitter', 'whatsapp', 'email')),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  shared_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_share_events_entity ON share_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_created ON share_events(created_at);

-- 2. Share Clicks Table
CREATE TABLE IF NOT EXISTS share_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_event_id UUID NOT NULL REFERENCES share_events(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_share_clicks_event ON share_clicks(share_event_id);
CREATE INDEX IF NOT EXISTS idx_share_clicks_dedup ON share_clicks(share_event_id, ip_hash, clicked_at);

-- 3. Share Conversions Table
CREATE TABLE IF NOT EXISTS share_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_event_id UUID NOT NULL REFERENCES share_events(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('favorite', 'follow', 'add_friend', 'signup', 'purchase')),
  converted_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_conversions_event ON share_conversions(share_event_id);
CREATE INDEX IF NOT EXISTS idx_share_conversions_user ON share_conversions(converted_user_id);

-- 4. RLS Policies
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_conversions ENABLE ROW LEVEL SECURITY;

-- Share Events Policies
CREATE POLICY "Users can view own shares"
  ON share_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create shares"
  ON share_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Business owners can view entity shares"
  ON share_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.owner_id = auth.uid()
      AND (
        (entity_type = 'storefront' AND entity_id = b.id) OR
        (entity_type = 'product' AND entity_id IN (SELECT id FROM products WHERE business_id = b.id)) OR
        (entity_type = 'offer' AND entity_id IN (SELECT id FROM offers WHERE business_id = b.id))
      )
    )
  );

-- Share Clicks Policies
CREATE POLICY "Users can view clicks on their shares"
  ON share_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_events se
      WHERE se.id = share_event_id AND se.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can view clicks"
  ON share_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_events se
      JOIN businesses b ON (
        (se.entity_type = 'storefront' AND se.entity_id = b.id) OR
        (se.entity_type = 'product' AND se.entity_id IN (SELECT id FROM products WHERE business_id = b.id)) OR
        (se.entity_type = 'offer' AND se.entity_id IN (SELECT id FROM offers WHERE business_id = b.id))
      )
      WHERE se.id = share_event_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous click tracking allowed"
  ON share_clicks FOR INSERT
  WITH CHECK (true);

-- Share Conversions Policies
CREATE POLICY "Users can view conversions on their shares"
  ON share_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_events se
      WHERE se.id = share_event_id AND se.user_id = auth.uid()
    )
  );

CREATE POLICY "Conversion tracking allowed"
  ON share_conversions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Analytics Function
CREATE OR REPLACE FUNCTION get_share_stats(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE(
  total_shares BIGINT,
  unique_sharers BIGINT,
  total_clicks BIGINT,
  total_conversions BIGINT,
  method_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(se.id) as total_shares,
    COUNT(DISTINCT se.user_id) as unique_sharers,
    (SELECT COUNT(*) FROM share_clicks sc 
     WHERE sc.share_event_id IN (
       SELECT id FROM share_events 
       WHERE entity_type = p_entity_type AND entity_id = p_entity_id
     )) as total_clicks,
    (SELECT COUNT(*) FROM share_conversions scv 
     WHERE scv.share_event_id IN (
       SELECT id FROM share_events 
       WHERE entity_type = p_entity_type AND entity_id = p_entity_id
     )) as total_conversions,
    (SELECT jsonb_object_agg(share_method, cnt)
     FROM (
       SELECT share_method, COUNT(*) as cnt
       FROM share_events
       WHERE entity_type = p_entity_type AND entity_id = p_entity_id
       GROUP BY share_method
     ) methods) as method_breakdown
  FROM share_events se
  WHERE se.entity_type = p_entity_type AND se.entity_id = p_entity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ Definition of Done

- [ ] All database tables created and verified
- [ ] RLS policies tested and working
- [ ] `unifiedShareService.ts` implemented with all methods
- [ ] `usePlatform` hook working on web and native
- [ ] `useUnifiedShare` hook providing React integration
- [ ] UTM parameters correctly generated
- [ ] Click tracking with deduplication working
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- This story is the foundation for all other sharing stories
- Must be completed before Stories 10.1.2-10.1.5
- The `@capacitor/share` plugin is already installed (Epic 8.3)
- Consider caching `getShareStats()` results for performance
