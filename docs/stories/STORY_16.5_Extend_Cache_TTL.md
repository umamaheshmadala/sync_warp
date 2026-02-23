# STORY 16.5 — Extend Media cacheControl from 3600 → 31536000 (1 Year)

**Epic:** [EPIC 16 — Messaging Speed & Realtime Optimization](../epics/EPIC_16_Messaging_Speed_Realtime_Optimization.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 5.8  

---

## 🎯 Goal

Extend the `cacheControl` value on all Supabase Storage uploads from `'3600'` (1 hour) to `'31536000'` (1 year). This dramatically reduces bandwidth consumption because browsers re-download media files every hour with the current setting. Chat images, profile avatars, product photos, and offer images are rarely modified after upload, making them ideal candidates for long-lived caches.

---

## 📍 Current State (What Exists)

### All 10 occurrences of `cacheControl: '3600'`

Every Supabase Storage upload in the codebase uses the same 1-hour cache TTL:

| # | File | Line | Context |
|---|------|------|---------|
| 1 | [mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts) | 226 | Chat image upload |
| 2 | [mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts) | 251 | Chat video upload |
| 3 | [mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts) | 541 | Voice message upload |
| 4 | [mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts) | 566 | Document upload |
| 5 | [productService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/productService.ts) | 28 | Product image upload |
| 6 | [offlineMediaService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/offlineMediaService.ts) | 276 | Offline media sync upload |
| 7 | [profileStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/profileStorageService.ts) | 59 | Profile avatar upload |
| 8 | [messageStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/messageStorageService.ts) | 152 | Message attachment upload |
| 9 | [AvatarUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/profile/AvatarUpload.tsx) | 137 | Avatar upload component |
| 10 | [ImageUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/offers/ImageUpload.tsx) | 45 | Offer image upload |

### Why 1 year is safe

Supabase Storage URLs include the file path (which includes the user ID and a unique filename). If a user re-uploads a profile picture, the file path changes (new UUID filename), so the old cached URL is never served for the new image. This is the same pattern used by AWS S3, Cloudflare R2, and all major CDNs for immutable assets.

### Existing cache-busting via URL

The app already uses `wsrv.nl` as an image CDN proxy (confirmed in audit as ✅ strength). URLs include query parameters for transformations. A changed image gets a new URL, invalidating the cache naturally.

---

## 🔧 Implementation Details

### Step 1: Global find-and-replace

Replace all 10 occurrences:

```diff
-cacheControl: '3600',
+cacheControl: '31536000',
```

This is a simple text replacement across all files listed above.

### Step 2: Consider extracting a constant (optional but recommended)

To prevent future drift, define a shared constant:

**File:** `src/lib/constants.ts` (or whatever constants file exists)

```typescript
/** 1 year in seconds — used for Supabase Storage cacheControl */
export const STORAGE_CACHE_TTL = '31536000';
```

Then replace all hardcoded values:

```diff
+import { STORAGE_CACHE_TTL } from '../lib/constants';

-cacheControl: '3600',
+cacheControl: STORAGE_CACHE_TTL,
```

This ensures all future uploads use the same value.

---

## 🧪 Verification

### Response Header Check
1. Upload an image (e.g., profile avatar or chat image)
2. Copy the Supabase Storage URL from the `src` attribute
3. Fetch the URL directly in a new tab
4. Open DevTools → Network → check the response headers
5. **Expected:** `Cache-Control: max-age=31536000` (or `public, max-age=31536000`)
6. **Before fix:** `Cache-Control: max-age=3600`

### Bandwidth Impact
1. Open a conversation with images
2. Navigate away and back
3. **Before fix:** Images re-download from the server (304 or 200) after 1 hour
4. **After fix:** Images serve from disk cache for up to 1 year

### Functional Tests
1. Upload a profile avatar → displays correctly
2. Upload a chat image → displays correctly
3. Upload a product photo → displays correctly
4. Re-upload a new avatar → new image appears (old cache entry irrelevant because URL changed)

---

## ✅ Acceptance Criteria

- [ ] All 10 `cacheControl: '3600'` occurrences replaced with `'31536000'`
- [ ] Response headers on newly uploaded files show `max-age=31536000`
- [ ] Re-uploaded files display the new version (URL changes ensure cache busting)
- [ ] No visual regressions in image/video display
- [ ] Optional: `STORAGE_CACHE_TTL` constant defined and used across all files

---

## 📁 Files to Modify

| File | Lines | Action |
|------|-------|--------|
| [mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts) | 226, 251, 541, 566 | MODIFY — `'3600'` → `'31536000'` |
| [productService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/productService.ts) | 28 | MODIFY |
| [offlineMediaService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/offlineMediaService.ts) | 276 | MODIFY |
| [profileStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/profileStorageService.ts) | 59 | MODIFY |
| [messageStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/messageStorageService.ts) | 152 | MODIFY |
| [AvatarUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/profile/AvatarUpload.tsx) | 137 | MODIFY |
| [ImageUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/offers/ImageUpload.tsx) | 45 | MODIFY |
| `src/lib/constants.ts` (optional) | — | MODIFY — add `STORAGE_CACHE_TTL` constant |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Stale images if file is overwritten at the same path | Supabase Storage uses unique file paths. Overwriting the same path is rare and intentional. If needed, add a `?v=timestamp` query parameter to the URL. |
| Users may see old images in their browser cache despite re-upload | URL changes on re-upload (new UUID filename) ensure the new image is fetched. No risk. |
| Existing uploaded images still have 1-hour cache | This change only affects **new uploads**. Existing files retain their original `cacheControl`. Supabase does not support retroactive header changes without re-uploading. This is acceptable. |

---

## 📊 Bandwidth Impact Estimate

| Scenario | Before (1hr cache) | After (1yr cache) |
|----------|--------------------|--------------------|
| User views same chat 5 times/day | 5 image downloads | 1 download + 4 cache hits |
| 1,000 users, avg 10 images/day | ~10,000 downloads/day | ~1,000 downloads/day |
| Monthly bandwidth saved | — | ~90% reduction on media |
