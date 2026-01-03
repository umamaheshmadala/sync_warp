# Story 7.3.1: vite-plugin-pwa Setup ✅ COMPLETE

**Epic**: EPIC 7.3 - Enhanced Offline Mode with PWA  
**Story Points**: 5  
**Estimated Time**: 3-4 hours  
**Dependencies**: EPIC 7.2 complete (Supabase security done)

---

## 📋 Overview

**What**: Install and configure vite-plugin-pwa for automatic service worker generation with production-ready caching strategies.

**Why**: Modern mobile apps need offline functionality. Service workers enable the app to work without internet by caching assets and API responses. vite-plugin-pwa automates this process using Workbox, making offline support production-ready.

**User Value**: Users can access the app even without internet connection. Previously viewed content loads instantly from cache, providing a native app-like experience.

---

## 🎯 Acceptance Criteria

- [ ] vite-plugin-pwa and workbox-window installed
- [ ] VitePWA plugin configured in vite.config.ts
- [ ] PWA manifest created with app metadata and icons
- [ ] Runtime caching configured for Supabase API calls
- [ ] Service worker registered and working in production build
- [ ] App loads offline after first visit
- [ ] Icons generated for all platforms (192x192, 512x512)
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Install vite-plugin-pwa

**Terminal Commands**:
```powershell
# Install vite-plugin-pwa and workbox-window
npm install -D vite-plugin-pwa
npm install workbox-window

# Verify installation
npm list vite-plugin-pwa workbox-window
```

**Expected Output**:
```
sync-app@0.0.0
├── vite-plugin-pwa@0.20.5
└── workbox-window@7.3.0
```

**Acceptance**: ✅ Packages installed

---

### Step 2: Configure vite-plugin-pwa

**File to Edit**: `vite.config.ts`

**Add VitePWA configuration**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'SynC - Connect, Collaborate, Create',
        short_name: 'SynC',
        description: 'Discover local businesses, connect with your community',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache Supabase API calls
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in dev for easier debugging
      }
    })
  ]
})
```

**Save the file.**

**Acceptance**: ✅ VitePWA configured

---

### Step 3: Create PWA Icons

**Create icons folder**: `public/`

**Required Icons**:
- `pwa-192x192.png` - 192x192px
- `pwa-512x512.png` - 512x512px
- `apple-touch-icon.png` - 180x180px
- `favicon.ico` - 32x32px

**Option 1 - Use existing logo**:
```powershell
# If you have a logo, use an online tool to generate PWA icons:
# https://www.pwabuilder.com/imageGenerator
# Upload your logo and download the generated icons
```

**Option 2 - Create placeholder icons**:
Create simple colored squares with your app name for now.

**Place icons in**: `public/` folder

**Acceptance**: ✅ Icons created and placed

---

### Step 4: Test Service Worker in Production Build

**Build the app**:
```powershell
npm run build
```

**Expected Output**:
```
vite v5.x building for production...
✓ built in 12.34s
PWA v0.20.5
mode      generateSW
precache  123 entries (1234.56 kB)
✓ Service worker generated
```

**Preview production build**:
```powershell
npm run preview
```

**Test in Browser**:
1. Open http://localhost:4173
2. Open DevTools → Application → Service Workers
3. Verify service worker registered
4. Check "Offline" checkbox in Network tab
5. Reload page - should still work

**Acceptance**: ✅ Service worker working

---

### Step 5: Verify Runtime Caching

**Test Supabase API Caching**:
1. Open app and log in
2. Browse businesses (triggers API calls)
3. Open DevTools → Application → Cache Storage
4. Verify "supabase-api-cache" exists
5. Check cached responses are present

**Test Offline Mode**:
1. Enable offline mode in DevTools
2. Reload page
3. Previously viewed businesses should load from cache
4. Network indicator should show "offline"

**Acceptance**: ✅ Runtime caching working

---

### Step 6: Add manifest.json Generation

The plugin auto-generates manifest.json, but verify:

**Check generated manifest**:
```powershell
# After build, check dist folder
ls dist/manifest.webmanifest
```

**Verify manifest content**:
```json
{
  "name": "SynC - Connect, Collaborate, Create",
  "short_name": "SynC",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [...]
}
```

**Acceptance**: ✅ Manifest generated

---

### Step 7: Test on Mobile

**Android Test**:
```powershell
npm run build
npx cap sync android
npm run mobile:android
```

**Verify**:
1. App installs from APK
2. Service worker registers
3. Go offline (airplane mode)
4. App still works with cached data

**iOS Test** (Mac only):
```bash
npm run build
npx cap sync ios
npm run mobile:ios
```

**Acceptance**: ✅ Works on mobile

---

### Step 8: Create Documentation

**Create new file**: `docs/PWA_SETUP.md`

```markdown
# PWA Setup and Offline Mode 📱

## Overview

The app uses vite-plugin-pwa for automatic service worker generation and offline support.

---

## Features

