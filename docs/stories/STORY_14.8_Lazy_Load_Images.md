# STORY 14.8 — Add `loading="lazy"` + `decoding="async"` to All `<img>` Tags

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** ✅ COMPLETE
**Priority:** 🟠 High  
**Estimate:** 1 point  
**Dependencies:** None  
**Audit Finding:** 4.9 — Few `loading="lazy"` images, no `decoding="async"`

---

## 🎯 User Story

> As a mobile user on a limited data plan, I want images to only load when they scroll into view so that initial page load is faster and data usage is minimized.

---

## 📍 Problem

- **`loading="lazy"`** defers offscreen image loading until the user scrolls near them. Without it, the browser fetches ALL images on the page at once, blocking the main thread and wasting bandwidth.
- **`decoding="async"`** tells the browser to decode the image off the main thread, preventing jank during scroll.

Most `<img>` tags in the codebase lack both attributes.

---

## 🔍 Codebase Research — Finding All `<img>` Tags

### Search Strategy
```bash
grep -rn "<img " src/ --include="*.tsx" --include="*.jsx"
grep -rn 'src={' src/ --include="*.tsx" | grep -i 'img'
```

### Key Image Components
The codebase likely has images in these patterns:

1. **Direct `<img>` tags** — in components like `BusinessCard`, `ProductCard`, `AvatarUpload`, `MessageBubble` (for image messages), etc.
2. **Wrapper components** — if there is `OptimizedImage.tsx`, `SafeImage.tsx`, or similar. Check:
   ```bash
   grep -rn "OptimizedImage\|SafeImage\|LazyImage\|ImageComponent" src/ --include="*.tsx"
   ```
3. **Avatar components** — profile pictures, usually small and may need `loading="eager"` since they're always visible.
4. **Background images** — set via `style={{ backgroundImage: ... }}` — not applicable for these attributes.

### Important Exception: Above-the-fold images
Images that are immediately visible on page load (hero images, the user's own avatar in the header) should keep `loading="eager"` (the default) to avoid blank spaces on initial render. Only add `loading="lazy"` to images below the fold.

---

## ✅ Implementation Plan

### Option A: Centralized Image Component (Recommended)

If the codebase already has a shared image component, modify it once. If not, create one:

```typescript
// src/components/ui/AppImage.tsx
interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  eager?: boolean; // Use for above-the-fold images
}

export default function AppImage({ eager, ...props }: AppImageProps) {
  return (
    <img
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      {...props}
    />
  );
}
```

Then gradually replace direct `<img>` tags with `<AppImage>`.

### Option B: Add Attributes Directly (Faster execution)

For each `<img>` tag found via grep, add the attributes:

```diff
-<img src={imageUrl} alt={alt} className={styles} />
+<img src={imageUrl} alt={alt} className={styles} loading="lazy" decoding="async" />
```

**Exceptions (keep `loading="eager"` or omit entirely):**
- Header avatar / profile picture
- App logo
- First visible image on any page (above the fold)

### Step-by-Step
1. Run `grep -rn "<img " src/ --include="*.tsx"` to get all `<img>` tag locations
2. For each, add `loading="lazy" decoding="async"`
3. For above-the-fold images (header, first card), use `loading="eager" decoding="async"`
4. Verify all `<img>` tags have both attributes

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Browser Network tab → filter Images → scroll slowly | Images load progressively as scrolled into view |
| Lighthouse audit → Performance | Improved "Defer offscreen images" score |
| Above-the-fold images | Load immediately on page render |
| `npm run build` | Build succeeds |
| Mobile data usage on initial load | Reduced (fewer images fetched upfront) |

---

## ✅ Acceptance Criteria

- [ ] All `<img>` tags below the fold have `loading="lazy"`
- [ ] All `<img>` tags have `decoding="async"`
- [ ] Above-the-fold images explicitly use `loading="eager"` or omit the attribute
- [ ] No broken images or blank spaces in visible viewport
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] All `<img>` tags updated
- [ ] Network tab confirms lazy loading
- [ ] Build passes
