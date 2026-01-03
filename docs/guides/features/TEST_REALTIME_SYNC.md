# Quick Realtime Sync Test

## Before Testing
Make sure you have:
1. ✅ Enabled Realtime on `favorites` table in Supabase dashboard
2. ✅ Proper RLS policies on `favorites` table
3. ✅ Dev server running (`npm run dev`)
4. ✅ Logged in as a test user

---

## Test 1: Multi-Tab Sync (MOST IMPORTANT)

### Steps:
1. Open app in **Chrome Tab 1**
2. Open app in **Chrome Tab 2** (same browser, same account)
3. Navigate to **Search** or **Discovery** page in both tabs
4. In **Tab 1**: Click the heart icon to favorite a business
5. **Look at Tab 2 immediately** (within 1-2 seconds)

### Expected Result:
- ✅ Heart icon in Tab 2 should fill automatically
- ✅ Console in Tab 2 shows: `[UnifiedFavorites] Realtime database change: INSERT`
- ✅ No manual refresh needed

### Actual Result (fill in after testing):
- [ ] Tab 2 updated instantly
- [ ] Tab 2 took ____ seconds to update
- [ ] Tab 2 never updated (ERROR)

---

## Test 2: Remove Favorite Sync

### Steps:
1. In **Tab 2**: Click the heart icon to unfavorite
2. **Look at Tab 1 immediately**

### Expected Result:
- ✅ Heart icon in Tab 1 should empty automatically
- ✅ Console in Tab 1 shows: `[UnifiedFavorites] Realtime database change: DELETE`

### Actual Result:
- [ ] Tab 1 updated instantly
- [ ] Tab 1 took ____ seconds to update
- [ ] Tab 1 never updated (ERROR)

---

## Test 3: No Ghost Refreshing

### Steps:
1. Open **Favorites page** in one tab
2. **Do nothing** - just watch for 2 minutes
3. Monitor browser console

### Expected Result:
- ✅ Page should NOT refresh on its own
- ✅ Console should NOT show repeated refresh messages
- ✅ Favorites list should remain stable

### Actual Result:
- [ ] Page stayed stable (no ghost refresh)
- [ ] Page refreshed ____ times in 2 minutes (ERROR)

---

## Test 4: Console Check

### Steps:
1. Open browser console (F12)
2. Filter logs by: `UnifiedFavorites`
3. Look for these messages:

### Expected Messages:
```
✅ [UnifiedFavorites] Setting up realtime subscription for user: <user-id>
✅ [UnifiedFavorites] ✅ Realtime subscription active
```

### Error Messages (if any):
```
❌ [UnifiedFavorites] ❌ Realtime subscription error: ...
❌ [UnifiedFavorites] ⏱️ Realtime subscription timed out
```

### Actual Result:
- [ ] Saw "✅ Realtime subscription active"
- [ ] Saw error messages (paste below):

```
<paste error messages here>
```

---

## Test 5: Network WebSocket Check

### Steps:
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Click **WS** filter (WebSocket)
4. Look for connection to Supabase

### Expected Result:
- ✅ Connection to `wss://your-project.supabase.co/realtime/v1/websocket`
- ✅ Status: **101 Switching Protocols** (green)
- ✅ Messages tab shows heartbeat pings

### Actual Result:
- [ ] WebSocket connection found
- [ ] WebSocket status: ____
- [ ] No WebSocket connection (ERROR)

---

## Test 6: Cross-Device Sync (Optional)

### Steps:
1. Open app on **Desktop** browser
2. Open app on **Mobile** browser (same account)
3. Favorite something on mobile
4. Check desktop

### Expected Result:
- ✅ Desktop updates within 1-2 seconds

### Actual Result:
- [ ] Desktop updated instantly
- [ ] Desktop took ____ seconds
- [ ] Desktop never updated

---

## Troubleshooting

### If Test 1 fails (no sync):

**Check 1: Is Realtime enabled?**
```bash
# Go to Supabase Dashboard
# Database → Replication → favorites table
# Make sure toggle is ON (green)
```

**Check 2: Console errors?**
```
Open F12 → Console
Look for any errors with "realtime" or "websocket"
```

**Check 3: Are you logged in?**
```
Realtime only works for authenticated users
Check if localStorage has auth token
```

**Check 4: Network blocked?**
```
Try disabling VPN/firewall
Check if corporate network blocks WebSockets
```

---

### If Test 3 fails (ghost refreshing):

**Check 1: Periodic refresh removed?**
```typescript
// In UnifiedFavoritesPage.tsx
// Should NOT have setInterval with 30000
```

**Check 2: Visibility listeners removed?**
```typescript
// In useUnifiedFavorites.ts
// Should NOT have document.addEventListener('visibilitychange')
```

**Check 3: Multiple subscriptions?**
```
Open console and count how many times you see:
"Setting up realtime subscription"
Should only appear ONCE per user session
```

---

## Success Criteria

All tests should show:
- ✅ Multi-tab sync within 1-2 seconds
- ✅ No ghost refreshing
- ✅ Console shows "Realtime subscription active"
- ✅ WebSocket connection established
- ✅ No errors in console

---

## If All Tests Pass

Congratulations! 🎉 Your realtime sync is working correctly.

Next steps:
1. Test with real users
2. Monitor Supabase realtime usage in dashboard
3. Deploy to production

---

## If Tests Fail

Follow `SUPABASE_REALTIME_SETUP.md` guide step-by-step to enable realtime on the `favorites` table.

Key steps:
1. Database → Replication → Enable on `favorites`
2. Verify RLS policies
3. Check browser console for errors
4. Test WebSocket connection
