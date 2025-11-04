# Epic 7.3: Enhanced Offline Mode with PWA ⚪ PLANNED

**Goal**: Implement production-ready offline functionality with automatic service workers, data persistence, and network status detection.

**Progress**: 0/6 stories completed (0%)

**Dependencies**: EPIC 7.2 complete (Supabase security done)

---

## Story 7.3.1: vite-plugin-pwa Setup ⚪ PLANNED
**What you'll see**: Automatic service worker generation for production builds.

**What needs to be built**:
- [ ] Install vite-plugin-pwa and workbox-window
- [ ] Configure VitePWA plugin in vite.config.ts
- [ ] Set up PWA manifest with app icons
- [ ] Configure runtime caching for Supabase APIs
- [ ] Test service worker registration
- [ ] Verify offline UI caching works

**Time Estimate**: 3-4 hours

**Acceptance Criteria**:
- ✅ Service worker auto-generated on build
- ✅ Supabase API calls cached appropriately
- ✅ App works offline after first visit
- ✅ PWA manifest configured correctly

---

## Story 7.3.2: Zustand Persistence Middleware ⚪ PLANNED
**What you'll see**: App state persists across sessions and works offline.

**What needs to be built**:
- [ ] Install zustand-persist package
- [ ] Wrap authStore with persist middleware
- [ ] Configure localforage for mobile storage
- [ ] Test state persistence on web/mobile
- [ ] Implement selective persistence (only essential data)
- [ ] Document persistence strategy

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ User stays logged in after app restart
- ✅ State persists on all platforms
- ✅ Only necessary data is persisted
- ✅ Works with secure storage on mobile

---

## Story 7.3.3: Offline-First Data Store ⚪ PLANNED
**What you'll see**: Business data cached locally and syncs when online.

**What needs to be built**:
- [ ] Create offlineBusinessStore with Zustand
- [ ] Implement auto-sync with Supabase when online
- [ ] Add last sync timestamp tracking
- [ ] Test offline data access
- [ ] Implement conflict resolution strategy
- [ ] Document offline store usage

**Time Estimate**: 4-5 hours

**Acceptance Criteria**:
- ✅ Businesses load from cache when offline
- ✅ Auto-syncs with server when online
- ✅ Users see "viewing cached data" indicator
- ✅ No errors when switching online/offline

---

## Story 7.3.4: Network Status Detection ⚪ PLANNED
**What you'll see**: App knows when user is online or offline.

**What needs to be built**:
- [ ] Install @capacitor/network
- [ ] Create useNetworkStatus hook
- [ ] Listen for network status changes
- [ ] Test on web, iOS, Android
- [ ] Add network type detection (wifi/cellular)
- [ ] Document hook usage

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ Detects online/offline correctly
- ✅ Updates in real-time when network changes
- ✅ Works on all platforms
- ✅ Provides network type information

---

## Story 7.3.5: Offline Indicator UI Component ⚪ PLANNED
**What you'll see**: Banner shows when user is offline.

**What needs to be built**:
- [ ] Create OfflineIndicator component
- [ ] Use useNetworkStatus hook
- [ ] Style offline banner
- [ ] Add to Layout component
- [ ] Test appearance on all platforms
- [ ] Add animations for smooth UX

**Time Estimate**: 1-2 hours

**Acceptance Criteria**:
- ✅ Banner appears when offline
- ✅ Banner disappears when online
- ✅ Styled consistently across platforms
- ✅ Doesn't interfere with other UI

---

## Story 7.3.6: Service Worker Registration & Testing ⚪ PLANNED
**What you'll see**: Service worker properly registered and app works offline.

**What needs to be built**:
- [ ] Create serviceWorkerRegistration.ts utility
- [ ] Register service worker in main.tsx
- [ ] Handle service worker updates
- [ ] Test offline functionality end-to-end
- [ ] Add update notification when new version available
- [ ] Document offline testing procedure

**Time Estimate**: 2-3 hours

**Acceptance Criteria**:
- ✅ Service worker registers on production build
- ✅ App UI loads when offline
- ✅ Cached API data accessible offline
- ✅ Users notified of app updates
- ✅ No console errors

---

## Epic 7.3 Summary

**Total Stories**: 6 stories
**Estimated Timeline**: 2-2.5 weeks (14-20 hours)

**Deliverables**:
1. Automatic PWA service worker
2. Zustand state persistence
3. Offline-first data stores
4. Network status detection
5. Offline UI indicator
6. Complete offline functionality

**User Impact**: App works reliably without internet - users can browse cached businesses, view their data, and queue actions for later sync

**Next Epic**: EPIC 7.4 - Push Notifications Infrastructure
