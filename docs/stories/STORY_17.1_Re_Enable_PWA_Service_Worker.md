# STORY 17.1 — Re-enable VitePWA with Minimal Precache Strategy

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 3 story points  
**Dependencies:** EPIC 13 (framer-motion removal must be complete)  
**Audit Findings:** 7.2  

---

## 🎯 Goal

Re-enable the Service Worker and PWA support so that the app shell (HTML, CSS, core JS) is precached and loads instantly on repeat visits — even when offline. Currently, VitePWA is imported in `vite.config.ts` but the plugin call is commented out, meaning no Service Worker is registered and the app has zero offline capability.

---

## 📍 Current State (What Exists)

### VitePWA import exists, but plugin is commented out

[vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) — Lines 3 and 53:

```typescript
// Line 3 — VitePWA is already imported ✅
import { VitePWA } from 'vite-plugin-pwa'

// Line 50-54 — plugins array
plugins: [
  react(),
  buildInfoPlugin(),
  // VitePWA({...})     // ← COMMENTED OUT — no Service Worker
],
```

### PWA meta tags already exist in index.html ✅

[index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) — Lines 8-25:

```html
<!-- Line 9 -->  <meta name="mobile-web-app-capable" content="yes" />
<!-- Line 10 --> <meta name="apple-mobile-web-app-capable" content="yes" />
<!-- Line 11 --> <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<!-- Line 12 --> <meta name="apple-mobile-web-app-title" content="Sync App" />
<!-- Line 15 --> <meta name="theme-color" content="#6366f1" />
```

These meta tags are correct and ready for a PWA — they just need a Service Worker to activate.

### No manifest.json detected

No `manifest.json` or `site.webmanifest` file exists in the `public/` directory. VitePWA can auto-generate this from the plugin config.

### `vite-plugin-pwa` is already installed ✅

The package is imported in `vite.config.ts`, which means it's already in `node_modules`. Verify in `package.json`:

```bash
grep "vite-plugin-pwa" package.json
```

---

## 🔧 Implementation Details

### Step 1: Uncomment and configure VitePWA plugin

**File:** [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts)

Replace the commented-out line 53 with a full VitePWA configuration:

```typescript
plugins: [
  react(),
  buildInfoPlugin(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['logo.svg', 'favicon.ico'],
    workbox: {
      // Only precache the app shell — not dynamic API data
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      // Don't precache chunks larger than 500KB
      maximumFileSizeToCacheInBytes: 500 * 1024,
      // Runtime caching for API responses
      runtimeCaching: [
        {
          // Cache Supabase Storage images for 1 year
          urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'supabase-media',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          // Cache wsrv.nl proxy images
          urlPattern: /^https:\/\/wsrv\.nl\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'wsrv-media',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24 * 365
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          // Network-first for API calls (Supabase REST)
          urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 5 // 5 minutes
            },
            networkTimeoutSeconds: 10
          }
        },
        {
          // Cache Google Fonts
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365
            }
          }
        }
      ]
    },
    manifest: {
      name: 'SynC - Connect, Collaborate, Create',
      short_name: 'SynC',
      description: 'Connect with local businesses, discover offers, and collaborate with your community',
      theme_color: '#6366f1',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
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
    }
  })
],
```

### Step 2: Generate PWA icons

Generate the required icon sizes and place them in `public/`:

- `public/pwa-192x192.png` — 192×192 app icon
- `public/pwa-512x512.png` — 512×512 app icon

If the existing `logo.svg` is a vector, convert it to PNG at both sizes. Alternatively, use a tool like `pwa-asset-generator` or create them manually.

### Step 3: Verify the auto-generated manifest

After building (`npm run build`), check that `dist/manifest.webmanifest` is generated and includes the correct values. VitePWA auto-generates this from the `manifest` config.

### Step 4: Set Capacitor mode exclusion

For Capacitor (native) builds, the Service Worker should NOT be registered — native apps don't use PWA. The `registerType: 'autoUpdate'` handles web-only registration automatically, but verify:

```typescript
// vite.config.ts — VitePWA is only included in web builds
// The mode === 'capacitor' check in base config already handles this
```

If needed, conditionally exclude VitePWA for Capacitor:
```typescript
plugins: [
  react(),
  buildInfoPlugin(),
  ...(mode !== 'capacitor' ? [VitePWA({ ... })] : [])
],
```

---

## 🧪 Verification

### Service Worker Registration
1. Build the app: `npm run build`
2. Serve locally: `npx serve dist`
3. Open Chrome DevTools → Application → Service Workers
4. **Expected:** Service Worker is active and running
5. **Before fix:** No Service Worker registered

### Offline Mode
1. With the Service Worker active, go to DevTools → Network → Offline checkbox
2. Refresh the page
3. **Expected:** App shell loads (header, navigation, basic UI)
4. **Before fix:** App shows browser offline error

### Lighthouse PWA Audit
1. Run Lighthouse → PWA category
2. **Expected:** PWA score ≥90 (installable, has manifest, has Service Worker)
3. **Before fix:** PWA score 0

### Cache Verification
1. Open DevTools → Application → Cache Storage
2. **Expected:** Multiple caches: `workbox-precache`, `supabase-media`, `google-fonts`
3. Verify precached files are app shell only (not API data)

---

## ✅ Acceptance Criteria

- [x] `VitePWA` plugin uncommented and configured with workbox precache strategy
- [x] Service Worker registered and active (verified in DevTools → Application)
- [x] App shell loads offline (header, navigation without data)
- [x] `manifest.webmanifest` generated with correct app name, icons, and theme color
- [x] PWA icon files exist at `public/pwa-192x192.png` and `public/pwa-512x512.png`
- [x] Supabase Storage images runtime-cached via `CacheFirst`
- [x] API calls use `NetworkFirst` strategy (no stale data on live connections)
- [x] Capacitor builds do NOT include Service Worker
- [x] Lighthouse PWA score ≥90
- [x] No increase in main bundle size (Service Worker is a separate file)

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [vite.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/vite.config.ts) | MODIFY — uncomment VitePWA, add full config |
| `public/pwa-192x192.png` | **NEW** — PWA icon 192×192 |
| `public/pwa-512x512.png` | **NEW** — PWA icon 512×512 |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Stale cache after deploy | `registerType: 'autoUpdate'` auto-updates the Service Worker when new files are detected |
| Large precache size | `maximumFileSizeToCacheInBytes: 500KB` caps individual file caching; `globPatterns` limits to static assets only |
| Capacitor conflict | Conditionally exclude VitePWA for `mode === 'capacitor'` |
| EPIC 13 dependency (framer-motion) | VitePWA + framer-motion caused chunking issues. EPIC 13 must be done first. |