- **Automatic Service Worker**: Generated on every build
- **Asset Caching**: All static files cached
- **API Caching**: Supabase responses cached (NetworkFirst)
- **Image Caching**: Images cached (CacheFirst)
- **Offline Support**: App works without internet

---

## Configuration

Located in `vite.config.ts`:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      // Supabase API caching
      // Image caching
    ]
  }
})
```

---

## Caching Strategies

### NetworkFirst (Supabase API)
- Tries network first
- Falls back to cache if offline
- Updates cache with network response
- Cache expires after 24 hours

### CacheFirst (Images)
- Serves from cache if available
- Only fetches if not cached
- Cache expires after 30 days

---

## Testing Offline Mode

### Development
Service worker disabled in dev for easier debugging.

### Production
1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open DevTools → Application → Service Workers
4. Enable offline mode and test

---

## Updating Service Worker

Service worker auto-updates when new version is deployed.
Users will get the update on next app launch.

---

## Icons

Required icons in `public/`:
- `pwa-192x192.png` - Android
- `pwa-512x512.png` - Android, splash
- `apple-touch-icon.png` - iOS
- `favicon.ico` - Web

---

## Troubleshooting

### Service Worker not registering
- Check production build: `npm run build`
- Service worker only works in production
- Check console for errors

### Offline mode not working
- Verify cache in DevTools → Application → Cache Storage
- Check Network tab shows cached responses
- Clear cache and retry: DevTools → Application → Clear Storage

### Updates not appearing
- Service worker updates on page refresh
- Clear cache if needed
- Check console for SW update logs

---

## Related

- **Story 7.3.6**: Service Worker Registration
- **Story 7.3.5**: Offline Indicator UI
```

**Save as**: `docs/PWA_SETUP.md`

**Acceptance**: ✅ Documentation created

---

### Step 9: Commit PWA Setup

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Configure vite-plugin-pwa for offline support - Story 7.3.1

- Installed vite-plugin-pwa and workbox-window
- Configured VitePWA plugin in vite.config.ts
- Added PWA manifest with app metadata
- Configured runtime caching for Supabase API (NetworkFirst)
- Configured image caching (CacheFirst)
- Created PWA icons (192x192, 512x512, apple-touch-icon)
- Tested service worker in production build
- Verified offline mode works
- Created PWA setup documentation

Changes:
- vite.config.ts: Added VitePWA plugin configuration
- public/: Added PWA icons
- docs/PWA_SETUP.md: PWA documentation
- package.json: Added vite-plugin-pwa dependency

Epic: 7.3 - Enhanced Offline Mode with PWA
Story: 7.3.1 - vite-plugin-pwa Setup

Features:
- Automatic service worker generation
- Production-ready offline support
- Smart API caching strategies
- PWA manifest for installability"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] vite-plugin-pwa installed
- [ ] workbox-window installed
- [ ] VitePWA configured in vite.config.ts
- [ ] PWA manifest configured
- [ ] Runtime caching for Supabase API
- [ ] Image caching configured
- [ ] PWA icons created (192x192, 512x512)
- [ ] Service worker registers in production
- [ ] App works offline after first visit
- [ ] Cache Storage shows cached responses
- [ ] Tested on mobile devices
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.3.1 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Service worker not generated
**Solution**: 
- Check vite.config.ts syntax
- Ensure production build: `npm run build`
- Service workers only work in production mode

### Issue: Offline mode not working
**Solution**:
- Check DevTools → Application → Service Workers
- Verify service worker is "activated"
- Check Cache Storage has entries
- Try clearing cache and rebuilding

### Issue: Supabase API not caching
**Solution**:
- Check URL pattern in runtime caching config
- Verify Supabase URL matches pattern
- Check Network tab shows "from ServiceWorker"
- Increase cache expiration if needed

### Issue: Icons not showing
**Solution**:
- Verify icons exist in `public/` folder
- Check icon sizes are correct (192x192, 512x512)
- Clear browser cache
- Rebuild and test

---

## 📚 Additional Notes

### What We Built
- ✅ Automatic service worker generation
- ✅ PWA manifest for installability
- ✅ Smart caching strategies
- ✅ Offline support

### Caching Strategy Details
- **Static Assets**: Precached on install
- **Supabase API**: NetworkFirst (online-first, offline fallback)
- **Images**: CacheFirst (cache-first, network fallback)
- **HTML/JS/CSS**: Precached and updated on new builds

### What's Next
- **Story 7.3.2**: Zustand Persistence (state management)
- **Story 7.3.3**: Offline-First Data Store
- **Story 7.3.4**: Network Status Detection

---

## 🔗 Related Documentation

- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developer.chrome.com/docs/workbox/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [EPIC 7.3 Overview](../epics/EPIC_7.3_Offline_Mode_PWA.md)

---

**Story Status**: ✅ COMPLETE  
**Next Story**: [STORY_7.3.2_Zustand_Persistence.md](./STORY_7.3.2_Zustand_Persistence.md)  
**Epic Progress**: Story 1/6 complete (17%)
