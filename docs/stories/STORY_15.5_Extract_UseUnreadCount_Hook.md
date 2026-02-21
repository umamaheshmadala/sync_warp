# STORY 15.5 — Extract `useUnreadCount()` Hook; Refactor Header Badge Logic

**EPIC:** [EPIC 15 — Rendering Performance & State Management](../epics/EPIC_15_Rendering_Performance_State_Management.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 2 points  
**Dependencies:** Story 15.1 (auth selectors must be fixed first)  
**Audit Finding:** 3.4 — `Header.tsx` fetches ALL conversations for badge count

---

## 🎯 User Story

> As a user, I want the unread message badge to update efficiently without the Header component doing excessive data fetching or processing.

---

## 📍 Problem

The audit identified that the Header fetches or subscribes to all conversation data to show a single badge count. However, our codebase research reveals the Header already uses a **proper selector** for `totalUnreadCount`:

```typescript
// Header.tsx line 103 — ALREADY optimized
const totalUnreadCount = useMessagingStore((state) => state.totalUnreadCount);
```

The remaining optimization is to **encapsulate this pattern** into a reusable `useUnreadCount()` hook so that any component needing the unread badge (Header, BottomNavigation, push notifications, etc.) uses the same optimized path — and the hook can be the single place for future enhancements like server-side count aggregation.

---

## 🔍 Codebase Research — Where Unread Count Is Used

### Current `totalUnreadCount` Consumers
```bash
grep -rn "totalUnreadCount" src/ --include="*.tsx" --include="*.ts"
```

Expected consumers:
1. `Header.tsx` (lines 103, 415, 417, 437, 439) — badge display
2. `messagingStore.ts` — internal state management
3. Potentially `BottomNavigation.tsx` or `useNavigationBadges.ts`

### How `totalUnreadCount` Is Maintained
The store already maintains `totalUnreadCount` as a derived number that:
- Increases on `incrementUnreadCount` (when a new message arrives in a non-active, non-muted conversation)
- Decreases on `clearUnreadCount` (when opening a conversation)
- Recalculates on `setConversations` (initial load)
- Excludes muted conversations ✅

This is already a well-maintained pre-computed field — no "fetch all conversations" needed.

---

## ✅ Implementation Plan

### Step 1: Create `useUnreadCount()` hook

Create `src/hooks/useUnreadCount.ts`:

```typescript
/**
 * useUnreadCount Hook
 * EPIC 15 — Story 15.5
 * 
 * Provides the total unread message count via an optimized Zustand selector.
 * Use this hook instead of accessing messagingStore directly.
 * 
 * Returns:
 * - totalUnreadCount: number (excludes muted conversations)
 * - hasUnread: boolean (convenience boolean for rendering badges)
 * - formattedCount: string (e.g., "9+" for counts > 9)
 */
import { useMessagingStore } from '../store/messagingStore';

export function useUnreadCount() {
  const totalUnreadCount = useMessagingStore(s => s.totalUnreadCount);

  return {
    totalUnreadCount,
    hasUnread: totalUnreadCount > 0,
    formattedCount: totalUnreadCount > 9 ? '9+' : String(totalUnreadCount),
  };
}
```

### Step 2: Refactor Header.tsx to use the hook

In `src/components/layout/Header.tsx`:

```diff
+import { useUnreadCount } from '../../hooks/useUnreadCount';

 export default function Header() {
-  const totalUnreadCount = useMessagingStore((state) => state.totalUnreadCount);
+  const { totalUnreadCount, hasUnread, formattedCount } = useUnreadCount();

   // In JSX (lines 415-417 and 437-439):
-  {totalUnreadCount > 0 && (
-    <span>...</span>
+  {hasUnread && (
+    <span>{formattedCount}</span>
   )}
```

### Step 3: Update any other consumers

If `BottomNavigation.tsx`, `useNavigationBadges.ts`, or other files also access `totalUnreadCount`, refactor them to use `useUnreadCount()`.

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Header badge shows correct count | Same behavior as before |
| Receive message in non-muted chat | Badge increments |
| Open conversation | Badge decrements |
| Muted conversation message | Badge does NOT increment |
| `npm run build` | Build succeeds |

---

## ✅ Acceptance Criteria

- [ ] `useUnreadCount()` hook created in `src/hooks/`
- [ ] `Header.tsx` uses `useUnreadCount()` instead of direct store access
- [ ] All other `totalUnreadCount` consumers migrated to the hook
- [ ] Badge behavior unchanged
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] Hook created
- [ ] All consumers migrated
- [ ] Badge works correctly
- [ ] Build passes
