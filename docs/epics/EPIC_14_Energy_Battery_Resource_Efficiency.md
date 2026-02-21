# ⚡ EPIC 14: Energy, Battery & Resource Efficiency

**Status:** 📋 Planning  
**Created:** 2026-02-21  
**Owner:** Frontend Engineering  
**Audit Reference:** [Codebase Audit Report — Category 4](../../.gemini/antigravity/brain/4990934d-85a5-413b-9a20-e2901b49f1fe/codebase_audit_report.md)  
**Dependencies:** EPIC 13 (framer-motion removal reduces GPU load first)  
**Priority:** 🔴 Critical  
**Estimated Effort:** 13–18 story points

---

## 🎯 Epic Goal

Reduce battery drain by 80% and database write volume by 75% by eliminating wasteful background processes, consolidating heartbeat systems, replacing GPU-heavy CSS filters with lightweight alternatives, and fixing memory leaks from uncleaned event listeners.

### Core Objectives:
1. **Consolidate triple presence system** into a single presence store
2. **Reduce heartbeat frequency** from 30s to 120s (4× fewer ops)
3. **Replace 50+ `backdrop-blur` filters** with solid `rgba()` on mobile
4. **Convert 22 `setInterval` calls** to `setTimeout` chains
5. **Fix memory leaks** from uncleaned event listeners
6. **Eliminate auto-import side effects** in presence service
7. **Add `will-change` CSS hints** to scrollable containers
8. **Optimize image loading** with `loading="lazy"` and `decoding="async"`
9. **Reduce polling frequencies** for campaigns and progress indicators

---

## ✅ Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| DB writes/min (presence) | ≤2 | 6 (triple presence) |
| Network ops/min (heartbeat) | ≤1 | 8 (quad heartbeat) |
| GPU composite layers | ≤5 | 50+ (backdrop-blur) |
| `setInterval` count | 0 | 22 |
| Memory leak listeners | 0 | Multiple uncleaned |
| Battery drain/hour (mobile) | <2% | ~8% |

---

## 📋 Audit Findings Covered

| Finding | Description | Severity |
|---------|-------------|----------|
| 4.1 | Triple presence system (6 DB writes/min) | 🔴 Critical |
| 4.2 | Quad heartbeat (8 network ops/min) | 🔴 Critical |
| 4.3 | 50+ `backdrop-blur` GPU filters | 🔴 Critical |
| 4.4 | 22 `setInterval` calls across services | 🔴 Critical |
| 4.5 | Memory leaks — uncleaned event listeners | 🔴 Critical |
| 4.6 | `presenceService` auto-starts on import | 🔴 Critical |
| 4.7 | Zero `will-change` CSS on scrollers | 🟠 High |
| 4.8 | `GlassCard` default blur always active | 🟠 High |
| 4.9 | Few `loading="lazy"` images, no `decoding="async"` | 🟠 High |
| 4.10 | Campaign polling every 30s | 🟠 High |
| 4.11 | `ProfileCompletion` 50ms `setInterval` | 🟠 High |

---

## 📊 Stories Breakdown

| # | Story | Priority | Estimate | Dependencies |
|---|-------|----------|----------|--------------|
| 14.1 | Consolidate triple presence → single `presenceStore` | 🔴 Critical | 3 pts | None |
| 14.2 | Consolidate quad heartbeat → single 120s heartbeat; skip on mobile background | 🔴 Critical | 2 pts | 14.1 |
| 14.3 | Replace `backdrop-blur` → solid `rgba()` on mobile; keep blur on desktop | 🔴 Critical | 3 pts | None |
| 14.4 | Convert all 22 `setInterval` → `setTimeout` chains with cleanup | 🔴 Critical | 3 pts | None |
| 14.5 | Audit and fix all uncleaned event listeners (store refs + cleanup) | 🔴 Critical | 2 pts | None |
| 14.6 | Remove `presenceService` auto-start on import; explicit start on sign-in | 🔴 Critical | 1 pt | 14.1 |
| 14.7 | Add `will-change: transform` to scroll containers; default `GlassCard` blur to none | 🟠 High | 1 pt | 14.3 |
| 14.8 | Add `loading="lazy"` + `decoding="async"` to all `<img>` tags | 🟠 High | 1 pt | None |
| 14.9 | Reduce campaign poll 30s → 5min; `ProfileCompletion` 50ms interval → CSS transition | 🟠 High | 1 pt | 14.4 |

### 📌 Recommended Execution Order

1. **14.1 + 14.6** — Presence consolidation (highest DB write reduction)
2. **14.2** — Heartbeat consolidation (depends on presence being unified)
3. **14.3 + 14.7** (parallel) — GPU filter cleanup
4. **14.4 + 14.9** (parallel) — Timer cleanup sweep
5. **14.5** — Memory leak fix (independent audit)
6. **14.8** — Image loading optimization (quick win)

---

## 🔑 Key Files

| File | Action |
|------|--------|
| `src/services/presenceService.ts` | MODIFY — remove auto-start, consolidate |
| `src/stores/presenceStore.ts` | MODIFY — single source of presence truth |
| `src/services/networkService.ts` | MODIFY — heartbeat interval 30s → 120s |
| 50+ component CSS files | MODIFY — `backdrop-blur` → `rgba()` |
| `src/components/ui/GlassCard.tsx` | MODIFY — default blur to `none` |
| 22 service/store files | MODIFY — `setInterval` → `setTimeout` |
| All `<img>` usage files | MODIFY — add lazy + async attributes |
| `src/services/campaignService.ts` | MODIFY — poll interval 30s → 5min |
| `src/components/ProfileCompletion.tsx` | MODIFY — interval → CSS transition |

---

## 🧪 Verification Strategy

- **Network tab:** Verify ≤1 heartbeat per 120s
- **Supabase logs:** Verify ≤2 presence DB writes/min
- **Chrome Layers panel:** Verify ≤5 composite layers on mobile viewport
- **Performance profiler:** Confirm zero `setInterval` in flame chart
- **Memory snapshot:** Before/after heap comparison — no growing listeners
- **Mobile battery test:** 1-hour background test on iOS + Android

---

## ✅ Definition of Done

- [ ] Single presence system active; legacy presence code removed
- [ ] Heartbeat consolidated to 120s across all services
- [ ] Zero `backdrop-blur` on mobile; desktop blur preserved
- [ ] All 22 `setInterval` replaced with `setTimeout` + cleanup
- [ ] No uncleaned event listeners in Chrome DevTools memory snapshot
- [ ] `presenceService` only starts on explicit sign-in call
- [ ] `will-change` applied to all scroll containers
- [ ] All images have `loading="lazy"` and `decoding="async"`
- [ ] Campaign polling at 5min; ProfileCompletion uses CSS transition
- [ ] Battery drain <2%/hour on mobile in background
