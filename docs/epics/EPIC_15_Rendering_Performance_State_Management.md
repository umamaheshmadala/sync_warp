# 🔄 EPIC 15: Rendering Performance & State Management

**Status:** 📋 Planning  
**Created:** 2026-02-21  
**Owner:** Frontend Engineering / Architecture  
**Audit Reference:** [Codebase Audit Report — Categories 1, 3 (partial), 5 (partial)](../../.gemini/antigravity/brain/4990934d-85a5-413b-9a20-e2901b49f1fe/codebase_audit_report.md)  
**Dependencies:** EPIC 13 (animation removal reduces re-render surface)  
**Priority:** 🔴 Critical  
**Estimated Effort:** 18–25 story points

---

## 🎯 Epic Goal

Eliminate cascading re-renders across the entire application by fixing Zustand over-subscription patterns (89+ files), applying `React.memo` to heavy components, consolidating the dual data-source architecture (React Query + Zustand) into React Query as single server-state source, and wiring up list virtualization for large data sets.

### Core Objectives:
1. **Fix Zustand over-subscription** in 89+ files using `useAuthStore()`
2. **Fix `useMessagingStore()` over-subscription** in 15+ files
3. **Wire up or replace dead `VirtualProductGrid`** and apply virtualization to top 4 lists
4. **Add `React.memo` to `MessageBubble.tsx`** (1,164 lines, re-renders on every state change)
5. **Convert `messagingStore` Map → Record** to restore Zustand reactivity
6. **Extract `useUnreadCount()` hook** to replace Header fetching all conversations
7. **Migrate to React Query as single server-state source** (eliminate Zustand for server data)

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Components re-rendering on auth change | ≤5 | 89+ |
| Components re-rendering on typing indicator | ≤3 | 15+ |
| `MessageBubble` re-renders per new message | 1 (own only) | All bubbles |
| Lists using virtualization | 4 | 0 (dead code) |
| Server-state data sources | 1 (React Query) | 2 (RQ + Zustand) |
| Header badge query scope | 1 aggregated count | All conversations fetched |

---

## 📋 Audit Findings Covered

| Finding | Description | Severity |
|---------|-------------|----------|
| 1.1 | Zustand over-subscription — `useAuthStore()` in 89+ files | 🔴 Critical |
| 1.2 | `useMessagingStore()` over-subscription — 15+ files | 🔴 Critical |
| 1.3 | `react-window` installed but unused; dead `VirtualProductGrid.tsx` | 🟠 High |
| 3.2 | `MessageBubble.tsx` — 1,164 lines, no memo, re-renders all | 🔴 Critical |
| 3.3 | `messagingStore` uses Map (bypasses Zustand reactivity) | 🔴 Critical |
| 3.4 | `Header.tsx` fetches ALL conversations just for badge count | 🔴 Critical |
| 5.9 | Dual data source (React Query + Zustand) for server state | 🟠 High |

---

## 📊 Stories Breakdown

| # | Story | Priority | Estimate | Dependencies |
|---|-------|----------|----------|--------------|
| 15.1 | Add Zustand selectors to all 89+ `useAuthStore()` call sites | 🔴 Critical | 5 pts | None |
| 15.2 | Add Zustand selectors to all 15+ `useMessagingStore()` call sites | 🔴 Critical | 3 pts | None |
| 15.3 | Split `MessageBubble.tsx` (1,164 lines) and wrap with `React.memo` | 🔴 Critical | 5 pts | 15.2 |
| 15.4 | Convert `messagingStore` message maps from `Map<>` to `Record<>` | 🔴 Critical | 2 pts | 15.2 |
| 15.5 | Extract `useUnreadCount()` hook; refactor `Header.tsx` badge logic | 🔴 Critical | 2 pts | 15.1 |
| 15.6 | Apply list virtualization to top 4 lists; wire up or replace `VirtualProductGrid` | 🟠 High | 3 pts | None |
| 15.7 | Migrate server-state from Zustand → React Query single source | 🟠 High | 5 pts | 15.1, 15.2, 15.4 |

### 📌 Recommended Execution Order

1. **15.1 + 15.2** (parallel) — Zustand selector fixes. Highest re-render reduction.
2. **15.4** — Map→Record conversion. Restores reactivity for messaging.
3. **15.3** — Split + memo MessageBubble. Requires stable messaging state from 15.2/15.4.
4. **15.5** — Header badge optimization. Quick win after auth store is fixed.
5. **15.6** — Virtualization. Independent, can run anytime after 15.1.
6. **15.7** — React Query migration. Largest scope, depends on all selectors being fixed first.

---

## 🔑 Key Files

| File | Action |
|------|--------|
| 89+ files using `useAuthStore()` | MODIFY — add selectors |
| 15+ files using `useMessagingStore()` | MODIFY — add selectors |
| `src/components/messaging/MessageBubble.tsx` | MODIFY — split into sub-components + `React.memo` |
| `src/stores/messagingStore.ts` | MODIFY — Map → Record |
| `src/components/Header.tsx` | MODIFY — use `useUnreadCount()` hook |
| `src/components/VirtualProductGrid.tsx` | MODIFY or DELETE — wire up or replace |
| Multiple store files | MODIFY — remove server-state, delegate to React Query |

---

## 🧪 Verification Strategy

- **React DevTools Profiler:** Before/after re-render count comparison on auth state change
- **React DevTools Profiler:** Before/after re-render count on typing indicator
- **Chrome Performance:** Main thread blocked time before/after MessageBubble memo
- **Scroll test:** Virtualized lists with 1,000+ items — verify no frame drops
- **Data flow audit:** Confirm no Zustand store holds server-fetched data post-migration

---

## ✅ Definition of Done

- [ ] All 89+ `useAuthStore()` calls use granular selectors
- [ ] All 15+ `useMessagingStore()` calls use granular selectors
- [ ] `MessageBubble.tsx` split into ≤3 sub-components, each wrapped in `React.memo`
- [x] `messagingStore` uses `Record<string, Message>` instead of `Map`
- [ ] `Header.tsx` uses `useUnreadCount()` — no longer fetches all conversations
- [ ] Top 4 lists use `react-window` virtualization
- [ ] Dead `VirtualProductGrid.tsx` either wired up or removed
- [x] React Query is the single source for all server-fetched data
- [x] Zustand stores only hold local/UI state (no server data)
