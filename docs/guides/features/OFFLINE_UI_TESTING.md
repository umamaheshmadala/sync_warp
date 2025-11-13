# Offline UI Testing Guide - Story 7.3.5

## Components Implemented

### 1. OfflineBanner Component
**Location:** `src/components/ui/OfflineBanner.tsx`

**Features:**
- Fixed banner at the top of the screen
- Shows when connection is lost
- Displays connection type (Wi-Fi, Cellular, None)
- Shows queued items count
- Retry and Refresh action buttons
- Toast notifications for state changes
- Auto-hides after 3 seconds when back online
- Dark mode support
- Mobile responsive
- Accessibility features (ARIA labels, reduced motion)

### 2. SyncStatusIndicator Component
**Location:** `src/components/ui/SyncStatusIndicator.tsx`

**Features:**
- Compact indicator in header (desktop only)
- Shows sync state: idle, syncing, synced, error, offline
- Animated spinning icon when syncing
- Click to show last sync time
- Auto-detects syncing when coming online with queued items
- Theme-aware colors
- Accessibility compliant

## Integration

### App.tsx
- OfflineBanner rendered globally inside Router

### Header.tsx
- SyncStatusIndicator added to header (desktop only, compact mode)

## Manual Testing Steps

### Test 1: Offline Banner Visibility

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the dashboard** (not the landing page):
   - Go to http://localhost:5174/dashboard or login first

3. **Open Chrome DevTools:**
   - Press F12
   - Go to Network tab
   - Check "Offline" checkbox

4. **Expected Results:**
   - Yellow banner appears at the top: "📶 You are offline • Changes will sync when reconnected"
   - Toast notification: "📶 You're offline. Changes will sync when reconnected."
   - Connection type displayed (e.g., "🔌 No connection")
   - "🔄 Retry" and "↻ Refresh" buttons visible

### Test 2: Coming Back Online

1. **While offline, uncheck the "Offline" checkbox in DevTools**

2. **Expected Results:**
   - Banner turns green: "✅ Back online! Syncing your changes..."
   - Toast notification: "✅ Back online! Syncing your changes..."
   - Banner disappears after 3 seconds

### Test 3: Sync Status Indicator (Desktop)

1. **On desktop view (>768px width):**
   - Look at the header, left of the wishlist icon
   - You should see a small circular indicator

2. **States to test:**
   - **Idle:** Gray dot (●)
   - **Online:** Green check (✓) "Saved"
   - **Offline:** 📶 icon with yellow background
   - **Syncing:** Spinning 🔄 icon with blue background

3. **Click the indicator:**
   - Should show last sync time (if available)

### Test 4: Mobile Responsiveness

1. **Toggle device toolbar in Chrome DevTools (Ctrl+Shift+M)**

2. **Select a mobile device**

3. **Expected Results:**
   - Offline banner is full width
   - Action buttons stack vertically
   - Font sizes are smaller
   - Sync indicator NOT visible in header (desktop only)

### Test 5: Queued Items Count

1. **Simulate queued items** (requires integration with sync manager):
   - If you have a sync queue implementation, make changes while offline
   - Banner should show: "📶 You are offline • X changes waiting to sync"

### Test 6: Retry/Refresh Actions

1. **While offline, click "🔄 Retry" button:**
   - Should attempt to reconnect (default: reloads page)

2. **While offline, click "↻ Refresh" button:**
   - Should reload the page

### Test 7: Dark Mode

1. **Enable dark mode in your OS or browser**

2. **Expected Results:**
   - Offline banner: darker yellow background with brighter text
   - Online banner: darker green background
   - Sync indicator: appropriate dark mode colors

### Test 8: Accessibility

1. **Tab navigation:**
   - Tab to Retry and Refresh buttons
   - Should have visible focus outline

2. **Screen reader:**
   - Banner has `role="status"` and `aria-live="polite"`
   - Buttons have `aria-label` attributes

3. **Reduced motion:**
   - Enable reduced motion in OS settings
   - Animations should be simplified or removed

## Known Limitations

1. **Landing Page:** The offline banner may not show on the landing page (`/`) because network status hooks are not active there.

2. **Sync Queue Integration:** The sync status indicator and queued items count require integration with an actual sync manager/queue system.

3. **Service Worker Sync:** The components rely on browser online/offline events. Full offline functionality requires the service worker to be properly configured.

## Testing Checklist

- [ ] Offline banner appears when going offline
- [ ] Offline banner shows correct message
- [ ] Connection type is displayed
- [ ] Retry and Refresh buttons work
- [ ] Toast notifications appear
- [ ] Banner turns green when back online
- [ ] Banner auto-hides after 3 seconds
- [ ] Sync indicator visible on desktop
- [ ] Sync indicator shows correct state
- [ ] Mobile layout is responsive
- [ ] Dark mode works correctly
- [ ] Accessibility features work
- [ ] No layout shift when banner appears
- [ ] Banner has proper z-index (above other content)

## Cross-Platform Testing

### Web (Chrome/Firefox/Safari)
- [ ] Offline detection works
- [ ] Animations smooth
- [ ] Toast notifications appear

### Mobile Web (iOS Safari/Chrome)
- [ ] Banner responsive
- [ ] Touch targets adequate
- [ ] No horizontal scroll

### Capacitor Native (iOS/Android)
- [ ] Network status hook detects native connection changes
- [ ] Connection type (Wi-Fi/Cellular) detected correctly
- [ ] No conflicts with native network APIs

## Troubleshooting

### Banner Not Showing
- Ensure you're not on the landing page
- Check if you're logged in (some routes require auth)
- Verify `useNetworkStatus` hook is working
- Check browser console for errors

### Sync Indicator Not Visible
- Check screen width (desktop only: >768px)
- Verify Header component is rendered
- Check for CSS conflicts

### Animations Not Working
- Check if reduced motion is enabled
- Verify CSS is loaded
- Check for CSS conflicts with other components

## Future Enhancements

1. **Sync Queue Integration:** Connect to actual data sync queue
2. **Progressive Web App:** Full offline data access with service worker
3. **Conflict Resolution UI:** Show conflicts when syncing after long offline period
4. **Bandwidth Indicator:** Show connection speed/quality
5. **Manual Sync Button:** Allow users to force sync
6. **Sync Progress Bar:** Show percentage of items synced
