# 🎁 STORY 8.3.4: Coupon/Deal Sharing Integration

**Parent Epic:** [EPIC 8.3 - Media Attachments & Rich Content Sharing](../epics/EPIC_8.3_Media_Rich_Content.md)  
**Story Owner:** Frontend & Backend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation

---

## 🎯 **Story Goal**

Implement **coupon and deal sharing tracking** in the messaging system. Track every share event in the `shares` table, increment share counts, and provide analytics on most-shared coupons/deals. Enhance MessageComposer with quick-share buttons for coupons and deals.

---

## 📖 **User Stories**

### As a user, I want to:
1. Quickly share a coupon/deal from the browse page to a conversation
2. See visual confirmation when I share a coupon/deal
3. Know how many times a coupon/deal has been shared
4. See trending coupons/deals based on share count

### As a product owner, I want to:
1. Track every coupon/deal share for analytics
2. Identify most-shared content
3. Attribute shares to specific users
4. Calculate virality metrics

### Acceptance Criteria:
- ✅ Every coupon/deal share is tracked in `shares` table
- ✅ Share counts increment correctly
- ✅ Share attribution to user_id works
- ✅ Quick-share button on coupon/deal cards
- ✅ Share analytics dashboard accessible
- ✅ 100% tracking accuracy

---

## 🧩 **Implementation Tasks**

### **Phase 1: Database Schema Verification** (0.25 days)

#### Task 1.1: Verify shares Table Structure
```bash
# Check shares table schema
warp mcp run supabase "execute_sql 
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'shares' 
  ORDER BY ordinal_position;
"

# Expected columns:
# - id (uuid, PK)
# - user_id (uuid, FK to users)
# - shareable_type (text: 'coupon' or 'offer')
# - shareable_id (uuid)
# - shared_with_user_id (uuid, nullable)
# - conversation_id (uuid, FK to conversations)
# - created_at (timestamp)
```

#### Task 1.2: Verify RLS Policies on shares Table
```bash
# Check RLS policies
warp mcp run supabase "execute_sql 
  SELECT policyname, cmd, qual 
  FROM pg_policies 
  WHERE tablename = 'shares';
"

# Expected policies:
# - Users can insert their own shares
# - Users can view shares they created or received
```

---

### **Phase 2: Share Tracking Service** (0.75 days)

#### Task 2.1: Create Share Tracking Service
```typescript
// src/services/shareTrackingService.ts
import { supabase } from '../lib/supabase'

export type ShareableType = 'coupon' | 'offer'

interface ShareEvent {
  shareableType: ShareableType
  shareableId: string
  conversationId: string
  sharedWithUserId?: string
}

class ShareTrackingService {
  /**
   * Track a coupon/deal share event
   */
  async trackShare(event: ShareEvent): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('User not authenticated')

      // Insert share record
      const { error: insertError } = await supabase
        .from('shares')
        .insert({
          user_id: user.id,
          shareable_type: event.shareableType,
          shareable_id: event.shareableId,
          conversation_id: event.conversationId,
          shared_with_user_id: event.sharedWithUserId
        })

      if (insertError) throw insertError

      console.log('✅ Share tracked:', event)
    } catch (error) {
      console.error('❌ Failed to track share:', error)
      // Don't throw - share tracking is non-critical
    }
  }

  /**
   * Get share count for a coupon/deal
   */
  async getShareCount(shareableType: ShareableType, shareableId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('shares')
        .select('*', { count: 'exact', head: true })
        .eq('shareable_type', shareableType)
        .eq('shareable_id', shareableId)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Failed to get share count:', error)
      return 0
    }
  }

  /**
   * Get most shared coupons
   */
  async getMostSharedCoupons(limit: number = 10): Promise<Array<{ coupon_id: string; share_count: number }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_most_shared_coupons', { limit_count: limit })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get most shared coupons:', error)
      return []
    }
  }

  /**
   * Get most shared deals
   */
  async getMostSharedDeals(limit: number = 10): Promise<Array<{ offer_id: string; share_count: number }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_most_shared_deals', { limit_count: limit })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get most shared deals:', error)
      return []
    }
  }

  /**
   * Get user's share history
   */
  async getUserShareHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select(`
          *,
          coupon:coupons(id, title),
          offer:offers(id, title),
          conversation:conversations(id, title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get share history:', error)
      return []
    }
  }
}

export const shareTrackingService = new ShareTrackingService()
```

**🛢 Supabase MCP Testing:**
```bash
# Test inserting share record
warp mcp run supabase "execute_sql 
  INSERT INTO shares (user_id, shareable_type, shareable_id, conversation_id) 
  VALUES (auth.uid(), 'coupon', 'test-coupon-id', 'test-conversation-id');
"

