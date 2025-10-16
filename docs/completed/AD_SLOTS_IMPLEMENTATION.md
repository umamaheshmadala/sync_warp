# Ad Slots Carousel - Implementation Guide

## Overview

The Ad Slots Carousel system displays up to 6 advertisement slots on the dashboard, with automatic fallback to organic content when paid ads are unavailable.

## ✅ What's Implemented

### Components
- ✅ `src/types/ads.ts` - Type definitions
- ✅ `src/components/ads/AdSlot.tsx` - Individual ad display
- ✅ `src/components/ads/AdCarousel.tsx` - Carousel container
- ✅ `src/hooks/useAdSlots.ts` - Data fetching hook
- ✅ `src/components/Dashboard.tsx` - Integration point

### Database
- ✅ `supabase/migrations/20250106_create_ads_table.sql` - Migration file

## Features

### 1. **Up to 6 Ad Slots**
- Displays paid ads first (by priority)
- Fills empty slots with organic content
- Smooth carousel transitions

### 2. **Smart Labeling**
- **Paid ads:** "✨ Sponsored" badge (yellow)
- **Organic content:** "Recommended" badge (green)

### 3. **Auto-advance Carousel**
- Advances every 5 seconds
- Manual navigation with prev/next buttons
- Position indicators at the bottom
- Pause on manual interaction

### 4. **Click & Impression Tracking**
- Impressions tracked on ad view
- Clicks tracked on ad interaction
- Stored in database for analytics

### 5. **Organic Fallbacks**
- Fetches top-rated businesses when no ads available
- Seamless user experience
- No empty states

## Database Schema

```sql
CREATE TABLE ads (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  business_name TEXT NOT NULL,
  type TEXT ('banner' | 'carousel' | 'search' | 'trending'),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  priority INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  daily_budget DECIMAL(10, 2) DEFAULT 500.00,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## How to Deploy

### Step 1: Run Migration

**Option A: Using Supabase CLI**
```bash
supabase migration up
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/20250106_create_ads_table.sql`
4. Execute the SQL

**Option C: Using Supabase MCP (Recommended)**
Use the Supabase MCP tool to apply the migration directly.

### Step 2: Verify Components

Check that all files are in place:
```bash
# Check types
ls src/types/ads.ts

# Check components
ls src/components/ads/AdSlot.tsx
ls src/components/ads/AdCarousel.tsx

# Check hook
ls src/hooks/useAdSlots.ts
```

### Step 3: Test the Implementation

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Dashboard:**
   - Login to the app
   - Dashboard should load with ad carousel
   - You should see organic content (businesses) if no paid ads exist

3. **Test carousel navigation:**
   - Manual prev/next buttons should work
   - Auto-advance should happen every 5 seconds
   - Indicators should show current position

## Adding Test Ads

To test with sample ads, run this SQL in Supabase:

```sql
-- Insert a sample ad (replace business_id with actual ID)
INSERT INTO ads (
  business_id,
  business_name,
  type,
  title,
  description,
  cta_text,
  cta_url,
  priority,
  start_date,
  end_date,
  status
) VALUES
(
  'YOUR_BUSINESS_ID_HERE',
  'Test Restaurant',
  'carousel',
  'Special Weekend Offer - 50% Off!',
  'Don''t miss our exclusive weekend promotion. Limited time only.',
  'View Offer',
  '/business/YOUR_BUSINESS_ID_HERE',
  10,
  NOW(),
  NOW() + INTERVAL '30 days',
  'active'
);
```

## API Usage

### Fetching Ads
Automatically handled by `useAdSlots()` hook:
```typescript
const { slots, loading, trackImpression, trackClick } = useAdSlots();
```

### Tracking Impressions
```typescript
// Automatically called when ad is viewed
trackImpression(adId);
```

### Tracking Clicks
```typescript
// Automatically called when ad is clicked
trackClick(adId);
```

## Business Owner Usage

Business owners can create ads via Supabase dashboard or future admin panel:

```sql
INSERT INTO ads (
  business_id,        -- Your business ID
  business_name,      -- Your business name
  type,               -- 'carousel' for dashboard
  title,              -- Ad headline
  description,        -- Short description
  image_url,          -- Optional image URL
  cta_text,           -- Button text (e.g., "View Offer")
  cta_url,            -- Where to navigate on click
  priority,           -- Higher = shown first (0-100)
  start_date,         -- When ad becomes active
  end_date,           -- When ad expires
  daily_budget,       -- ₹500/day default
  status              -- 'active' to show immediately
) VALUES (
  '...',              -- your values
);
```

## Performance Considerations

- ✅ **Indexes** on type, status, dates, and priority
- ✅ **RLS policies** for security
- ✅ **Fallback to organic** if ads fail to load
- ✅ **Error handling** with graceful degradation
- ✅ **Optimized queries** with limits

## Analytics & Monitoring

### Key Metrics to Track

1. **Impression Rate**
   ```sql
   SELECT SUM(impressions) FROM ads WHERE type = 'carousel';
   ```

2. **Click-Through Rate (CTR)**
   ```sql
   SELECT 
     SUM(clicks)::FLOAT / NULLIF(SUM(impressions), 0) * 100 as ctr
   FROM ads 
   WHERE type = 'carousel';
   ```

3. **Revenue Generated**
   ```sql
   SELECT 
     COUNT(*) as active_ads,
     SUM(daily_budget) as daily_revenue
   FROM ads 
   WHERE status = 'active' AND type = 'carousel';
   ```

## Troubleshooting

### Issue: No ads showing up

**Solution:**
1. Check if ads table exists:
   ```sql
   SELECT * FROM ads LIMIT 1;
   ```
2. Check console for errors
3. Verify organic fallback is working (should show businesses)

### Issue: Tracking not working

**Solution:**
1. Verify tracking functions exist:
   ```sql
   SELECT * FROM pg_proc WHERE proname IN ('track_ad_impression', 'track_ad_click');
   ```
2. Check browser console for RPC errors
3. Verify user is authenticated

### Issue: Carousel not auto-advancing

**Solution:**
1. Check browser console for errors
2. Verify slots array has multiple items
3. Check if autoplay state is set correctly

## Future Enhancements

- [ ] Admin panel for creating/managing ads
- [ ] A/B testing different ad creatives
- [ ] Geotargeting based on user city
- [ ] Budget pacing and spend tracking
- [ ] Analytics dashboard for business owners
- [ ] Ad approval workflow
- [ ] Automated ad pausing when budget exhausted

## Testing Checklist

- [x] Displays up to 6 ad slots
- [x] Empty slots filled with organic content
- [x] Organic content labeled "Recommended"
- [x] Paid ads labeled "Sponsored"
- [x] Carousel auto-advances every 5 seconds
- [x] Manual navigation works (prev/next buttons)
- [x] Indicators show current position
- [x] Clicks tracked for paid ads (when table exists)
- [x] Impressions tracked for paid ads (when table exists)
- [x] Responsive on mobile devices
- [x] Graceful error handling
- [x] Loading state displayed

## Support

For questions or issues:
1. Check `EPIC_3_FULL_COMPLIANCE_PLAN.md` for complete implementation guide
2. Review `EPIC_3_NAVIGATION_UI_AUDIT_REPORT.md` for context
3. Refer to Enhanced Project Brief v2.0 for specifications

---

**Status:** ✅ Phase 1 Complete - Ad Slots Carousel Implemented
**Next Steps:** Phase 1 continues with City Picker, Notification Deep-linking, etc.
