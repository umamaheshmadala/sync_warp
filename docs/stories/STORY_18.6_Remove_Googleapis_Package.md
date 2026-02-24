# STORY 18.6 — Remove `googleapis` Package from Client Bundle

**Epic:** [EPIC 18 — Native Mobile Feel & Production Hardening](../epics/EPIC_18_Native_Mobile_Feel_Production_Hardening.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 3 story points  
**Dependencies:** STORY 18.7 (Cloudflare Worker proxy must be operational first)  
**Audit Findings:** 5.6  

---

## 🎯 Goal

Remove the `googleapis` npm package (~170KB) from the client bundle. It's installed but **never imported** in any source file — it's pure dead weight in `node_modules` and `package.json`. The app uses the **Google Maps JavaScript SDK** via `@react-google-maps/api` (script tag injection), not the `googleapis` npm package.

Additionally, move the Google Safe Browsing API call from the client (`LinkValidationService.ts`) to the Cloudflare Worker proxy (Story 18.7) so the API key is never exposed in client code.

---

## 📍 Current State (What Exists)

### `googleapis` is installed but NEVER imported

`package.json` line 127:
```json
"googleapis": "^171.4.0",
```

Codebase search results: **Zero imports** of `googleapis` in any `.ts` or `.tsx` file under `src/`. The package exists in `node_modules` and `package.json` but is completely unused.

### How Google APIs are actually used:

| Google API | How It's Called | File | API Key Exposure |
|------------|----------------|------|-----------------|
| Places Autocomplete | Google Maps JS SDK (`google.maps.places`) | `businessSearchService.ts` | `VITE_GOOGLE_MAPS_API_KEY` in script tag |
| Places Details | Google Maps JS SDK (`google.maps.places`) | `businessSearchService.ts` | Same — via script tag |
| Google Maps Embed | `@react-google-maps/api` React component | `BusinessProfile.tsx` line 873 | `VITE_GOOGLE_MAPS_API_KEY` inline |
| Safe Browsing v4 | Direct `fetch()` to REST API | `LinkValidationService.ts` line 156 | `VITE_GOOGLE_SAFE_BROWSING_KEY` in URL |

### Google Maps script loaded via `@react-google-maps/api`

The `@react-google-maps/api` package loads the Google Maps JavaScript SDK via a `<script>` tag at runtime. This is a separate mechanism from the `googleapis` npm package (which is a Node.js server-side library).

Files using `@react-google-maps/api`:
- `BusinessSearchInput.tsx` line 31 — `googleMapsApiKey` prop
- `Step0_SmartSearch.tsx` line 51 — `googleMapsApiKey` prop
- `BusinessProfile.tsx` line 875 — `apiKey` prop
- `TargetingEditor.tsx` line 358 — `apiKey` prop

These are client-side script inclusions (not npm imports) — they load the JS SDK from Google's CDN.

### Safe Browsing API key exposed in client

[LinkValidationService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/LinkValidationService.ts) — Lines 148-156:

```typescript
const apiKey = import.meta.env.VITE_GOOGLE_SAFE_BROWSING_KEY
// ...
const response = await fetch(
  `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
```

The Safe Browsing API key is embedded in the client URL and visible in Network tab. This should be moved server-side (Story 18.7).

---

## 🔧 Implementation Details

### Step 1: Remove `googleapis` from package.json

```bash
npm uninstall googleapis
```

This removes the package from `node_modules` and `package.json`. Since it's never imported, there will be zero code breakage.

### Step 2: Verify no imports break

```bash
# Should return zero results
grep -rn "from 'googleapis'" src/
grep -rn "require('googleapis')" src/
```

### Step 3: Move Safe Browsing API call to Cloudflare Worker proxy

**After Story 18.7** (proxy is operational), update `LinkValidationService.ts` to call the proxy instead of the Google API directly:

**File:** [LinkValidationService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/LinkValidationService.ts) — Lines 147-178:

```diff
   private async checkSafeBrowsing(url: string): Promise<boolean> {
     // ...cache check...

     try {
-      const apiKey = import.meta.env.VITE_GOOGLE_SAFE_BROWSING_KEY
-      if (!apiKey) {
-        return true
-      }
-
-      const response = await fetch(
-        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
-        {
-          method: 'POST',
-          headers: { 'Content-Type': 'application/json' },
-          body: JSON.stringify({
-            client: {
-              clientId: 'sync-app',
-              clientVersion: '1.0.0'
-            },
-            threatInfo: {
-              threatTypes: [
-                'MALWARE',
-                'SOCIAL_ENGINEERING',
-                'UNWANTED_SOFTWARE',
-                'POTENTIALLY_HARMFUL_APPLICATION'
-              ],
-              platformTypes: ['ANY_PLATFORM'],
-              threatEntryTypes: ['URL'],
-              threatEntries: [{ url }]
-            }
-          })
-        }
-      )
+      // Route through proxy to keep API key server-side (Story 18.7)
+      const proxyUrl = import.meta.env.VITE_API_PROXY_URL || '/api'
+      const response = await fetch(`${proxyUrl}/safe-browsing`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ url })
+      })

       if (!response.ok) {
         throw new Error(`Safe Browsing API Error: ${response.statusText}`)
       }
```

### Step 4: Remove `VITE_GOOGLE_SAFE_BROWSING_KEY` from `.env`

After the proxy migration, the client no longer needs this key:

```diff
 # .env
-VITE_GOOGLE_SAFE_BROWSING_KEY=your_key_here
```

The key moves to the Cloudflare Worker environment variables (Story 18.7).

---

## 🧪 Verification

### Package Removal
1. Run `npm uninstall googleapis`
2. Run `npm run build` — **Expected:** Build succeeds without errors
3. Check `node_modules` — `googleapis` folder does not exist
4. Check `package.json` — no `googleapis` entry

### Bundle Size Reduction
1. Note bundle size before: `ls -la dist/assets/`
2. Remove googleapis, rebuild
3. **Expected:** No change (it was never imported, but removing it from node_modules prevents any accidental future inclusion)

### Safe Browsing Proxy Test (after Story 18.7)
1. Open DevTools → Network
2. Send a message with a URL
3. **Before fix:** Request to `safebrowsing.googleapis.com` with `?key=...` visible
4. **After fix:** Request to `/api/safe-browsing` — no API key in URL

### API Key Scan
1. Search the production bundle for exposed keys:
   ```bash
   grep -r "SAFE_BROWSING" dist/assets/
   ```
2. **Expected:** Zero results (key moved server-side)

---

## ✅ Acceptance Criteria

- [ ] `googleapis` removed from `package.json` and `node_modules`
- [ ] Build succeeds with zero errors after removal
- [ ] No `googleapis` string in production bundle (verified via grep on dist/)
- [ ] Safe Browsing API call routed through proxy (no API key in client Network tab)
- [ ] `VITE_GOOGLE_SAFE_BROWSING_KEY` removed from `.env` / client code
- [ ] Safe Browsing URL check still works via proxy
- [ ] `@react-google-maps/api` unchanged (uses script tag, not npm googleapis)

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| `package.json` | MODIFY — remove `googleapis` dependency via `npm uninstall` |
| [LinkValidationService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/LinkValidationService.ts) | MODIFY — route Safe Browsing call through proxy |
| `.env` / `.env.example` | MODIFY — remove `VITE_GOOGLE_SAFE_BROWSING_KEY` |
