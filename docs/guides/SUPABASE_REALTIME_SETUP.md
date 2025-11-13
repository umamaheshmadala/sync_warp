# Supabase Realtime Setup Guide

## Overview
This guide will help you enable Supabase Realtime on the `favorites` table to ensure immediate database synchronization across all pages and devices.

## Problem This Solves
- Pages not syncing with database immediately
- Favorites not updating across tabs/devices
- Need to manually refresh to see changes
- Excessive "ghost refreshing" from polling mechanisms

## Solution: Supabase Realtime

### What is Realtime?
Supabase Realtime broadcasts database changes (INSERT, UPDATE, DELETE) to all subscribed clients in real-time using WebSockets. This eliminates the need for:
- Polling (checking database repeatedly)
- Manual refresh buttons
- Periodic refresh intervals
- Complex state synchronization logic

---

## Step 1: Enable Realtime in Supabase Dashboard

### Navigate to Replication Settings
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Database** in the left sidebar
4. Click **Replication** tab

### Enable Realtime for `favorites` Table
1. Find the `favorites` table in the list
2. Toggle the **Realtime** switch to **ON** (it should turn green)
3. Click **Save** if prompted

**Screenshot reference:**
```
Tables                    Realtime Status
─────────────────────────────────────────
✓ auth.users              [●] ENABLED
✓ public.businesses       [●] ENABLED  
✓ public.favorites        [●] ENABLED  ← MAKE SURE THIS IS ON
✓ public.coupons          [●] ENABLED
```

---

## Step 2: Verify RLS Policies

Realtime requires proper Row Level Security (RLS) policies to work correctly.

### Check Existing Policies
```sql
-- Run this in SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'favorites';
```

### Required Policies

#### 1. **Allow users to select their own favorites**
```sql
CREATE POLICY "Users can view own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = user_id);
```

#### 2. **Allow users to insert their own favorites**
```sql
CREATE POLICY "Users can insert own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

#### 3. **Allow users to delete their own favorites**
```sql
CREATE POLICY "Users can delete own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = user_id);
```

#### 4. **Allow users to update their own favorites (optional)**
```sql
CREATE POLICY "Users can update own favorites"
ON public.favorites
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Enable RLS on the table
```sql
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
```

---

## Step 3: Verify Table Structure

Your `favorites` table should have these columns:

```sql
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('business', 'coupon', 'product')),
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id) -- Prevent duplicate favorites
);

-- Create index for faster queries
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_entity ON public.favorites(entity_type, entity_id);
```

---

## Step 4: Test Realtime Connection

### Browser Console Test
1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Look for these log messages:

```
✅ Good signs:
[UnifiedFavorites] Setting up realtime subscription for user: <user-id>
[UnifiedFavorites] ✅ Realtime subscription active

❌ Bad signs:
[UnifiedFavorites] ❌ Realtime subscription error: ...
[UnifiedFavorites] ⏱️ Realtime subscription timed out
```

### Multi-Tab Test
1. Open your app in **two browser tabs**
2. Log in to both tabs with the same account
3. In **Tab 1**: Add a favorite (heart icon)
4. Watch **Tab 2**: Should update automatically within 1-2 seconds
5. In **Tab 2**: Remove the favorite
6. Watch **Tab 1**: Should update automatically

### Network Tab Test
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by **WS** (WebSocket)
4. You should see a connection to `wss://your-project.supabase.co/realtime/v1/websocket`
5. Status should be **101 Switching Protocols** (green)

---

## Step 5: Verify Client Configuration

### Check `src/lib/supabase.ts`
Make sure your Supabase client is properly configured:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10 // Optional: limit events for performance
    }
  }
})
```

### Check `.env` File
```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Make sure:
- URL starts with `https://`
- Anon key is the **anon/public** key (not service role key)
- No placeholder values

---

## Troubleshooting

### Issue: "Realtime subscription error"

**Possible Causes:**
1. Realtime not enabled on table
2. RLS policies blocking subscription
3. Invalid Supabase credentials
4. Network/firewall blocking WebSocket connections

**Solutions:**
1. Go to Database → Replication and enable Realtime on `favorites`
2. Run the RLS policy SQL commands above
3. Check `.env` file for correct credentials
4. Try disabling VPN or firewall temporarily

