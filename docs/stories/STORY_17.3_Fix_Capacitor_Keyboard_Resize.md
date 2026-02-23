# STORY 17.3 — Change Capacitor Keyboard.resize to 'ionic' & Fix Broken Comment

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 7.4, 7.11  

---

## 🎯 Goal

Fix two issues in `capacitor.config.ts`:
1. **Keyboard.resize: 'none'** — On mobile, when the soft keyboard opens, the input field gets hidden behind it because the app doesn't resize. Change to `'ionic'` so the WebView resizes to accommodate the keyboard.
2. **Broken comment syntax** — A multi-line comment block (lines 29-36) has mismatched `/*` and `*/`, which could cause parsing issues on some TypeScript configurations.

---

## 📍 Current State (What Exists)

[capacitor.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/capacitor.config.ts):

### Problem 1: Keyboard resize — Line 66

```typescript
plugins: {
  Keyboard: {
    resize: 'none',         // ← PROBLEM: input hidden behind keyboard
    resizeOnFullScreen: true,
  },
```

With `resize: 'none'`, the WebView height stays constant when the keyboard opens. If the user taps an input near the bottom of the screen, the keyboard covers it completely. The `'ionic'` mode shrinks the WebView to fit above the keyboard, scrolling the focused input into view.

### Problem 2: Broken comment — Lines 29-36

```typescript
/*                              // ← Opening comment
if (isDevelopment) {
  return {
    ...baseConfig,
    hostname: 'localhost',
    cleartext: true,
  };
  */                            // ← Closing comment — but missing the closing } and if-block
```

The `/*` on line 29 opens a block comment, but the `*/` on line 36 doesn't match the expected structure. The `if (isDevelopment)` block is never properly closed. This works because it's inside a comment, but it's confusing and could lead to bugs if someone tries to uncomment it.

---

## 🔧 Implementation Details

### Step 1: Change Keyboard.resize to 'ionic'

**File:** [capacitor.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/capacitor.config.ts) — Line 66

```diff
 Keyboard: {
-  resize: 'none',
+  resize: 'ionic',
   resizeOnFullScreen: true,
 },
```

**Why `'ionic'` and not `'body'` or `'native'`?**
- `'ionic'` — Adjusts the WebView's `innerHeight` and dispatches a resize event, compatible with CSS viewport units. Best for web-first apps.
- `'body'` — Resizes the `<body>` element, which can cause layout shift in sticky/fixed elements.
- `'native'` — Uses the OS's native resize behavior, which varies between Android and iOS.

`'ionic'` is the recommended setting for hybrid apps using web frameworks like React.

### Step 2: Fix the broken comment block

**File:** [capacitor.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/capacitor.config.ts) — Lines 29-36

```diff
-  /*
-  if (isDevelopment) {
-    return {
-      ...baseConfig,
-      hostname: 'localhost',
-      cleartext: true, // Allow HTTP in development
-    };
-    */
+  // Development server config (currently disabled — using local bundle)
+  // if (isDevelopment) {
+  //   return {
+  //     ...baseConfig,
+  //     hostname: 'localhost',
+  //     cleartext: true, // Allow HTTP in development
+  //   };
+  // }
```

Converting to single-line comments (`//`) makes the intent clear and prevents mismatched block comments.

---

## 🧪 Verification

### Keyboard Test (requires physical device or emulator)
1. Build with Capacitor: `npx cap sync && npx cap open android` (or iOS)
2. Navigate to the messaging screen
3. Tap on the message input at the bottom of the screen
4. **Before fix:** Keyboard covers the input — user can't see what they're typing
5. **After fix:** WebView resizes, input stays visible above the keyboard

### Alternative: Web Browser Test
1. Open Chrome DevTools → Toggle device toolbar → Select a phone
2. Focus on a bottom-positioned input
3. The resize behavior is emulated in mobile mode

### Comment Syntax Verification
1. Run `npx tsc --noEmit` to check for TypeScript errors
2. **Expected:** No parsing errors related to `capacitor.config.ts`
3. Open the file in VS Code → no red squiggly lines

---

## ✅ Acceptance Criteria

- [ ] `Keyboard.resize` changed from `'none'` to `'ionic'`
- [ ] Keyboard does not hide input fields on mobile (verified on device/emulator)
- [ ] Broken block comment replaced with clean single-line comments
- [ ] `npx tsc --noEmit` passes without errors on `capacitor.config.ts`
- [ ] No regression in Capacitor build (`npx cap sync` succeeds)

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [capacitor.config.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/capacitor.config.ts) | MODIFY — line 66: `'none'` → `'ionic'`; lines 29-36: fix comment syntax |
