# STORY 17.4 — Add `useTheme()` Hook with `prefers-color-scheme` Detection + Zustand Persistence

**Epic:** [EPIC 17 — FAANG UX, Accessibility & Build Config](../epics/EPIC_17_FAANG_UX_Accessibility_Build_Config.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 3 story points  
**Dependencies:** None  
**Audit Findings:** 7.5  

---

## 🎯 Goal

Add automatic dark mode detection using the CSS `prefers-color-scheme` media query, with a Zustand store for persistence and a `useTheme()` hook for component access. Users should see the app match their OS theme preference automatically on first visit, with the ability to override manually (light / dark / system).

---

## 📍 Current State (What Exists)

### Partial dark mode CSS exists in 6 files ✅

Several CSS files already include `@media (prefers-color-scheme: dark)` rules:

| File | Line |
|------|------|
| [OfflineIndicator.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/ui/OfflineIndicator.css) | 83 |
| [OfflineBanner.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/ui/OfflineBanner.css) | 159 |
| [SyncStatusIndicator.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/ui/SyncStatusIndicator.css) | 118 |
| [PushNotificationPrompt.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/PushNotificationPrompt.css) | 89 |
| [ChatScreen.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/messaging/ChatScreen.css) | 169 |
| [ConversationListPage.css](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/components/messaging/ConversationListPage.css) | 142 |

These rules are scattered and only apply to individual components. There is **no centralized dark mode system** that toggles a class on `<html>` or `<body>`.

### No `useTheme` hook or `themeStore` exists

- `grep -r "useTheme" src/` → No results
- `grep -r "themeStore" src/` → No results
- No dark mode toggle in any settings UI

### Tailwind already supports dark mode via class strategy

The app uses Tailwind CSS (`@tailwind base/components/utilities` in `index.css` line 1-3). Tailwind's `darkMode: 'class'` strategy allows toggling dark mode by adding `class="dark"` to the `<html>` element. This is the recommended approach for apps with manual override capability.

### `index.html` has a `theme-color` meta tag ✅

```html
<meta name="theme-color" content="#6366f1" />
```

This should dynamically update when switching themes.

---

## 🔧 Implementation Details

### Step 1: Create `themeStore.ts` — persisted Zustand store

**File:** `src/store/themeStore.ts` — **NEW**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;             // User's preference: light, dark, or system
  resolvedTheme: 'light' | 'dark'; // Actual applied theme
  setMode: (mode: ThemeMode) => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',            // Default: follow OS preference
      resolvedTheme: 'light',    // Default until system detection runs
      setMode: (mode) => set({ mode }),
      setResolvedTheme: (theme) => set({ resolvedTheme: theme }),
    }),
    {
      name: 'sync-theme',       // localStorage key
      partialize: (state) => ({ mode: state.mode }), // Only persist mode, not resolvedTheme
    }
  )
);
```

### Step 2: Create `useTheme.ts` — hook with `matchMedia` listener

**File:** `src/hooks/useTheme.ts` — **NEW**

```typescript
import { useEffect, useCallback } from 'react';
import { useThemeStore, ThemeMode } from '../store/themeStore';

export function useTheme() {
  const { mode, resolvedTheme, setMode, setResolvedTheme } = useThemeStore();

  // Apply theme to DOM
  const applyTheme = useCallback((theme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update theme-color meta tag for mobile browser chrome
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1f2937' : '#6366f1');
    }

    setResolvedTheme(theme);
  }, [setResolvedTheme]);

  // Resolve system theme
  const resolveSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Listen for OS theme changes
  useEffect(() => {
    if (mode === 'system') {
      applyTheme(resolveSystemTheme());

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(mode);
    }
  }, [mode, applyTheme, resolveSystemTheme]);

  return {
    mode,                      // 'light' | 'dark' | 'system'
    resolvedTheme,             // 'light' | 'dark' (actual applied theme)
    isDark: resolvedTheme === 'dark',
    setMode,                   // Set preference
    toggleTheme: () => {
      const newMode: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
      setMode(newMode);
    },
  };
}
```

### Step 3: Initialize theme on app startup

**File:** `src/App.tsx` or `src/main.tsx`

Call `useTheme()` in the root component to initialize the theme listener on mount:

```typescript
import { useTheme } from './hooks/useTheme';

