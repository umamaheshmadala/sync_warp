# STORY 16.7 — Add Cache-Control Headers to Supabase Storage Uploads for Media

**Epic:** [EPIC 16 — Messaging Speed & Realtime Optimization](../epics/EPIC_16_Messaging_Speed_Realtime_Optimization.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** STORY 16.5 (cache TTL must be extended first)  
**Audit Findings:** 5.4  

---

## 🎯 Goal

Ensure that media files served from Supabase Storage carry proper `Cache-Control` response headers so that browsers and CDN edge nodes respect the long cache TTL set in Story 16.5. While Story 16.5 sets `cacheControl` on the **upload** side, this story verifies and ensures the **response headers** are correctly served to browsers, and adds additional optimization via `Content-Disposition` and `Content-Type` headers for media files.

---

## 📍 Current State (What Exists)

### How Supabase Storage cacheControl works

When you upload a file to Supabase Storage with `cacheControl: '31536000'`, Supabase stores this metadata and includes it in the response headers when the file is served via the public URL:

```
GET https://<project>.supabase.co/storage/v1/object/public/chat-media/images/abc123.jpg

Response Headers:
  Cache-Control: max-age=31536000
  Content-Type: image/jpeg
```

**After Story 16.5 is applied**, new uploads will have this header. However, there are additional optimizations:

### Current upload code pattern

[mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts) — typical upload call:

```typescript
const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
        cacheControl: '3600',  // Story 16.5 changes this to '31536000'
        upsert: false
    });
```

The upload options support additional fields:
- `contentType` — explicitly sets the MIME type (helpful when Supabase can't auto-detect)
- `duplex` — for streaming uploads

### Missing: Explicit `contentType` on some uploads

Some uploads rely on Supabase's auto-detection of content type. For certain file formats (e.g., `.webp`, `.webm`, `.opus`), auto-detection may fail, causing the browser to not cache or display the file correctly.

### Public URL generation

The app generates public URLs via:
```typescript
const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
```

These URLs return the file with whatever headers were set during upload. No transformation is applied at read time.

---

## 🔧 Implementation Details

### Step 1: Verify `Cache-Control` headers on newly uploaded files

After Story 16.5 is complete, verify that Supabase returns the correct header:

```bash
curl -I "https://ysxmgbblljoyebvugrfo.supabase.co/storage/v1/object/public/chat-media/images/<any-new-file>"
```

**Expected:**
```
Cache-Control: max-age=31536000
```

If this works as expected, **no additional code changes are needed for the basic cache header**.

### Step 2: Add explicit `contentType` to all media uploads

**File:** [mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts)

For image uploads (around line 226):
```diff
 const { data, error } = await supabase.storage
     .from(bucket)
     .upload(filePath, file, {
         cacheControl: '31536000',
+        contentType: file.type || 'image/jpeg',
         upsert: false
     });
```

For video uploads (around line 251):
```diff
 const { data, error } = await supabase.storage
     .from(bucket)
     .upload(filePath, file, {
         cacheControl: '31536000',
+        contentType: file.type || 'video/mp4',
         upsert: false
     });
```

For voice messages (around line 541):
```diff
 const { data, error } = await supabase.storage
     .from(bucket)
     .upload(filePath, file, {
         cacheControl: '31536000',
+        contentType: file.type || 'audio/webm',
         upsert: false
     });
```

For document uploads (around line 566):
```diff
 const { data, error } = await supabase.storage
     .from(bucket)
     .upload(filePath, file, {
         cacheControl: '31536000',
+        contentType: file.type || 'application/octet-stream',
         upsert: false
     });
```

Repeat for all other upload locations (use `file.type` as the primary source, with a sensible fallback).

### Step 3: Add `contentType` to other service uploads

**File:** [productService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/productService.ts) (line 28):
```diff
 const { data, error } = await supabase.storage
     .from(bucket)
     .upload(filePath, file, {
         cacheControl: '31536000',
+        contentType: file.type || 'image/jpeg',
         upsert: false
     });
```

**File:** [profileStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/profileStorageService.ts) (line 59):
```diff
+        contentType: file.type || 'image/jpeg',
```

**File:** [AvatarUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/profile/AvatarUpload.tsx) (line 137):
```diff
+        contentType: file.type || 'image/jpeg',
```

**File:** [ImageUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/offers/ImageUpload.tsx) (line 45):
```diff
+        contentType: file.type || 'image/jpeg',
```

**File:** [offlineMediaService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/offlineMediaService.ts) (line 276):
```diff
+        contentType: file.type || 'application/octet-stream',
```

**File:** [messageStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/messageStorageService.ts) (line 152):
```diff
+        contentType: file.type || 'application/octet-stream',
```

### Step 4: Verify wsrv.nl proxy respects upstream Cache-Control

The app uses `wsrv.nl` as an image CDN proxy. Verify that `wsrv.nl` forwards the upstream `Cache-Control` header:

```bash
curl -I "https://wsrv.nl/?url=https://ysxmgbblljoyebvugrfo.supabase.co/storage/v1/object/public/chat-media/images/<file>&w=400"
```

Expected: `wsrv.nl` returns its own `Cache-Control` header (typically `max-age=31536000` for static content). This is already the behavior of `wsrv.nl` — it caches by default.

---

## 🧪 Verification

### Header Verification
1. Upload a new image via any upload path (chat, profile, product)
2. Get the public URL
3. `curl -I <url>` and verify:
   - `Cache-Control: max-age=31536000`
   - `Content-Type: image/jpeg` (or appropriate MIME type)
4. Repeat for video, audio, and document uploads

### Browser Cache Test
1. Open a conversation with images
2. Check DevTools → Network → verify images have `(disk cache)` status on subsequent loads
3. Hard refresh (Ctrl+Shift+R) → images re-download with correct headers
4. Normal refresh (F5) → images serve from cache

### wsrv.nl Test
1. Access an image through the `wsrv.nl` proxy URL
2. Verify response headers include long-lived cache

---

## ✅ Acceptance Criteria

- [ ] All new media uploads include explicit `contentType` header
- [ ] `Cache-Control: max-age=31536000` verified on response headers for all media types
- [ ] `Content-Type` header correctly set for images (`image/jpeg`, `image/png`, `image/webp`), videos (`video/mp4`, `video/webm`), audio (`audio/webm`, `audio/ogg`), and documents
- [ ] Browser disk cache used for repeated media views (verified in DevTools Network tab)
- [ ] No regressions in media display (images, videos, voice messages, documents)
- [ ] wsrv.nl proxy returns cached content correctly

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [mediaUploadService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/mediaUploadService.ts) | MODIFY — add `contentType` to 4 upload calls |
| [productService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/productService.ts) | MODIFY — add `contentType` |
| [offlineMediaService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/offlineMediaService.ts) | MODIFY — add `contentType` |
| [profileStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/profileStorageService.ts) | MODIFY — add `contentType` |
| [messageStorageService.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/services/messageStorageService.ts) | MODIFY — add `contentType` |
| [AvatarUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/profile/AvatarUpload.tsx) | MODIFY — add `contentType` |
| [ImageUpload.tsx](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/offers/ImageUpload.tsx) | MODIFY — add `contentType` |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `file.type` might be empty for some uploads | Fallback to sensible default MIME types (`image/jpeg`, `video/mp4`, etc.) |
| Supabase may not respect `cacheControl` on all buckets | Verify in the Supabase Dashboard that Storage CDN is enabled for each bucket. Public buckets should serve with the correct headers by default. |
| Existing files not affected | Only new uploads get the new headers. Existing files retain their `max-age=3600` until re-uploaded. This is acceptable. |