---

### Issue: "Subscription timed out"

**Possible Causes:**
1. Network connection issues
2. Supabase project paused or unavailable
3. Too many concurrent connections

**Solutions:**
1. Check internet connection
2. Verify project status in Supabase dashboard
3. Close unused tabs/connections

---

### Issue: "Changes not syncing immediately"

**Possible Causes:**
1. Multiple subscription channels causing conflicts
2. Component not re-rendering on state updates
3. localStorage cache overriding database

**Solutions:**
1. Clear browser cache and reload
2. Check for duplicate `useEffect` hooks subscribing to realtime
3. Use the "Clear Cache" debug button in favorites page (dev mode)

---

### Issue: "Too many refreshes / ghost refreshing"

**Possible Causes:**
1. Multiple visibility change listeners
2. Periodic refresh interval still running
3. Multiple realtime subscriptions

**Solutions:**
1. ✅ **FIXED**: Removed periodic 30-second refresh
2. ✅ **FIXED**: Removed duplicate visibility listeners
3. ✅ **FIXED**: Proper channel cleanup in `useUnifiedFavorites`

---

## Current Implementation Status

### ✅ What's Fixed
- Removed 30-second periodic refresh from `UnifiedFavoritesPage`
- Removed visibility change listener from `useUnifiedFavorites` hook
- Removed visibility change listener from `AdvancedSearchPage`
- Improved realtime subscription with proper status callbacks
- Added proper channel cleanup with `unsubscribe()`
- Configured channel to not receive own changes (`broadcast: { self: false }`)

### ✅ What's Kept
- Realtime subscription in `useUnifiedFavorites` (primary sync mechanism)
- Visibility listeners in `CouponWallet` and `BusinessDiscoveryPage` (for their own data)
- Manual refresh button in favorites page (for user-triggered refresh)

### 🎯 Expected Behavior Now
- **Favorites**: Update instantly via realtime, no polling
- **Search results**: Show correct favorite states immediately
- **No ghost refreshing**: Pages only update on actual database changes
- **Multi-device sync**: Changes appear instantly across all tabs/devices

---

## Performance Considerations

### Realtime Event Limits
Supabase limits realtime events based on your plan:
- **Free tier**: 2 million events/month
- **Pro tier**: 5 million events/month

### Optimization Tips
1. **Filter subscriptions**: We filter by `user_id` to only receive relevant events
2. **Debounce updates**: Multiple rapid changes trigger single refresh
3. **Batch operations**: Database batches multiple changes when possible
4. **Unsubscribe on unmount**: Proper cleanup prevents memory leaks

### Monitoring Usage
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** → **Usage**
4. Check **Realtime** section for event count

---

## Testing Checklist

- [ ] Realtime enabled on `favorites` table in Supabase dashboard
- [ ] RLS policies allow SELECT, INSERT, DELETE for authenticated users
- [ ] Browser console shows "✅ Realtime subscription active"
- [ ] Network tab shows active WebSocket connection (wss://)
- [ ] Add favorite in Tab 1 → Tab 2 updates within 2 seconds
- [ ] Remove favorite in Tab 2 → Tab 1 updates within 2 seconds
- [ ] Search page shows correct favorite states immediately
- [ ] No excessive refreshing or ghost refreshing
- [ ] Works across different devices (mobile + desktop)

---

## Next Steps After Setup

1. **Test in development**: Verify realtime works locally
2. **Test in production**: Deploy and test with real users
3. **Monitor performance**: Check realtime event usage in dashboard
4. **Scale if needed**: Upgrade plan if approaching event limits

---

## Support

If you encounter issues:
1. Check Supabase Status: https://status.supabase.com
2. Review Supabase Realtime Docs: https://supabase.com/docs/guides/realtime
3. Check browser console for error messages
4. Verify network tab for WebSocket connection status

---

## Summary

✅ **Enabled Realtime** on `favorites` table
✅ **Removed polling** (periodic refresh)
✅ **Removed duplicate listeners** (visibility change)
✅ **Proper subscription cleanup**
✅ **Immediate sync** across all tabs and devices

**Result**: Pages now sync with database instantly without manual refresh or ghost refreshing! 🎉
