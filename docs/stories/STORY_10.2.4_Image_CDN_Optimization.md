# 📖 STORY 10.2.4: Image CDN Optimization

**Epic:** [Epic 10.2: Local-First Architecture](../epics/EPIC_10.2_Local_First_Architecture.md)
**Status:** ✅ **COMPLETE**
**Completed:** 2026-01-06
**Owner:** Frontend Engineering

---

## 🎯 **Goal**

Achieve Pro-tier image optimization (resizing, WebP conversion, CDN caching) without upgrading from Supabase Free tier, eliminating UI slowdowns caused by large image payloads.

---

## 🔍 **Problem Statement**

### Root Cause Analysis
1.  **Supabase Image Transformations Require Pro Tier:** The `/storage/v1/render/image/` endpoint returns `403 Forbidden` on the free tier.
2.  **Full-Resolution Images Loaded:** Without transformation, product images (5-10MB each) were loaded directly, causing significant bandwidth usage and UI jank.
3.  **Missing Placeholder UX:** Users saw spinning loaders or blank spaces while images loaded, hurting perceived performance.

### User Impact
*   **Slow Scrolling:** Large images caused visible stuttering on product grids.
*   **High Data Usage:** Mobile users experienced excessive data consumption.
*   **Poor First Impression:** Initial page loads felt sluggish.

---

## 💡 **Solution: Dedicated Image CDN Proxy**

Based on industry research (Instagram, Facebook, Pinterest), we implemented **Option 1: Dedicated Image CDN** using `wsrv.nl`.

### What is wsrv.nl?
*   An **open-source image CDN/proxy** powered by Cloudflare's global edge network.
*   Performs **on-the-fly image transformations** (resize, format conversion, quality adjustment).
*   **Zero cost, zero setup** — just construct a URL.

### How It Works
```
Old Flow (Failed):
App → Supabase /render/image/ → 403 Forbidden

New Flow (Success):
App → wsrv.nl Proxy → Supabase Storage (Original) → Optimized WebP Image
```

The `getOptimizedImageUrl` utility function now constructs URLs like:
```
https://wsrv.nl/?url=<supabase_url>&w=300&fit=contain&q=75&output=webp
```

---

## 📁 **Files Modified**

### 1. `src/utils/imageUtils.ts`
**Change:** Complete rewrite to use `wsrv.nl` proxy.
```typescript
export const getOptimizedImageUrl = (
    url: string | undefined, 
    width: number = 400,
    format: 'origin' | 'webp' = 'webp'
): string => {
    // ... validation ...
    if (url.includes('supabase.co') && url.includes('/storage/v1/object/public')) {
        const baseUrl = 'https://wsrv.nl/';
        const params = new URLSearchParams({
            url: url,
            w: width.toString(),
            fit: 'contain',
            q: '75',
            output: 'webp'
        });
        return `${baseUrl}?${params.toString()}`;
    }
    return url;
};
```

### 2. `src/components/products/ProductCard.tsx`
**Change:** Added blur placeholder and smooth loading transition.
*   Replaced spinner with gradient placeholder (`bg-gradient-to-br`).
*   Image transitions from `blur-sm opacity-0` to `blur-0 opacity-100`.

### 3. `src/components/business/ProductCard.tsx`
**Change:** Same blur placeholder effect applied.
*   Added `imageLoading` state.
*   Integrated `getOptimizedImageUrl` for 300px thumbnails.

---

## ✅ **Verification**

### Browser Testing
| Test | Result |
| :--- | :--- |
| Dashboard images load via `wsrv.nl` | ✅ Pass |
| Business page product images load | ✅ Pass |
| No 403 Forbidden errors | ✅ Pass |
| Images are WebP format | ✅ Pass |
| Image dimensions are ~300-400px | ✅ Pass |
| Blur-to-sharp transition visible | ✅ Pass |

### Performance Impact
| Metric | Before | After |
| :--- | :--- | :--- |
| **Avg Image Size** | 2-5 MB | 20-50 KB |
| **Image Format** | JPEG/PNG (original) | WebP (optimized) |
| **CDN Caching** | None | Cloudflare Global |
| **Perceived Load Time** | Spinner + delay | Instant blur + fade-in |

---

## 📚 **Research References**

The solution was informed by the following industry patterns:

| Platform | Technique Used |
| :--- | :--- |
| **Instagram** | BlurHash placeholders, progressive loading, CDN prefetching |
| **Facebook** | LQIP (inline base64 blur), `srcset`, WebP with JPEG fallback |
| **Pinterest** | Dominant color placeholders, aggressive prefetching |

### Alternative Approaches Considered
| Option | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- |
| **Cloudinary Free Tier** | Full-featured | 25GB/mo limit, account needed | Deferred |
| **Vercel + Sharp** | Full control | Serverless function overhead | Deferred |
| **Pre-generate on upload** | No runtime cost | Increased storage | Future Phase 3 |
| **wsrv.nl Proxy** | Zero cost, instant | Third-party dependency | ✅ **Selected** |

---

## 🔮 **Future Enhancements (Phase 3)**

1.  **BlurHash Integration:**
    *   Generate a 20-character hash on image upload.
    *   Store in `business_products.blur_hashes` column.
    *   Display hash instantly before network request.

2.  **`srcset` for Retina Displays:**
    *   Create `OptimizedImage` component with multiple widths (200, 400, 600, 800).
    *   Let browser choose optimal size.

3.  **Pre-generate Thumbnails on Upload:**
    *   Use Edge Function to generate 3 sizes + blur placeholder.
    *   Store all in Supabase Storage for instant access.

---

## 📝 **Acceptance Criteria**

- [x] All product images use the `getOptimizedImageUrl` utility.
- [x] Images are resized to appropriate thumbnails (300-400px).
- [x] Images are converted to WebP format.
- [x] No Supabase Pro tier required.
- [x] Blur placeholder effect provides smooth UX during load.
- [x] Browser testing confirms no 403 errors.
- [x] Documentation updated in Epic 10.