# Check share count
warp mcp run supabase "execute_sql 
  SELECT COUNT(*) FROM shares 
  WHERE shareable_type = 'coupon' 
  AND shareable_id = 'test-coupon-id';
"

# Get most shared coupons
warp mcp run supabase "execute_sql 
  SELECT shareable_id, COUNT(*) as share_count 
  FROM shares 
  WHERE shareable_type = 'coupon' 
  GROUP BY shareable_id 
  ORDER BY share_count DESC 
  LIMIT 10;
"
```

---

### **Phase 3: Supabase RPC Functions for Analytics** (0.5 days)

#### Task 3.1: Create get_most_shared_coupons Function
```sql
-- Run via Supabase MCP
CREATE OR REPLACE FUNCTION get_most_shared_coupons(limit_count INT DEFAULT 10)
RETURNS TABLE (
  coupon_id UUID,
  share_count BIGINT,
  title TEXT,
  discount_value INT,
  brand_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.shareable_id::UUID as coupon_id,
    COUNT(*)::BIGINT as share_count,
    c.title,
    c.discount_value,
    b.name as brand_name
  FROM shares s
  JOIN coupons c ON s.shareable_id = c.id
  JOIN brands b ON c.brand_id = b.id
  WHERE s.shareable_type = 'coupon'
  GROUP BY s.shareable_id, c.title, c.discount_value, b.name
  ORDER BY share_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

```bash
# Create function via Supabase MCP
warp mcp run supabase "apply_migration 'create_get_most_shared_coupons' '
CREATE OR REPLACE FUNCTION get_most_shared_coupons(limit_count INT DEFAULT 10)
RETURNS TABLE (coupon_id UUID, share_count BIGINT, title TEXT, discount_value INT, brand_name TEXT) AS
\$\$
BEGIN
  RETURN QUERY
  SELECT 
    s.shareable_id::UUID,
    COUNT(*)::BIGINT,
    c.title,
    c.discount_value,
    b.name
  FROM shares s
  JOIN coupons c ON s.shareable_id = c.id
  JOIN brands b ON c.brand_id = b.id
  WHERE s.shareable_type = '\''coupon'\''
  GROUP BY s.shareable_id, c.title, c.discount_value, b.name
  ORDER BY COUNT(*) DESC
  LIMIT limit_count;
END;
\$\$ LANGUAGE plpgsql;
';"

# Test function
warp mcp run supabase "execute_sql SELECT * FROM get_most_shared_coupons(5);"
```

#### Task 3.2: Create get_most_shared_deals Function
```bash
# Create function via Supabase MCP
warp mcp run supabase "apply_migration 'create_get_most_shared_deals' '
CREATE OR REPLACE FUNCTION get_most_shared_deals(limit_count INT DEFAULT 10)
RETURNS TABLE (offer_id UUID, share_count BIGINT, title TEXT, price DECIMAL, brand_name TEXT) AS
\$\$
BEGIN
  RETURN QUERY
  SELECT 
    s.shareable_id::UUID,
    COUNT(*)::BIGINT,
    o.title,
    o.price,
    b.name
  FROM shares s
  JOIN offers o ON s.shareable_id = o.id
  JOIN brands b ON o.brand_id = b.id
  WHERE s.shareable_type = '\''offer'\''
  GROUP BY s.shareable_id, o.title, o.price, b.name
  ORDER BY COUNT(*) DESC
  LIMIT limit_count;
END;
\$\$ LANGUAGE plpgsql;
';"

# Test function
warp mcp run supabase "execute_sql SELECT * FROM get_most_shared_deals(5);"
```

---

### **Phase 4: Quick Share Button Component** (0.5 days)

#### Task 4.1: Create ShareButton Component
```typescript
// src/components/sharing/ShareButton.tsx
import React, { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { shareTrackingService, ShareableType } from '../../services/shareTrackingService'
import { useSendMessage } from '../../hooks/useSendMessage'
import { toast } from 'react-hot-toast'

interface Props {
  shareableType: ShareableType
  shareableId: string
  shareableTitle: string
  conversationId: string
  onShareComplete?: () => void
}

export function ShareButton({ 
  shareableType, 
  shareableId, 
  shareableTitle,
  conversationId,
  onShareComplete 
}: Props) {
  const [isSharing, setIsSharing] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const { sendMessage } = useSendMessage()

  const handleShare = async () => {
    setIsSharing(true)

    try {
      // Generate share URL
      const shareUrl = shareableType === 'coupon' 
        ? `https://sync.app/coupons/${shareableId}`
        : `https://sync.app/offers/${shareableId}`

      // Send message with link
      await sendMessage({
        conversationId,
        content: `Check out this ${shareableType}: ${shareUrl}`,
        type: 'text'
      })

      // Track share event
      await shareTrackingService.trackShare({
        shareableType,
        shareableId,
        conversationId
      })

      setIsShared(true)
      toast.success(`${shareableType === 'coupon' ? 'Coupon' : 'Deal'} shared!`)
      onShareComplete?.()

      // Reset after 2 seconds
      setTimeout(() => setIsShared(false), 2000)
    } catch (error) {
      console.error('Failed to share:', error)
      toast.error('Failed to share')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={`Share ${shareableTitle}`}
    >
      {isShared ? (
        <>
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Shared!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-medium">Share</span>
        </>
      )}
    </button>
  )
}
```

---

## 🧪 **Testing Checklist**

### Unit Tests
- [ ] Test shareTrackingService.trackShare inserts record
- [ ] Test getShareCount returns accurate count
- [ ] Test getMostSharedCoupons returns top coupons
- [ ] Test getMostSharedDeals returns top deals
- [ ] Test getUserShareHistory returns user's shares
- [ ] Test ShareButton sends message and tracks share

### Integration Tests with Supabase MCP
```bash
# Test share insertion
warp mcp run supabase "execute_sql 
  INSERT INTO shares (user_id, shareable_type, shareable_id, conversation_id) 
  VALUES (auth.uid(), 'coupon', 'test-id', 'conv-id');
