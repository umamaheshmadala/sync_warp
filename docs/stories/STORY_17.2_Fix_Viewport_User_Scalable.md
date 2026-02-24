# STORY 17.2 — Fix Viewport: Remove `user-scalable=no` and `maximum-scale=1.0`

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 7.3  

---

## 🎯 Goal

Remove the `user-scalable=no` and `maximum-scale=1.0` restrictions from the viewport meta tag to comply with **WCAG 2.1 Level AA** (Success Criterion 1.4.4 — Resize Text). Users with low vision rely on pinch-to-zoom to read content. Blocking zoom is a hard accessibility violation that will fail any automated or manual WCAG audit.

---

## 📍 Current State (What Exists)

[index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) — Line 6:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**Problems:**
1. `user-scalable=no` — prevents pinch-to-zoom entirely (WCAG violation)
2. `maximum-scale=1.0` — caps zoom at 1× even if `user-scalable` were allowed

**`viewport-fit=cover`** is correct and should be kept — it enables the `env(safe-area-inset-*)` CSS values for notched devices (used throughout `index.css`).

---

## 🔧 Implementation Details

### Step 1: Update the viewport meta tag

**File:** [index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) — Line 6

```diff
-<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
+<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

This removes both `maximum-scale=1.0` and `user-scalable=no` while keeping:
- `width=device-width` — responsive layout
- `initial-scale=1.0` — default zoom level
- `viewport-fit=cover` — safe area insets for notched devices

### Step 2: Prevent iOS Safari auto-zoom on input focus (optional CSS)

With `maximum-scale` removed, iOS Safari will auto-zoom on input fields with `font-size < 16px`. The app already uses `font-size: 16px` as the base (line 89 of `index.css`), but some inputs might use smaller text.

Add a global CSS rule to prevent auto-zoom on inputs without blocking manual pinch-to-zoom:

**File:** [index.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/index.css) — Add after the base font rules:

```css
/* Prevent iOS Safari auto-zoom on input focus (Story 17.2)
   Set minimum 16px on inputs so iOS doesn't zoom when focusing.
   This does NOT prevent manual pinch-to-zoom (WCAG compliant). */
@supports (-webkit-touch-callout: none) {
  input, select, textarea {
    font-size: max(16px, 1em);
  }
}
```

This only applies to iOS (`-webkit-touch-callout` is iOS-only) and only sets the minimum font size to 16px — it does not block user-initiated zoom.

---

## 🧪 Verification

### Pinch-to-Zoom Test
1. Open the app on a mobile device or Chrome mobile emulator
2. Pinch to zoom in → **Expected:** Content zooms in smoothly
3. Pinch to zoom out → **Expected:** Content zooms back to normal
4. **Before fix:** Pinch zoom is completely blocked

### Input Focus Test (iOS Safari)
1. Open the app in iOS Safari
2. Tap on a text input field (e.g., search bar, message composer)
3. **Expected:** Page does NOT auto-zoom when the input gets focus
4. Manual pinch-to-zoom still works

### WCAG Audit
1. Run Lighthouse → Accessibility
2. Check for `[user-scalable="no"]` violation → **Expected:** No longer flagged
3. **Before fix:** Lighthouse flags "user-scalable=no" as an accessibility issue

---

## ✅ Acceptance Criteria

- [ ] `user-scalable=no` removed from viewport meta tag
- [ ] `maximum-scale=1.0` removed from viewport meta tag
- [ ] `viewport-fit=cover` retained for safe area insets
- [ ] Pinch-to-zoom works on mobile web
- [ ] iOS Safari does NOT auto-zoom on input focus (16px minimum enforced)
- [ ] Lighthouse Accessibility score does not flag viewport zoom blocking
- [ ] Safe area insets (`env(safe-area-inset-*)`) still work correctly

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [index.html](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/index.html) | MODIFY — line 6: remove `user-scalable=no` and `maximum-scale=1.0` |
| [index.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/index.css) | MODIFY — add iOS 16px minimum input font-size |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| iOS auto-zoom on small input text | CSS rule `font-size: max(16px, 1em)` on inputs prevents this without blocking manual zoom |
| Double-tap unintentional zoom | This only affects users who intentionally double-tap; not a UX regression. Most modern mobile apps allow zoom. |