function App() {
  useTheme(); // Initialize theme detection on mount
  // ... rest of app
}
```

### Step 4: Update `tailwind.config.js` for class-based dark mode

**File:** `tailwind.config.js` (or `tailwind.config.ts`)

```diff
 module.exports = {
+  darkMode: 'class',
   content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
   // ...
 }
```

This tells Tailwind to generate `dark:` variant classes that activate when `<html class="dark">` is set.

### Step 5: Add dark mode toggle to Settings page (optional — can be a follow-up)

Create a simple 3-option selector (Light / Dark / System) in the user's Settings page. This is optional for v1 — the `system` default provides correct behavior automatically.

---

## 🧪 Verification

### System Detection Test
1. Set OS to dark mode (Windows: Settings → Personalization → Colors → Dark)
2. Open the app
3. **Expected:** App renders in dark mode (dark backgrounds, light text)
4. Set OS to light mode → **Expected:** App switches to light mode

### Manual Override Test
1. Open DevTools console
2. Run: `useThemeStore.getState().setMode('dark')` → App switches to dark
3. Run: `useThemeStore.getState().setMode('light')` → App switches to light
4. Run: `useThemeStore.getState().setMode('system')` → App follows OS

### Persistence Test
1. Set mode to 'dark' manually
2. Refresh the page
3. **Expected:** App starts in dark mode (persisted to localStorage)
4. Clear localStorage → **Expected:** App falls back to 'system' (OS preference)

### Theme-Color Meta Tag
1. Switch to dark mode
2. Check `<meta name="theme-color">` in Elements panel
3. **Expected:** `content="#1f2937"` (dark gray)
4. Switch to light → **Expected:** `content="#6366f1"` (indigo)

---

## ✅ Acceptance Criteria

- [ ] `useThemeStore` persists theme preference to `localStorage` under key `sync-theme`
- [ ] `useTheme()` hook listens to `window.matchMedia('(prefers-color-scheme: dark)')` changes
- [ ] `<html>` element gets `class="dark"` when dark mode is active
- [ ] Tailwind `darkMode: 'class'` configured
- [ ] Theme-color meta tag updates dynamically
- [ ] OS dark mode → app dark mode (automatic, no user action needed)
- [ ] Manual override persists across page refreshes
- [ ] Existing `prefers-color-scheme: dark` CSS rules in 6 files continue to work (they operate independently of the class-based system, so no conflict)
- [ ] No flash of wrong theme on page load (resolved theme applied before first paint)

---

## 📁 Files to Create / Modify

| File | Action |
|------|--------|
| `src/store/themeStore.ts` | **NEW** — Zustand store with `mode` and `resolvedTheme` |
| `src/hooks/useTheme.ts` | **NEW** — Hook with `matchMedia` listener and DOM class toggle |
| `src/App.tsx` or `src/main.tsx` | MODIFY — call `useTheme()` on mount |
| `tailwind.config.js` | MODIFY — add `darkMode: 'class'` |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Flash of unstyled/wrong theme on load | Initialize theme in a `<script>` tag in `index.html` before React mounts, reading from localStorage. This prevents the flash. |
| Existing CSS `prefers-color-scheme` rules conflict | These rules are additive and will continue to work alongside the class-based system. They don't need removal — they provide graceful degradation. |
| Tailwind dark variants not yet used in components | This story establishes the infrastructure. Individual components can be updated to use `dark:` classes incrementally in follow-up work. |
| Not all components styled for dark mode | The `useTheme` hook and store are ready — dark mode support is progressive. Core layout (body background, text color) should be handled first. |