"

# Verify share was tracked
warp mcp run supabase "execute_sql 
  SELECT * FROM shares 
  WHERE shareable_id = 'test-id' 
  ORDER BY created_at DESC LIMIT 1;
"

# Test RPC function
warp mcp run supabase "execute_sql SELECT * FROM get_most_shared_coupons(10);"

# Check share count aggregation
warp mcp run supabase "execute_sql 
  SELECT shareable_id, COUNT(*) 
  FROM shares 
  WHERE shareable_type = 'coupon' 
  GROUP BY shareable_id 
  ORDER BY COUNT(*) DESC;
"
```

### E2E Tests with Puppeteer MCP
```bash
# Test complete share flow
warp mcp run puppeteer "navigate to coupon page, click share button, verify message sent and share tracked"

# Test share analytics
warp mcp run puppeteer "navigate to analytics, verify most-shared coupons display correctly"
```

---

## 📊 **Success Metrics**

| Metric | Target | Verification Method |
|--------|--------|-------------------|
| **Share Tracking Accuracy** | 100% | Database audits |
| **Share Count Accuracy** | 100% | Compare count queries |
| **Share Button Response Time** | < 500ms | Chrome DevTools Performance |
| **RPC Function Performance** | < 100ms | Supabase logs |
| **Analytics Data Freshness** | Real-time | Manual verification |

---

## 🔗 **Dependencies**

### Required Before Starting:
- ✅ Epic 8.1: `shares` table must exist
- ✅ Epic 8.1: `coupons` and `offers` tables exist
- ✅ Epic 8.2: `useSendMessage` hook available
- ✅ Story 8.3.3: Link preview service for SynC URLs

### Verify Dependencies:
```bash
# Check shares table
warp mcp run supabase "execute_sql SELECT * FROM shares LIMIT 1;"

# Check coupons table
warp mcp run supabase "execute_sql SELECT * FROM coupons LIMIT 1;"

# Check offers table
warp mcp run supabase "execute_sql SELECT * FROM offers LIMIT 1;"
```

---

## 📦 **Deliverables**

1. ✅ `src/services/shareTrackingService.ts` - Share tracking service
2. ✅ `src/components/sharing/ShareButton.tsx` - Quick share button
3. ✅ Supabase RPC function: `get_most_shared_coupons`
4. ✅ Supabase RPC function: `get_most_shared_deals`
5. ✅ Unit tests for share tracking
6. ✅ Integration tests with Supabase MCP
7. ✅ Analytics dashboard (basic) for most-shared content

---

## 🔄 **Next Story**

➡️ [STORY 8.3.5: Media Display Components](./STORY_8.3.5_Media_Display_Components.md)

---

## 📝 **MCP Command Quick Reference**

### Supabase MCP
```bash
# Insert share
warp mcp run supabase "execute_sql INSERT INTO shares (user_id, shareable_type, shareable_id, conversation_id) VALUES (auth.uid(), 'coupon', 'id', 'conv-id');"

# Get share count
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM shares WHERE shareable_id = 'id';"

# Most shared coupons
warp mcp run supabase "execute_sql SELECT * FROM get_most_shared_coupons(10);"

# User share history
warp mcp run supabase "execute_sql SELECT * FROM shares WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 20;"
```

### Context7 MCP
```bash
# Analyze share tracking logic
warp mcp run context7 "review shareTrackingService for race conditions"

# Optimize RPC functions
warp mcp run context7 "suggest performance optimizations for get_most_shared_coupons"
```

### Puppeteer MCP
```bash
# Test share flow
warp mcp run puppeteer "click share button, verify message and tracking"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 2 days  
**Risk Level:** Low (well-defined tracking, established patterns)
