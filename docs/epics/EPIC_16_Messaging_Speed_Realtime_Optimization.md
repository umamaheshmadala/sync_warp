# 🚀 EPIC 16: Messaging Speed & Realtime Optimization

**Status:** 📋 Planning  
**Created:** 2026-02-21  
**Owner:** Frontend Engineering / Backend Engineering  
**Audit Reference:** [Codebase Audit Report — Categories 3 (partial), 5 (partial)](../../.gemini/antigravity/brain/4990934d-85a5-413b-9a20-e2901b49f1fe/codebase_audit_report.md)  
**Dependencies:** EPIC 14 (presence consolidation reduces realtime noise), EPIC 15 (selector fixes reduce re-render cascades)  
**Priority:** 🔴 Critical  
**Estimated Effort:** 13–18 story points

---

## 🎯 Epic Goal

Achieve WhatsApp-level messaging speed by filtering realtime subscriptions, multiplexing Supabase channels, reducing prefetch parallelism, lazy-loading the chat screen, and optimizing cache/bandwidth settings to fit comfortably within the Supabase free tier (2M messages/month, 200 connections).

### Core Objectives:
1. **Filter realtime subscriptions** by `conversation_id` (eliminate firehose)
2. **Reduce parallel prefetches** from 20 to 3 at startup
3. **Lazy-load `ChatScreen`** via `React.lazy()`
4. **Multiplex Supabase channels** to fit under 200 connection cap
5. **Reduce WAL bloat** from presence writes
6. **Extend cache TTL** from 1 hour to 1 year for media
7. **Manage bandwidth** to fit under 10GB/month free tier

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Realtime messages processed/event | 1 (filtered) | All messages (firehose) |
| Startup prefetches | ≤3 | 20 |
| ChatScreen load | Lazy (on navigate) | Eager (in main bundle) |
| Supabase connections per user | ≤2 | ~4 (per-table subscriptions) |
| Monthly realtime messages (1K users) | ≤1.5M | ~3M+ (firehose) |
| Cache TTL for media | 1 year | 1 hour |
| Monthly bandwidth (1K users) | ≤5GB | ~8GB+ |

---

## 📋 Audit Findings Covered

| Finding | Description | Severity |
|---------|-------------|----------|
| 3.1 | Realtime firehose — no `conversation_id` filter on subscription | 🔴 Critical |
| 3.5 | 20 parallel prefetches at startup | 🔴 Critical |
| 3.6 | `ChatScreen` not lazy-loaded (in main bundle) | 🔴 Critical |
| 5.1 | Realtime firehose burns through 2M/month quota | 🟠 High |
| 5.2 | 200 connection cap = ~50 users pre-fix | 🟠 High |
| 5.3 | WAL bloat from frequent presence writes | 🟠 High |
| 5.4 | Bandwidth risk on chat media without long cache | 🟠 High |
| 5.8 | `cacheControl: '3600'` (1 hour) too short for media | 🟠 High |

---

## 📊 Stories Breakdown

| # | Story | Priority | Estimate | Dependencies |
|---|-------|----------|----------|--------------|
| 16.1 | Add `conversation_id` filter to realtime message subscriptions | 🔴 Critical | 3 pts | None |
| 16.2 | Multiplex Supabase realtime channels (≤2 channels per user) | 🔴 Critical | 3 pts | 16.1 |
| 16.3 | Reduce startup prefetches from 20 → 3 (defer rest to on-demand) | 🔴 Critical | 2 pts | None |
| 16.4 | Lazy-load `ChatScreen` via `React.lazy()` | 🔴 Critical | 1 pt | None |
| 16.5 | Extend media `cacheControl` from `'3600'` → `'31536000'` (1 year) | 🟠 High | 1 pt | None |
| 16.6 | Reduce WAL bloat: single presence write per interval, upsert pattern | 🟠 High | 2 pts | EPIC 14.1 |
| 16.7 | Add `Cache-Control` headers to Supabase Storage uploads for media | 🟠 High | 1 pt | 16.5 |

### 📌 Recommended Execution Order

1. **16.1** — Realtime filter. Single biggest impact on quota + CPU.
2. **16.2** — Channel multiplexing. Solves 200-connection cap.
3. **16.3 + 16.4** (parallel) — Prefetch reduction + lazy ChatScreen. Quick wins.
4. **16.5 + 16.7** (parallel) — Cache TTL extensions.
5. **16.6** — WAL bloat. Depends on EPIC 14 presence consolidation.

---

## 🔑 Key Files

| File | Action |
|------|--------|
| `src/services/realtimeService.ts` | MODIFY — add `filter` param, multiplex channels |
| `src/services/messagingService.ts` | MODIFY — filtered subscription calls |
| `src/stores/messagingStore.ts` | MODIFY — subscribe per conversation |
| `src/components/AppDataPrefetcher.tsx` | MODIFY — reduce 20 → 3 prefetches |
| `src/App.tsx` or Router config | MODIFY — `React.lazy()` for ChatScreen |
| `src/services/storageService.ts` | MODIFY — `cacheControl: '31536000'` |
| `src/stores/presenceStore.ts` | MODIFY — upsert pattern for WAL |

---

## 🧪 Verification Strategy

- **WebSocket inspector:** Verify filtered frames (only active conversation messages)
- **Network tab:** Confirm ≤3 requests during startup
- **Bundle analyzer:** Verify `ChatScreen` in separate chunk (not main)
- **Supabase Dashboard:** Monitor realtime message count over 24h — verify ≤quota
- **Connection count:** Verify ≤2 active WebSocket channels per user
- **Response headers:** Verify `Cache-Control: max-age=31536000` on media

---

## ✅ Definition of Done

- [ ] Realtime subscription filters by `conversation_id` — verified in WebSocket frames
- [ ] ≤2 Supabase realtime channels per user session
- [ ] Startup prefetches reduced to ≤3 — deferred fetches load on navigation
- [ ] `ChatScreen` chunk separated from main bundle
- [ ] Media uploads have 1-year cache TTL
- [ ] Presence upsert pattern reduces WAL writes
- [ ] Monthly realtime messages ≤1.5M at 1K users (projected)
- [ ] Monthly bandwidth ≤5GB at 1K users (projected)
