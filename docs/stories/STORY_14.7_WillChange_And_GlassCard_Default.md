# STORY 14.7 — Add `will-change` to Scroll Containers; Default `GlassCard` Blur to None

**EPIC:** [EPIC 14 — Energy, Battery & Resource Efficiency](../epics/EPIC_14_Energy_Battery_Resource_Efficiency.md)  
**Status:** ✅ COMPLETE
**Priority:** 🟠 High  
**Estimate:** 1 point  
**Dependencies:** Story 14.3 (blur cleanup first)  
**Audit Findings:** 4.7 — Zero `will-change` CSS on scrollers; 4.8 — GlassCard default blur always active

---

## 🎯 User Story

> As a mobile user, I want scroll containers to be GPU-accelerated so that scrolling is always smooth and jank-free.

---

## 📍 Problem

### `will-change: transform`
The CSS property `will-change: transform` tells the browser to promote an element to its own GPU compositing layer **before** scrolling begins, avoiding the jank of just-in-time promotion. Currently, zero scroll containers in the app use this hint.

### `GlassCard` Default Blur
`GlassCard.tsx` defaults to `blur='md'` (line 16), meaning **every GlassCard instance** applies `backdrop-blur-md` unless the caller explicitly passes `blur='none'`. Most callers don't override it. Story 14.3 handles the global mobile override, but the component default should also change to `'none'` so future usage is blur-free by default.

---

## 🔍 Codebase Research

### Key Scroll Containers to Target
1. **Message list** — `ChatScreen.tsx` contains the message list scroll area (the most scrolled container in the app)
2. **Conversation list** — The main messaging page with list of chats
3. **Product grid** — `BusinessProductsTab.tsx` or product listing pages
4. **Feed/Home** — Main home page scrollable content
5. **Search results** — `SearchPage.tsx` scroll area

### `GlassCard.tsx` (58 lines)
```typescript
export default function GlassCard({
  blur = 'md',  // ← Default is 'md' (always blur)
  ...
}) {
```

---

## ✅ Implementation Plan

### Step 1: Add `will-change` in `src/index.css`

Add a utility class and apply it to common scrollable patterns:
```css
/* ============================================
   EPIC 14 — Story 14.7: GPU-accelerate scroll containers
   Hint the browser to pre-promote these to composite layers
   ============================================ */
.will-change-scroll {
  will-change: transform;
  -webkit-overflow-scrolling: touch;
}
```

### Step 2: Apply to key scroll containers

Add `className="will-change-scroll"` (or append to existing className) on the main scrollable `<div>` in:
1. `ChatScreen.tsx` — the message list wrapper
2. Main conversation list scroll container
3. Product grid scroll container
4. Home/Feed page scroll container
5. Any other container with `overflow-y: auto` or `overflow-y: scroll`

**How to find them:**
```bash
grep -rn "overflow-y" src/ --include="*.tsx" --include="*.css"
grep -rn "overflow-auto" src/ --include="*.tsx"
grep -rn "overflow-y-auto" src/ --include="*.tsx"
```

### Step 3: Change `GlassCard` default blur to `'none'`

In `src/components/ui/GlassCard.tsx`, line 16:
```diff
-  blur = 'md',
+  blur = 'none' as const,
```

And add a `'none'` case to the switch:
```diff
  const getBlurClass = () => {
    switch (blur) {
+     case 'none': return '';
      case 'sm': return 'backdrop-blur-sm';
      case 'md': return 'backdrop-blur-md';
      case 'lg': return 'backdrop-blur-lg';
      case 'xl': return 'backdrop-blur-xl';
-     default: return 'backdrop-blur-md';
+     default: return '';
    }
  };
```

Update the TypeScript type:
```diff
-  blur?: 'sm' | 'md' | 'lg' | 'xl';
+  blur?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
```

This ensures callers who want blur must **opt in** explicitly (e.g., `<GlassCard blur="md">`).

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Chrome DevTools → Layers panel | Scroll containers show as promoted layers |
| Scroll message list on mobile | Smooth 60fps scrolling |
| `GlassCard` without blur prop | No blur applied by default |
| `GlassCard blur="md"` on desktop | Blur still works when explicitly set |
| `npm run build` | Build succeeds |

---

## ✅ Acceptance Criteria

- [ ] `will-change: transform` applied to all primary scroll containers
- [ ] `-webkit-overflow-scrolling: touch` applied for iOS momentum scrolling
- [ ] `GlassCard` default blur changed from `'md'` to `'none'`
- [ ] `GlassCard` TypeScript type includes `'none'` option
- [ ] No visual regression on desktop where blur is explicitly used
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] CSS utility class added
- [ ] Applied to scroll containers
- [ ] GlassCard default changed
- [ ] Build passes
