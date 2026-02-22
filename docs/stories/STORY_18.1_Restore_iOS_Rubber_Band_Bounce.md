# STORY 18.1 — Restore iOS Rubber-Band Bounce

**Epic:** [EPIC 18 — Native Mobile Feel & Production Hardening](../epics/EPIC_18_Native_Mobile_Feel_Production_Hardening.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 6.1  

---

## 🎯 Goal

Restore the native iOS rubber-band bounce (elastic overscroll) by removing `overscroll-behavior-y: none` from `#root`. This CSS rule was added to prevent pull-to-refresh on the app shell, but it also kills the native bounce effect that iOS users expect. The fix scopes the overscroll prevention more narrowly so that scrollable content bounces naturally while pull-to-refresh is still prevented on the app shell.

---

## 📍 Current State (What Exists)

### `overscroll-behavior-y: none` on `#root`

[index.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/index.css) — Lines 188-196:

```css
/* Ensure scrolling works properly */
body,
#root {
  min-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: none;
  /* Prevent pull-to-refresh on app shell — Story 8.12.1 AC#7 */
}
```

### Prior fix removed it from `html` correctly

[index.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/index.css) — Lines 21-26 (comment):

```css
html {
  /* overscroll-behavior-y: removed from html — Story 8.12.1 AC#7
     Native rubber-band bounce must be preserved for nested scroll containers (chat list).
     Pull-to-refresh prevention is scoped to #root instead. */
}
```

The comment acknowledges the intent to preserve rubber-band bounce for nested scroll containers, but `overscroll-behavior-y: none` on `#root` still kills bounce globally because `#root` is the scroll container for the entire app.

### `ConversationListPage.css` has scoped `overscroll-behavior: contain`

[ConversationListPage.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/messaging/ConversationListPage.css) — Line 26:

```css
overscroll-behavior: contain;
```

This correctly prevents the conversation list from bubbling scroll to the parent, but the `#root` rule overrides it for the whole app.

---

## 🔧 Implementation Details

### Step 1: Remove `overscroll-behavior-y: none` from #root

**File:** [index.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/index.css) — Lines 188-196

```diff
 /* Ensure scrolling works properly */
 body,
 #root {
   min-height: 100vh;
   overflow-y: auto;
   overflow-x: hidden;
-  overscroll-behavior-y: none;
-  /* Prevent pull-to-refresh on app shell — Story 8.12.1 AC#7 */
 }
```

### Step 2: Scope pull-to-refresh prevention to native platforms via Capacitor class

The Capacitor runtime adds the `native-platform` class to the body. Use this to prevent pull-to-refresh ONLY on native apps where pull-to-refresh is handled by the native container, not by the browser:

```css
/* Prevent pull-to-refresh ONLY on native Capacitor apps (Story 18.1)
   Web users get the native browser pull-to-refresh behavior.
   Native apps handle refresh via their own mechanisms. */
.native-platform #root {
  overscroll-behavior-y: none;
}
```

This ensures:
- **iOS Safari / Android Chrome (web):** Rubber-band bounce works ✅
- **Capacitor iOS / Android (native):** Pull-to-refresh prevented (native refresh mechanisms used instead) ✅

### Step 3: Update the comment at lines 21-26

[index.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/index.css) — Lines 21-26:

```diff
 html {
-  /* overscroll-behavior-y: removed from html — Story 8.12.1 AC#7
-     Native rubber-band bounce must be preserved for nested scroll containers (chat list).
-     Pull-to-refresh prevention is scoped to #root instead. */
+  /* overscroll-behavior-y: removed — Story 8.12.1 AC#7, Story 18.1
+     Pull-to-refresh prevention is now scoped to .native-platform #root only. */
 }
```

---

## 🧪 Verification

### iOS Rubber-Band Bounce
1. Open the app in iOS Safari or Chrome iOS
2. Scroll to the very top of any page, then pull down further
3. **Before fix:** Content stops hard at the top (no bounce)
4. **After fix:** Content bounces back elastically (native iOS feel)

### Android Overscroll Glow
1. Open the app in Chrome Android
2. Scroll to the top, pull down
3. **Expected:** Standard Android overscroll glow effect visible

### Pull-to-Refresh Prevention (Native)
1. Build with Capacitor: `npx cap sync && npx cap open ios`
2. On the native iOS app, scroll to top and pull down
3. **Expected:** No browser-style pull-to-refresh (native behavior preserved)

### Conversation List Scroll Containment
1. Open the messaging conversation list
2. Scroll to the bottom of the list, continue scrolling
3. **Expected:** Scroll does NOT propagate to the page behind (contained by `overscroll-behavior: contain` in `ConversationListPage.css` line 26)

---

## ✅ Acceptance Criteria

- [ ] `overscroll-behavior-y: none` removed from the `body, #root` rule
- [ ] iOS rubber-band bounce restored on web
- [ ] Pull-to-refresh still prevented on native Capacitor apps (`.native-platform` guard)
- [ ] Conversation list scroll containment unchanged
- [ ] No regression in Android overscroll behavior

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [index.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/index.css) | MODIFY — remove `overscroll-behavior-y: none` from `body, #root`; add `.native-platform #root` scoped rule; update comment |
