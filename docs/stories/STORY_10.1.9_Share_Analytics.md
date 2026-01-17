# Story 10.1.9: Comprehensive Customer Engagement Analytics

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** ✅ DONE  
**Priority:** 🔴 High  
**Effort:** 3 days  
**Dependencies:** Stories 10.1.1-5 (All sharing stories), Check-ins, Reviews, Coupons

---

## 📋 Overview

Implement a comprehensive "Customer Engagement Log" within the Business Analytics tab. This feature consolidates **every single interaction** a user has with a business into a unified view. The goal is to give business owners a complete picture of who is engaging with their store and how.

**Scope of Engagement (Interaction Types):**
1.  **Shares:** Users sharing the storefront, offers, or products.
2.  **Check-ins:** Users physically checking in to the location.
3.  **Reviews ("Power Rate"):** Users rating or reviewing the business.
4.  **Redemptions:** Users redeeming coupons.
5.  **Favorites:** Users favoriting deals/business (if publicly trackable).

---

## 🎯 Acceptance Criteria

### AC-1: Unified Engagement Data Function
**Given** a business dashboard requests analytics  
**When** the "Analytics" tab is loaded  
**Then** fetch a unified chronological list of all interactions:
- **Inputs:** `business_id`, `limit` (default 50), `offset`.
- **Outputs:** List of `EngagementEvent` objects containing:
    - `id`: Event ID (UUID)
    - `type`: 'share' | 'checkin' | 'review' | 'redemption' | 'favorite'
    - `user`: { `id`, `full_name`, `avatar_url` } (Actual names displayed)
    - `details`: Text description (e.g., "Redeemed Summer Sale Coupon")
    - `metadata`: specific IDs (e.g., coupon_id, rating_score)
    - `created_at`: Timestamp

### AC-2: Business Engagement Dashboard UI
**Given** the Business Profile -> Analytics Tab  
**When** viewing the "Customer Engagement" section  
**Then** display a detailed list/table of interactions:
- **Header:** "Recent Customer Activity"
- **Rows:**
    - **User:** Avatar + Name
    - **Action:** Badge (e.g., Green for Check-in, Purple for Share, Blue for Review, Orange for Redemption)
    - **Details:** Brief description (e.g., "Gave 5 stars", "Shared via WhatsApp")
    - **Time:** Relative time (e.g., "2 hours ago")

### AC-3: Privacy & Naming
**Given** identifying user data is displayed  
**When** fetching the list  
**Then** ensure:
- Actual names and avatars are shown (as per current requirements).
- *Future Note:* Prepare backend to easily switch to anonymized names (e.g. "Customer #123") later if required.

### AC-4: Real-time Updates (Optional/Nice-to-have)
**Given** a new interaction occurs  
**When** the business owner is on the tab  
**Then** the list should ideally refresh (or have a simple "Refresh" button).

---

## 🛠️ Technical Implementation Plan

### 1. Database Function: `get_business_engagement_log`
Create a PL/pgSQL function to union data from multiple tables.

```sql
CREATE OR REPLACE FUNCTION get_business_engagement_log(
  p_business_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- 1. Shares
  SELECT 
    id as event_id,
    'share' as event_type,
    user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    concat('Shared ', entity_type, ' via ', share_method) as details,
    jsonb_build_object('entity_id', entity_id) as metadata,
    created_at
  FROM share_events s
  JOIN profiles p ON p.id = s.user_id
  WHERE jsonb_extract_path_text(s.metadata, 'business_id')::uuid = p_business_id -- Assuming share events store business_id in metadata or we join businesses
   OR (entity_type = 'storefront' AND entity_id = p_business_id)
   -- NOTE: Need robust logic to link product/offer shares to business
  
  UNION ALL
  
  -- 2. Check-ins
  SELECT 
    id,
    'checkin',
    user_id,
    p.full_name,
    p.avatar_url,
    'Checked in at location' as details,
    jsonb_build_object('location', 'main') as metadata,
    created_at
  FROM checkins c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.business_id = p_business_id
  
  UNION ALL
  
  -- 3. Reviews
  SELECT 
    id,
    'review',
    user_id,
    p.full_name,
    p.avatar_url,
    concat('Rated ', rating, '/5 stars') as details,
    jsonb_build_object('rating', rating) as metadata,
    created_at
  FROM business_reviews r
  JOIN profiles p ON p.id = r.user_id
  WHERE r.business_id = p_business_id
  
  UNION ALL
  
  -- 4. Redemptions
  SELECT 
    id,
    'redemption',
    user_id,
    p.full_name,
    p.avatar_url,
    concat('Redeemed coupon for ', redemption_amount) as details,
    jsonb_build_object('amount', redemption_amount) as metadata,
    redeemed_at as created_at -- Verify column name
  FROM coupon_redemptions cr
  JOIN profiles p ON p.id = cr.user_id
  WHERE cr.business_id = p_business_id
  
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Frontend Hook: `useBusinessEngagement`
Create `src/hooks/useBusinessEngagement.ts` to call this RPC.

### 3. Frontend Component: `BusinessEngagementLog`
Create `src/components/business/analytics/BusinessEngagementLog.tsx`.
- Use a clean table layout.
- Use Lucide icons for event types:
    - Share: `Share2`
    - Check-in: `MapPin`
    - Review: `Star`
    - Redemption: `Ticket`

---

## 📁 Files to Create/Modify
| File | Purpose |
|------|---------|
| `supabase/migrations/xxx_engagement_log.sql` | DB Function for unified log |
| `src/hooks/useBusinessEngagement.ts` | Hook to fetch data |
| `src/components/business/analytics/BusinessEngagementLog.tsx` | New UI component |
| `src/components/business/BusinessProfile.tsx` | Integration into Analytics tab |
| `src/types/analytics.ts` | TS Interfaces |

---

## 🧪 Testing Checklist
- [ ] Verify Shares appear in log (Storefront, Product, Offer shares)
- [ ] Verify Check-ins appear
- [ ] Verify Reviews appear
- [ ] Verify Coupon Redemptions appear
- [ ] Verify sorting (newest first)
- [ ] Verify User details (Name/Avatar) load correctly

